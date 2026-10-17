import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Message } from "@/components/form";
import { http, apiError } from "@/lib/http";
import { useSession } from "@/features/account/session";
import { defaultSearch, formatEth } from "@/features/catalog/contracts";
import type { Cart } from "@/domain/models";
import { useCart, useCartMutation, useQuote } from "./api";
import { Quantity, SummarySkeleton, Totals } from "./shared";

export function CartPage() {
  const cart = useCart(),
    quote = useQuote(cart.data),
    mutation = useCartMutation(),
    client = useQueryClient(),
    session = useSession();
  const [coupon, setCoupon] = useState("");
  const couponMutation = useMutation({
    mutationFn: async (code: string) =>
      (await http.put<Cart>("/cart/coupon", { coupon: code })).data,
    onSuccess: async (data) => {
      client.setQueryData(["cart", session.data?.user.id || "guest"], data);
      await client.invalidateQueries({ queryKey: ["quote"] });
      setCoupon("");
    },
  });
  return (
    <main id="main-content" className="container commerce-page">
      <div className="page-heading">
        <h1>Carrinho de NFTs</h1>
        <Link to="/" search={defaultSearch} className="text-link">
          Continuar explorando
        </Link>
      </div>
      {cart.isPending ? (
        <SummarySkeleton />
      ) : cart.isError ? (
        <div className="empty-state" role="alert">
          <p>{apiError(cart.error).message}</p>
          <Button onClick={() => cart.refetch()}>Tentar novamente</Button>
        </div>
      ) : !cart.data.items.length ? (
        <div className="empty-state">
          <h2>Seu carrinho está vazio.</h2>
          <p>Descubra uma nova peça para sua coleção.</p>
          <Button asChild>
            <Link to="/" search={defaultSearch}>
              Explorar NFTs
            </Link>
          </Button>
        </div>
      ) : (
        <div className="checkout-layout">
          <section aria-label="Itens do carrinho">
            <div className="cart-table-head">
              <span>NFT</span>
              <span>Quantidade</span>
              <span>Total</span>
            </div>
            {cart.data.items.map((line) => (
              <article className="cart-line" key={line.nftId + line.editionId}>
                <img src={line.image} alt={line.name} width="96" height="96" />
                <div className="cart-line-name">
                  <Link to="/nfts/$nftId" params={{ nftId: line.nftId }}>
                    {line.name}
                  </Link>
                  <p>Edição: {line.edition}</p>
                  <strong>{formatEth(line.price)}</strong>
                  {line.quantity > line.available && (
                    <p className="field-error">
                      Disponível: {line.available}. Ajuste ou remova.
                    </p>
                  )}
                </div>
                <Quantity
                  quantity={line.quantity}
                  max={line.available}
                  busy={mutation.isPending}
                  name={line.name}
                  onChange={(quantity) =>
                    mutation.mutate({ ...line, quantity })
                  }
                />
                <strong className="cart-line-total">
                  {formatEth(line.total)}
                </strong>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={"Remover " + line.name}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ ...line, quantity: 0 })}
                >
                  <Trash2 />
                </Button>
              </article>
            ))}
            <Message
              error={
                mutation.error ? apiError(mutation.error).message : undefined
              }
              success={mutation.isSuccess ? "Carrinho atualizado." : undefined}
            />
          </section>
          <aside className="order-summary">
            <h2>Resumo do carrinho</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                couponMutation.mutate(coupon);
              }}
            >
              <Field
                label="Código promocional"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                error={
                  couponMutation.error
                    ? apiError(couponMutation.error).fields?.coupon
                    : undefined
                }
              />
              <Button
                disabled={couponMutation.isPending}
                type="submit"
                size="sm"
              >
                Aplicar cupom
              </Button>
            </form>
            {cart.data.coupon && (
              <div className="applied-coupon">
                <span>{cart.data.coupon}</span>
                <button
                  className="text-link"
                  disabled={couponMutation.isPending}
                  onClick={() => couponMutation.mutate("")}
                >
                  Remover cupom
                </button>
              </div>
            )}
            <Message
              error={
                couponMutation.error
                  ? apiError(couponMutation.error).message
                  : undefined
              }
            />
            {quote.isPending ? (
              <SummarySkeleton />
            ) : quote.isError ? (
              <>
                <Message error={apiError(quote.error).message} />
                <Button variant="outline" onClick={() => quote.refetch()}>
                  Atualizar cotação
                </Button>
              </>
            ) : (
              <Totals quote={quote.data} />
            )}
            <Button
              className="w-full mt-5"
              disabled={
                !quote.data ||
                quote.isError ||
                quote.isFetching ||
                mutation.isPending
              }
              asChild={
                !!quote.data &&
                !quote.isError &&
                !quote.isFetching &&
                !mutation.isPending
              }
            >
              {quote.data &&
              !quote.isError &&
              !quote.isFetching &&
              !mutation.isPending ? (
                <Link to="/pagamento">Conectar e finalizar</Link>
              ) : (
                "Conectar e finalizar"
              )}
            </Button>
            <p className="muted small mt-3">
              Taxa estimada. O pedido será revalidado antes da confirmação.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
