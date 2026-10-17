import type { Cart, Collector, Order, Quote } from "@/domain/models";
import { decimal, multiply, units } from "@/domain/money";
import { cartFor, transaction, type Database } from "./database";
import { ApiFault, emailValid } from "./network";
import { publish } from "./events";

export function cartView(db: Database, owner: string): Cart {
  const cart = cartFor(db, owner);
  return {
    version: cart.version,
    coupon: cart.coupon,
    items: cart.items.flatMap((item) => {
      const product = db.products.find((p) => p.id === item.nftId);
      const edition = product?.editions.find((e) => e.id === item.editionId);
      return product && edition
        ? [
            {
              ...item,
              name: product.name,
              image: product.image,
              edition: edition.label,
              price: edition.price,
              available: edition.available,
              total: multiply(edition.price, item.quantity),
              version: product.version,
            },
          ]
        : [];
    }),
  };
}
export function quoteFor(db: Database, owner: string): Quote {
  const cart = cartView(db, owner);
  if (!cart.items.length) throw new ApiFault(422, "Seu carrinho está vazio.");
  if (cart.items.some((item) => item.quantity > item.available))
    throw new ApiFault(
      409,
      "A disponibilidade mudou. Ajuste as quantidades no carrinho.",
    );
  if (cart.coupon && cart.coupon !== "KURIO10")
    throw new ApiFault(
      422,
      cart.coupon === "EXPIRED" ? "Este cupom expirou." : "Cupom inválido.",
      { coupon: "Use KURIO10 no cenário de demonstração." },
    );
  const subtotal = cart.items.reduce(
    (sum, item) => sum + units(item.total),
    0n,
  );
  const discount = cart.coupon ? subtotal / 10n : 0n,
    fee = units("0.016");
  const fingerprint = JSON.stringify({
    lines: cart.items,
    coupon: cart.coupon,
    subtotal: decimal(subtotal),
    discount: decimal(discount),
    fee: decimal(fee),
  });
  return {
    id: crypto.randomUUID(),
    lines: structuredClone(cart.items),
    coupon: cart.coupon,
    subtotal: decimal(subtotal),
    discount: decimal(discount),
    fee: decimal(fee),
    total: decimal(subtotal - discount + fee),
    expiresAt: Date.now() + 120000,
    fingerprint,
  };
}
export function validateCollector(collector: Collector) {
  const fields: Record<string, string> = {};
  if (!collector?.name?.trim()) fields.name = "Informe o nome do colecionador.";
  if (!emailValid(collector?.email || ""))
    fields.email = "Informe um e-mail válido.";
  if (!/^[+\d ()-]{8,22}$/.test(collector?.phone || ""))
    fields.phone = "Informe um telefone válido.";
  if (!collector?.country?.trim()) fields.country = "Informe o país.";
  if (!collector?.city?.trim()) fields.city = "Informe a cidade.";
  if (!/^[\w -]{3,12}$/.test(collector?.postalCode || ""))
    fields.postalCode = "Informe um CEP válido.";
  if (Object.keys(fields).length)
    throw new ApiFault(422, "Revise os dados do colecionador.", fields);
}
export function settle(db: Database, order: Order, force = false) {
  if (order.status !== "pending" || (!force && order.dueAt > Date.now()))
    return false;
  const declined = order.reason === "payment-declined";
  order.status = declined ? "declined" : "confirmed";
  order.version++;
  if (declined) {
    for (const line of order.quote.lines) {
      const product = db.products.find((p) => p.id === line.nftId)!;
      const edition = product.editions.find((e) => e.id === line.editionId)!;
      edition.available += line.quantity;
      product.available = product.editions[0].available;
      product.version++;
    }
    order.reason =
      "A carteira recusou o pagamento. Nenhum item foi removido do carrinho.";
  } else {
    const cart = cartFor(db, order.userId);
    for (const line of order.quote.lines) {
      const item = cart.items.find(
        (i) => i.nftId === line.nftId && i.editionId === line.editionId,
      );
      if (item) item.quantity = Math.max(0, item.quantity - line.quantity);
    }
    cart.items = cart.items.filter((i) => i.quantity > 0);
    cart.version++;
    if (!cart.items.length) cart.coupon = "";
    order.transaction = "0x" + order.id.replaceAll("-", "").padEnd(64, "0");
  }
  return true;
}
export function announceOrder(order: Order) {
  publish("order.updated", {
    id: order.id + ":" + order.version,
    resourceId: order.id,
    version: order.version,
    userId: order.userId,
  });
}
const timers = new Map<string, ReturnType<typeof setTimeout>>();
export function clearOrderTimers() {
  timers.forEach(clearTimeout);
  timers.clear();
}
export function scheduleOrder(order: Order) {
  if (timers.has(order.id) || order.status !== "pending") return;
  timers.set(
    order.id,
    setTimeout(
      async () => {
        const settled = await transaction((db) => {
          const current = db.orders.find((o) => o.id === order.id);
          if (!current || !settle(db, current)) return null;
          return structuredClone(current);
        });
        timers.delete(order.id);
        if (settled) announceOrder(settled);
      },
      Math.max(0, order.dueAt - Date.now()),
    ),
  );
}
