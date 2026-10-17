import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { detailRoute } from "@/router";
import { http, apiError } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Message } from "@/components/form";
import { FavoriteButton } from "@/features/account/favorites";
import { defaultSearch, formatEth } from "@/features/catalog/contracts";
import { discoveryQuery } from "@/features/catalog/api";
import { NftCard } from "@/features/catalog/pages";
import type { Product } from "@/domain/models";
import { useCartMutation } from "./api";
import { Quantity } from "./shared";

export function DetailPage() {
  const { nftId } = detailRoute.useParams();
  const query = useQuery({
    queryKey: ["nft", nftId],
    queryFn: async ({ signal }) =>
      (await http.get<Product>("/nfts/" + nftId, { signal })).data,
  });
  const related = useQuery(discoveryQuery);
  return (
    <main id="main-content" className="container detail-page">
      <Link to="/" search={defaultSearch} className="text-link">
        <ArrowLeft size={16} /> Voltar ao catálogo
      </Link>
      {query.isPending ? (
        <div className="detail-grid" role="status" aria-label="Carregando NFT">
          <Skeleton className="aspect-square w-full" />
          <div>
            <Skeleton className="h-12 w-full mb-6" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : query.isError ? (
        <div className="empty-state" role="alert">
          <h1>
            {isAxiosError(query.error) && query.error.response?.status === 404
              ? "NFT não encontrado"
              : "Não foi possível carregar o NFT"}
          </h1>
          <p>{apiError(query.error).message}</p>
          <Button onClick={() => query.refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <ProductContent key={nftId} product={query.data} />
      )}
      {related.data && (
        <section className="related">
          <h2>Mais desta coleção</h2>
          <div className="nft-grid">
            {related.data.featured.map((nft) => (
              <NftCard key={nft.id} nft={nft} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
function ProductContent({ product }: { product: Product }) {
  const [editionId, setEdition] = useState("limited"),
    [quantity, setQuantity] = useState(1),
    [zoom, setZoom] = useState(false);
  const edition =
    product.editions.find((e) => e.id === editionId) || product.editions[0];
  const mutation = useCartMutation(),
    navigate = useNavigate();
  const available = edition.available;
  async function add(buy: boolean) {
    await mutation.mutateAsync({
      nftId: product.id,
      editionId,
      quantity,
      add: true,
    });
    if (buy) await navigate({ to: "/pagamento" });
  }
  return (
    <>
      <div className="detail-grid">
        <section className="gallery" aria-label="Galeria do NFT">
          <div className={"gallery-main " + (zoom ? "zoomed" : "")}>
            <img
              src={product.image}
              alt={product.name}
              width="600"
              height="600"
              fetchPriority="high"
            />
          </div>
          <div className="gallery-thumbs">
            <button
              aria-label="Imagem completa"
              aria-pressed={!zoom}
              onClick={() => setZoom(false)}
            >
              <img src={product.image} alt="" width="70" height="70" />
            </button>
            <button
              aria-label="Ampliar detalhes da arte"
              aria-pressed={zoom}
              onClick={() => setZoom(true)}
            >
              <img
                className="zoom-thumb"
                src={product.image}
                alt=""
                width="70"
                height="70"
              />
            </button>
          </div>
        </section>
        <section className="product-info">
          <div className="product-title">
            <h1>{product.name}</h1>
            <FavoriteButton id={product.id} />
          </div>
          <strong className="detail-price">{formatEth(edition.price)}</strong>
          <p>{product.description}</p>
          <fieldset className="editions">
            <legend>Edição</legend>
            {product.editions.map((item) => (
              <button
                key={item.id}
                aria-pressed={item.id === editionId}
                disabled={!item.available}
                onClick={() => {
                  setEdition(item.id);
                  setQuantity(1);
                  mutation.reset();
                }}
              >
                {item.label}
                {!item.available && " · esgotada"}
              </button>
            ))}
          </fieldset>
          <dl className="product-facts">
            <dt>ID do token</dt>
            <dd>{product.id}</dd>
            <dt>Coleção</dt>
            <dd>{product.collection}</dd>
            <dt>Rede</dt>
            <dd>{product.network}</dd>
            <dt>Disponibilidade</dt>
            <dd>{available} unidades</dd>
          </dl>
          {!available && (
            <Message error="Esta edição está esgotada. Escolha outra edição disponível." />
          )}
          {quantity > available && available > 0 && (
            <Message error="A disponibilidade mudou. Reduza a quantidade." />
          )}
          <div className="purchase-actions">
            <Quantity
              quantity={quantity}
              max={available}
              name={product.name}
              onChange={setQuantity}
              busy={mutation.isPending}
            />
            <Button
              disabled={
                mutation.isPending || !available || quantity > available
              }
              onClick={() => {
                void add(true).catch(() => {});
              }}
            >
              Comprar NFT
            </Button>
            <Button
              variant="outline"
              aria-label="Adicionar ao carrinho"
              disabled={
                mutation.isPending || !available || quantity > available
              }
              onClick={() => {
                void add(false).catch(() => {});
              }}
            >
              <ShoppingCart />
            </Button>
          </div>
          <Message
            error={
              mutation.error ? apiError(mutation.error).message : undefined
            }
            success={
              mutation.isSuccess ? "NFT adicionado ao carrinho." : undefined
            }
          />
        </section>
      </div>
      <section className="product-description">
        <h2>Descrição do NFT</h2>
        <p>
          {product.description} Cada edição tem disponibilidade e preço
          próprios. Confira os detalhes antes de adicionar à sua coleção.
        </p>
        <p>
          A compra desta demonstração é simulada. Não conecta extensões,
          movimenta criptomoedas nem utiliza dados reais de pagamento.
        </p>
      </section>
    </>
  );
}
