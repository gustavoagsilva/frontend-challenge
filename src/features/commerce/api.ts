import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/http";
import { useSession } from "@/features/account/session";
import type { Cart, CartItem, Quote, Order } from "@/domain/models";
export function useCart() {
  const session = useSession(),
    owner = session.data?.user.id || "guest";
  return useQuery({
    queryKey: ["cart", owner],
    queryFn: async ({ signal }) =>
      (await http.get<Cart>("/cart", { signal })).data,
    enabled: !session.isPending,
  });
}
export function useCartMutation() {
  const session = useSession(),
    client = useQueryClient(),
    owner = session.data?.user.id || "guest";
  return useMutation({
    mutationFn: async (input: CartItem & { add?: boolean }) =>
      (await http.put<Cart>("/cart/items", input)).data,
    onSuccess: async (cart) => {
      client.setQueryData(["cart", owner], cart);
      await client.invalidateQueries({ queryKey: ["quote"] });
    },
  });
}
export function useQuote(cart: Cart | undefined) {
  const session = useSession();
  return useQuery({
    queryKey: ["quote", session.data?.user.id || "guest", cart?.version],
    queryFn: async ({ signal }) =>
      (await http.post<Quote>("/quotes", {}, { signal })).data,
    enabled: !!cart?.items.length,
    staleTime: 10000,
    refetchOnMount: "always",
  });
}
export const orderQuery = (userId: string, id: string) => ({
  queryKey: ["private", userId, "order", id],
  queryFn: async ({ signal }: { signal: AbortSignal }) =>
    (await http.get<Order>("/orders/" + id, { signal })).data,
});
