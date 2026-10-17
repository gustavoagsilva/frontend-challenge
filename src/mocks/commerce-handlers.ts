import { http, HttpResponse } from "msw";
import { cartFor, database, transaction } from "./database";
import {
  ApiFault,
  body,
  fail,
  network,
  ownerOf,
  requireUser,
  scenario,
} from "./network";
import {
  announceOrder,
  cartView,
  quoteFor,
  scheduleOrder,
  settle,
  validateCollector,
} from "./commerce";
import { publish } from "./events";
import type { CartItem, Collector, Order } from "@/domain/models";

export const commerceHandlers = [
  http.get("/api/cart", async ({ request }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      const db = await database();
      return HttpResponse.json(cartView(db, ownerOf(db, request)));
    } catch (error) {
      return fail(error);
    }
  }),
  http.put("/api/cart/items", async ({ request }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      const input = await body<CartItem & { add?: boolean }>(request);
      return await transaction((db) => {
        const owner = ownerOf(db, request),
          cart = cartFor(db, owner);
        const product = db.products.find((p) => p.id === input.nftId),
          edition = product?.editions.find((e) => e.id === input.editionId);
        if (!product || !edition)
          throw new ApiFault(404, "NFT ou edição não encontrado.");
        if (!Number.isInteger(input.quantity) || input.quantity < 0)
          throw new ApiFault(
            422,
            "A quantidade deve ser um número inteiro positivo.",
          );
        const existing = cart.items.find(
          (i) => i.nftId === input.nftId && i.editionId === input.editionId,
        );
        const quantity =
          input.quantity + (input.add ? existing?.quantity || 0 : 0);
        if (quantity > edition.available)
          throw new ApiFault(
            409,
            "Quantidade acima da disponibilidade desta edição.",
          );
        if (!quantity)
          cart.items = cart.items.filter(
            (i) =>
              !(i.nftId === input.nftId && i.editionId === input.editionId),
          );
        else if (existing) existing.quantity = quantity;
        else
          cart.items.push({
            nftId: input.nftId,
            editionId: input.editionId,
            quantity,
          });
        cart.version++;
        if (!cart.items.length) cart.coupon = "";
        return HttpResponse.json(cartView(db, owner));
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.put("/api/cart/coupon", async ({ request }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      const { coupon } = await body<{ coupon: string }>(request);
      return await transaction((db) => {
        const owner = ownerOf(db, request),
          cart = cartFor(db, owner),
          code = coupon.trim().toUpperCase();
        if (code && code !== "KURIO10")
          throw new ApiFault(
            422,
            code === "EXPIRED" ? "Este cupom expirou." : "Cupom inválido.",
            {
              coupon:
                code === "EXPIRED"
                  ? "Cupom expirado."
                  : "Código não encontrado.",
            },
          );
        cart.coupon = code;
        cart.version++;
        return HttpResponse.json(cartView(db, owner));
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.post("/api/quotes", async ({ request }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      return await transaction((db) => {
        const owner = ownerOf(db, request),
          quote = quoteFor(db, owner);
        db.quotes[quote.id] = { owner, quote };
        // Keep storage bounded without affecting quotes still valid.
        for (const [id, entry] of Object.entries(db.quotes))
          if (entry.quote.expiresAt < Date.now() - 600000) delete db.quotes[id];
        return HttpResponse.json(quote);
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.post("/api/orders", async ({ request }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      const input = await body<{
        quoteId: string;
        walletId: string;
        collector: Collector;
        connected: boolean;
      }>(request);
      const key = request.headers.get("Idempotency-Key");
      if (!key || key.length > 100)
        throw new ApiFault(422, "Chave de idempotência obrigatória.");
      const result = await transaction((db) => {
        const session = requireUser(db, request),
          owner = session.user.id,
          attemptKey = owner + ":" + key;
        const fingerprint = JSON.stringify(input),
          existing = db.attempts[attemptKey];
        if (existing) {
          if (existing.fingerprint !== fingerprint)
            throw new ApiFault(
              409,
              "Esta chave já foi usada com outro conteúdo.",
            );
          return {
            order: db.orders.find((o) => o.id === existing.orderId)!,
            created: false,
          };
        }
        validateCollector(input.collector);
        const wallet = db.wallets[owner]?.find((w) => w.id === input.walletId);
        if (!wallet)
          throw new ApiFault(422, "Selecione uma carteira cadastrada.");
        if (
          !input.connected ||
          db.connections[session.token]?.walletId !== wallet.id
        )
          throw new ApiFault(422, "Conecte a carteira antes de comprar.");
        const previous = db.quotes[input.quoteId];
        if (!previous || previous.owner !== owner)
          throw new ApiFault(
            409,
            "Cotação não encontrada. Revise o pedido novamente.",
          );
        if (scenario() === "price-changed" || scenario() === "sold-out") {
          const product = db.products.find(
            (p) => p.id === previous.quote.lines[0].nftId,
          )!;
          const edition = product.editions.find(
            (e) => e.id === previous.quote.lines[0].editionId,
          )!;
          if (scenario() === "sold-out") edition.available = 0;
          else edition.price = "2.49";
          product.price = product.editions[0].price;
          product.available = product.editions[0].available;
          product.version++;
          localStorage.setItem("kurio:scenario", "success");
          // Persist the scenario mutation even though the purchase is rejected.
          return { changed: product, order: null, created: false };
        }
        const current = quoteFor(db, owner);
        if (
          previous.quote.expiresAt < Date.now() ||
          previous.quote.fingerprint !== current.fingerprint
        )
          throw new ApiFault(
            409,
            "Preço, disponibilidade ou taxas mudaram. Revise e confirme novamente.",
            undefined,
            { quote: current },
          );
        const order: Order = {
          id: crypto.randomUUID(),
          userId: owner,
          status: "pending",
          quote: structuredClone(previous.quote),
          collector: structuredClone(input.collector),
          wallet: structuredClone(wallet),
          transaction: "",
          createdAt: new Date().toISOString(),
          dueAt: Date.now() + (scenario() === "pending" ? 60000 : 2200),
          version: 1,
          reason:
            scenario() === "payment-declined" ? "payment-declined" : undefined,
        };
        for (const line of order.quote.lines) {
          const product = db.products.find((p) => p.id === line.nftId)!,
            edition = product.editions.find((e) => e.id === line.editionId)!;
          edition.available -= line.quantity;
          product.available = product.editions[0].available;
          product.version++;
        }
        db.orders.push(order);
        db.attempts[attemptKey] = { fingerprint, orderId: order.id };
        return { order, created: true };
      });
      if ("changed" in result && result.changed) {
        publish("nft.updated", {
          id: result.changed.id + ":" + result.changed.version,
          resourceId: result.changed.id,
          version: result.changed.version,
        });
        throw new ApiFault(
          409,
          "Preço ou disponibilidade mudou. Revise o carrinho antes de confirmar.",
        );
      }
      if (!result.order) throw new ApiFault(409, "Revise o pedido.");
      scheduleOrder(result.order);
      if (result.created && scenario() === "order-timeout")
        return HttpResponse.json(
          {
            message:
              "O servidor não respondeu a tempo. Recupere esta mesma tentativa.",
          },
          { status: 504 },
        );
      return HttpResponse.json(result.order, {
        status: result.created ? 201 : 200,
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.get("/api/orders/attempts/:key", async ({ request, params }) => {
    try {
      return await transaction((db) => {
        const owner = requireUser(db, request).user.id,
          attempt = db.attempts[owner + ":" + params.key];
        if (!attempt)
          throw new ApiFault(404, "Esta tentativa ainda não criou um pedido.");
        const order = db.orders.find((o) => o.id === attempt.orderId)!;
        if (settle(db, order)) queueMicrotask(() => announceOrder(order));
        scheduleOrder(order);
        return HttpResponse.json(order);
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.get("/api/orders/:id", async ({ request, params }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      return await transaction((db) => {
        const owner = requireUser(db, request).user.id,
          order = db.orders.find((o) => o.id === params.id);
        if (!order) throw new ApiFault(404, "Pedido não encontrado.");
        if (order.userId !== owner)
          throw new ApiFault(403, "Este pedido pertence a outro colecionador.");
        if (settle(db, order)) queueMicrotask(() => announceOrder(order));
        scheduleOrder(order);
        return HttpResponse.json(order);
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.get("/api/orders", async ({ request }) => {
    try {
      return await transaction((db) => {
        const owner = requireUser(db, request).user.id;
        const orders = db.orders.filter((o) => o.userId === owner);
        orders.forEach((order) => {
          if (settle(db, order)) queueMicrotask(() => announceOrder(order));
          scheduleOrder(order);
        });
        return HttpResponse.json(orders.reverse());
      });
    } catch (error) {
      return fail(error);
    }
  }),
];
