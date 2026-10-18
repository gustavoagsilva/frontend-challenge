import { http } from "@/lib/http";
import type { Wallet } from "@/domain/models";
export const walletQuery = (userId: string) => ({
  queryKey: ["private", userId, "wallets"],
  queryFn: async ({ signal }: { signal: AbortSignal }) =>
    (await http.get<Wallet[]>("/wallets", { signal })).data,
});

export const favoritesQuery = (userId: string) => ({
  queryKey: ["private", userId, "favorites"],
  queryFn: async ({ signal }: { signal: AbortSignal }) =>
    (await http.get<string[]>("/favorites", { signal })).data,
});
