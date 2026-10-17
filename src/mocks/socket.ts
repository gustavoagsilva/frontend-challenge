import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { database, sessionFor } from "./database";
import { subscribe } from "./events";

// MSW normalizes the Socket.IO /socket.io/ prefix before matching.
const channel = ws.link(location.origin.replace(/^http/, "ws") + "/");
const connections = new Set<() => void>();
export const socketCount = () => connections.size;
export function disconnectSockets() {
  connections.forEach((close) => close());
}
export const socketHandler = channel.addEventListener(
  "connection",
  (connection) => {
    const bound = toSocketIo(connection);
    const token = connection.client.url.searchParams.get("token");
    let active = true;
    const close = () => connection.client.close(1012, "Reconnect simulation");
    connections.add(close);
    const unsubscribe = subscribe((name, event) => {
      void database().then((db) => {
        if (!active) return;
        const session = sessionFor(db, token);
        if (
          name === "order.updated" &&
          (!session || session.user.id !== event.userId)
        )
          return;
        if (token && !session) {
          close();
          return;
        }
        bound.client.emit(name, event);
      });
    });
    const heartbeat = setInterval(() => {
      if (active) connection.client.send("2");
    }, 10000);
    connection.client.addEventListener("close", () => {
      active = false;
      clearInterval(heartbeat);
      unsubscribe();
      connections.delete(close);
    });
  },
);
