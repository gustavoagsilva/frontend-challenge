import { queryOptions, useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import { queryClient } from "@/lib/query-client";
import type { Session } from "@/domain/models";
export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async ({ signal }) =>
    (await http.get<Session | null>("/session", { signal })).data,
  staleTime: 15000,
  retry: false,
  refetchInterval: 15000,
});
export const useSession = () => useQuery(sessionQuery);
export async function changeSession(session: Session | null) {
  await queryClient.cancelQueries();
  if (session) localStorage.setItem("kurio:token", session.token);
  else localStorage.removeItem("kurio:token");
  queryClient.clear();
  queryClient.setQueryData(["session"], session);
  window.dispatchEvent(new Event("kurio:session-changed"));
}
export function safeReturn(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.startsWith("/login") &&
    !value.startsWith("/cadastro")
    ? value
    : "/";
}
