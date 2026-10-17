import { useEffect } from "react";
import { useSession, changeSession, sessionQuery } from "./session";
import { router } from "@/router";
import { queryClient } from "@/lib/query-client";
const privatePaths = [
  "/perfil",
  "/carteiras",
  "/favoritos",
  "/pagamento",
  "/pedidos",
];
export function SessionEffects() {
  const { data, isSuccess } = useSession();
  useEffect(() => {
    let changing = false;
    async function expired() {
      if (changing) return;
      changing = true;
      const href = location.pathname + location.search;
      await changeSession(null);
      if (privatePaths.some((path) => location.pathname.startsWith(path)))
        await router.navigate({ to: "/login", search: { redirect: href } });
      changing = false;
    }
    async function storage(event: StorageEvent) {
      if (event.key !== "kurio:token") return;
      await queryClient.cancelQueries();
      queryClient.clear();
      const next = await queryClient.fetchQuery(sessionQuery).catch(() => null);
      if (!next) await expired();
      else window.dispatchEvent(new Event("kurio:session-changed"));
    }
    window.addEventListener("kurio:session-expired", expired);
    window.addEventListener("storage", storage);
    if (isSuccess && !data && localStorage.getItem("kurio:token"))
      void expired();
    const timer = data
      ? setTimeout(
          () => void expired(),
          Math.max(0, data.expiresAt - Date.now()),
        )
      : undefined;
    return () => {
      clearTimeout(timer);
      window.removeEventListener("kurio:session-expired", expired);
      window.removeEventListener("storage", storage);
    };
  }, [data, isSuccess]);
  return null;
}
