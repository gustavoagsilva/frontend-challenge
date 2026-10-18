import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/account/session";
import type { ResourceEvent } from "@/domain/models";

export function Realtime() {
  const session = useSession(),
    client = useQueryClient();
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState("");
  const token = session.data?.token,
    userId = session.data?.user.id;
  useEffect(() => {
    if (session.isPending) return;
    let active = true;
    let hasConnected = false;
    let disconnect: (() => void) | undefined;
    const versions = new Map<string, number>(),
      seen = new Set<string>();
    const reconcile = () => {
      if (!active) return;
      setOffline(false);
      for (const key of [
        ["catalog"],
        ["discovery"],
        ["nft"],
        ["cart"],
        ["quote"],
        ["private", userId, "orders"],
        ["private", userId, "order"],
      ])
        void client.invalidateQueries({ queryKey: key });
    };
    void import("socket.io-client").then(({ io }) => {
      if (!active) return;
      const socket = io(location.origin, {
        transports: ["websocket"],
        query: token ? { token } : {},
        reconnectionDelay: 500,
        reconnectionDelayMax: 2000,
      });
      const receive = (kind: "nft" | "order", event: ResourceEvent) => {
        if (
          !active ||
          !event ||
          typeof event.id !== "string" ||
          !Number.isInteger(event.version)
        )
          return;
        if (kind === "order" && event.userId !== userId) return;
        const key = kind + ":" + event.resourceId;
        const cached = client.getQueryData<{ version: number }>(
          kind === "nft"
            ? ["nft", event.resourceId]
            : ["private", userId, "order", event.resourceId],
        );
        if (
          seen.has(event.id) ||
          event.version <=
            Math.max(versions.get(key) || 0, cached?.version || 0)
        )
          return;
        seen.add(event.id);
        versions.set(key, event.version);
        if (seen.size > 500) seen.delete(seen.values().next().value!);
        if (kind === "nft") {
          setMessage(
            "Pre\u00e7o ou disponibilidade atualizados. Confira o resumo antes de comprar.",
          );
          for (const prefix of [
            ["nft", event.resourceId],
            ["catalog"],
            ["discovery"],
            ["cart"],
            ["quote"],
          ])
            void client.invalidateQueries({ queryKey: prefix });
        } else {
          void client.invalidateQueries({
            queryKey: ["private", userId, "order", event.resourceId],
          });
          void client.invalidateQueries({
            queryKey: ["private", userId, "orders"],
          });
          void client.invalidateQueries({ queryKey: ["cart", userId] });
        }
      };
      socket.on("connect", () => {
        // Initial queries already fetch current data. Reconcile only after a
        // disconnect, avoiding duplicate requests and a second loading flash.
        if (hasConnected) reconcile();
        else setOffline(false);
        hasConnected = true;
      });
      socket.on("disconnect", () => {
        if (active) setOffline(true);
      });
      socket.on("connect_error", () => {
        if (active) setOffline(true);
      });
      socket.on("nft.updated", (event) => receive("nft", event));
      socket.on("order.updated", (event) => receive("order", event));
      disconnect = () => {
        socket.removeAllListeners();
        socket.disconnect();
      };
    });
    window.addEventListener("online", reconcile);
    return () => {
      active = false;
      disconnect?.();
      window.removeEventListener("online", reconcile);
    };
  }, [token, userId, session.isPending, client]);
  return (
    <>
      {message && (
        <div className="connection-status" role="status">
          {message}{" "}
          <button
            aria-label="Fechar aviso de valores"
            onClick={() => setMessage("")}
          >
            OK
          </button>
        </div>
      )}
      {offline ? (
        <div className="connection-status" role="status">
          Reconectando atualizações. Os pedidos continuam disponíveis para
          consulta.
        </div>
      ) : null}
    </>
  );
}
