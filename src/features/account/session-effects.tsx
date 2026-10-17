import { useEffect } from "react";
import { useSession, changeSession } from "./session";
import { router } from "@/router";
const privatePaths = [
  "/perfil",
  "/carteiras",
  "/favoritos",
  "/pagamento",
  "/pedidos",
];
export function SessionEffects() {
  const session = useSession();
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
    const storage = (event: StorageEvent) => {
      if (event.key === "kurio:token") {
        void session.refetch();
      }
    };
    window.addEventListener("kurio:session-expired", expired);
    window.addEventListener("storage", storage);
    if (
      session.isSuccess &&
      !session.data &&
      localStorage.getItem("kurio:token")
    )
      void expired();
    return () => {
      window.removeEventListener("kurio:session-expired", expired);
      window.removeEventListener("storage", storage);
    };
  }, [session.data, session.isSuccess, session.refetch]);
  return null;
}
