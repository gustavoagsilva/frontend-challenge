import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useSession } from "./session";
import { http, apiError } from "@/lib/http";
import { useNotice } from "@/components/notice-context";
import { NftCard } from "@/features/catalog/pages";
import { nftQuery } from "@/features/catalog/api";
import { AccountSidebar } from "./pages";
const favoritesQuery = (userId: string) => ({
  queryKey: ["private", userId, "favorites"],
  queryFn: async ({ signal }: { signal: AbortSignal }) =>
    (await http.get<string[]>("/favorites", { signal })).data,
});
export function FavoriteButton({ id }: { id: string }) {
  const { data: session, isPending: sessionPending } = useSession(),
    client = useQueryClient(),
    navigate = useNavigate(),
    notice = useNotice();
  const key = favoritesQuery(session?.user.id || "").queryKey;
  const favorites = useQuery({
    ...favoritesQuery(session?.user.id || ""),
    enabled: !!session,
  });
  const active = favorites.data?.includes(id) || false;
  const mutation = useMutation({
    mutationFn: async (favorite: boolean) =>
      (await http.put<string[]>("/favorites/" + id, { favorite })).data,
    onMutate: async (favorite) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<string[]>(key);
      client.setQueryData<string[]>(key, (old) =>
        favorite
          ? [...new Set([...(old || []), id])]
          : (old || []).filter((item) => item !== id),
      );
      return { previous };
    },
    onError: (error, _, context) => {
      client.setQueryData(key, context?.previous || []);
      notice(apiError(error).message);
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
  return (
    <button
      className={"favorite-button " + (active ? "is-favorite" : "")}
      aria-label={(active ? "Remover favorito " : "Favoritar ") + id}
      aria-pressed={active}
      disabled={
        mutation.isPending ||
        sessionPending ||
        (!!session && favorites.isPending)
      }
      onClick={() =>
        session
          ? mutation.mutate(!active)
          : void navigate({
              to: "/login",
              search: { redirect: location.pathname + location.search },
            })
      }
    >
      <Heart size={17} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
function FavoriteCard({ id }: { id: string }) {
  const query = useQuery(nftQuery(id));
  return query.data ? <NftCard nft={query.data} /> : null;
}
export function FavoritesPage() {
  const { data: session } = useSession();
  const query = useQuery({
    ...favoritesQuery(session?.user.id || ""),
    enabled: !!session,
  });
  return (
    <main id="main-content" className="container account-layout">
      <AccountSidebar />
      <section>
        <h1>Meus favoritos</h1>
        {query.isPending ? (
          <p role="status">Carregando favoritos…</p>
        ) : query.isError ? (
          <p role="alert">{apiError(query.error).message}</p>
        ) : query.data.length ? (
          <div className="nft-grid">
            {query.data.map((id) => (
              <FavoriteCard key={id} id={id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Heart />
            <h2>Sua coleção de favoritos começa aqui.</h2>
            <p>Marque os NFTs que você quer acompanhar.</p>
          </div>
        )}
      </section>
    </main>
  );
}
