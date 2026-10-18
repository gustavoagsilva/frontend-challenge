import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useSession } from "./session";
import { apiError } from "@/lib/http";
import { NftCard } from "@/features/catalog/pages";
import { nftQuery } from "@/features/catalog/api";
import { AccountSidebar } from "./pages";
import { favoritesQuery } from "./api";
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
