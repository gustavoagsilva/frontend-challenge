import { http, HttpResponse } from "msw";
import { database, transaction } from "./database";
import { publish } from "./events";
import { disconnectSockets, socketCount } from "./socket";
import { announceOrder, settle } from "./commerce";
const scenarios = [
  "success",
  "slow",
  "out-of-order",
  "offline",
  "error",
  "empty",
  "validation-error",
  "favorite-error",
  "session-expired",
  "wallet-rejected",
  "wrong-network",
  "price-changed",
  "sold-out",
  "pending",
  "payment-declined",
  "order-timeout",
];
export const demoHandlers = [
  http.get("/api/__mock/status", () =>
    HttpResponse.json({ connections: socketCount() }),
  ),
  http.post("/api/__mock/scenario", async ({ request }) => {
    const { scenario } = (await request.json()) as { scenario: string };
    if (!scenarios.includes(scenario))
      return HttpResponse.json(
        { message: "Cenário inválido." },
        { status: 422 },
      );
    localStorage.setItem("kurio:scenario", scenario);
    return HttpResponse.json({ scenario });
  }),
  http.post("/api/__mock/action", async ({ request }) => {
    const input = (await request.json()) as {
      action: string;
      nftId?: string;
      price?: string;
      available?: number;
      orderId?: string;
    };
    if (input.action === "disconnect") {
      disconnectSockets();
      return HttpResponse.json({ ok: true });
    }
    if (input.action === "expire") {
      await transaction((db) => {
        Object.values(db.sessions).forEach((session) => {
          session.expiresAt = 0;
        });
        db.connections = {};
      });
      window.dispatchEvent(new Event("kurio:session-expired"));
      return HttpResponse.json({ ok: true });
    }
    if (input.action === "settle") {
      const order = await transaction((db) => {
        const order = db.orders.find((o) => o.id === input.orderId);
        if (order) settle(db, order, true);
        return order;
      });
      if (order) announceOrder(order);
      return HttpResponse.json({ ok: !!order });
    }
    if (input.action === "update-nft") {
      const product = await transaction((db) => {
        const product = db.products.find(
          (p) => p.id === (input.nftId || "kurio-001"),
        );
        if (!product) return null;
        if (input.price && /^\d+(\.\d{1,18})?$/.test(input.price))
          product.editions[0].price = input.price;
        if (
          typeof input.available === "number" &&
          Number.isInteger(input.available) &&
          input.available >= 0
        )
          product.editions[0].available = input.available;
        product.price = product.editions[0].price;
        product.available = product.editions[0].available;
        product.version++;
        return product;
      });
      if (product)
        publish("nft.updated", {
          id: crypto.randomUUID(),
          resourceId: product.id,
          version: product.version,
        });
      return HttpResponse.json({ ok: !!product });
    }
    if (input.action === "duplicates") {
      const db = await database(),
        product = db.products.find(
          (p) => p.id === (input.nftId || "kurio-001"),
        )!;
      const event = {
        id: "duplicate:" + product.version,
        resourceId: product.id,
        version: product.version,
      };
      publish("nft.updated", event);
      publish("nft.updated", event);
      publish("nft.updated", {
        ...event,
        id: "old",
        version: product.version - 1,
      });
      return HttpResponse.json({ ok: true });
    }
    return HttpResponse.json({ message: "Ação inválida." }, { status: 422 });
  }),
];
