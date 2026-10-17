import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, CircleX } from "lucide-react";
import { orderRoute } from "@/router";
import { useSession } from "@/features/account/session";
import { AccountSidebar } from "@/features/account/pages";
import { http, apiError } from "@/lib/http";
import { Button } from "@/components/ui/button";
import type { Order } from "@/domain/models";
import { orderQuery } from "./api";
import { LineSummary, SummarySkeleton, Totals } from "./shared";
import { defaultSearch } from "@/features/catalog/contracts";
export function OrderPage() {
  const { orderId } = orderRoute.useParams(),
    session = useSession(),
    client = useQueryClient();
  const query = useQuery({
    ...orderQuery(session.data?.user.id || "", orderId),
    enabled: !!session.data,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1500 : false,
  });
  useEffect(() => {
    if (query.data?.status === "confirmed") {
      void client.invalidateQueries({ queryKey: ["cart"] });
      void client.invalidateQueries({ queryKey: ["catalog"] });
    }
  }, [query.data?.status, client]);
  return (
    <main id="main-content" className="container receipt-page">
      {query.isPending ? (
        <SummarySkeleton />
      ) : query.isError ? (
        <div className="empty-state" role="alert">
          <h1>Não foi possível consultar o pedido.</h1>
          <p>{apiError(query.error).message}</p>
          <Button onClick={() => query.refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <article className="receipt">
          <div className="receipt-heading">
            {query.data.status === "confirmed" ? (
              <CheckCircle2 />
            ) : query.data.status === "pending" ? (
              <Clock3 />
            ) : (
              <CircleX />
            )}
            <h1>
              {query.data.status === "confirmed"
                ? "Seus NFTs chegaram!"
                : query.data.status === "pending"
                  ? "Pedido em processamento"
                  : "Pagamento recusado"}
            </h1>
            <p role="status">
              {query.data.status === "confirmed"
                ? "Compra confirmada. Sua coleção ganhou uma nova história."
                : query.data.status === "pending"
                  ? "Aguardando a confirmação da carteira. Você pode atualizar esta página com segurança."
                  : query.data.reason}
            </p>
          </div>
          <dl className="receipt-meta">
            <dt>Pedido</dt>
            <dd data-testid="order-id">{query.data.id}</dd>
            <dt>Colecionador</dt>
            <dd>{query.data.collector.name}</dd>
            <dt>Data</dt>
            <dd>
              {new Date(query.data.createdAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </dd>
            <dt>Carteira</dt>
            <dd>
              {query.data.wallet.label} · {query.data.wallet.network}
            </dd>
          </dl>
          <LineSummary lines={query.data.quote.lines} />
          <Totals quote={query.data.quote} />
          {query.data.status === "confirmed" && (
            <div className="transaction-reference">
              <h2>Transação simulada</h2>
              <code>{query.data.transaction}</code>
              <p>
                Referência demonstrativa, sem registro em uma blockchain real.
              </p>
            </div>
          )}
          <div className="button-row">
            {query.data.status === "declined" ? (
              <Button asChild>
                <Link to="/carrinho">Voltar ao carrinho</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/" search={defaultSearch}>
                  Explorar coleções
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/pedidos">Meus pedidos</Link>
            </Button>
          </div>
        </article>
      )}
    </main>
  );
}
export function OrdersPage() {
  const session = useSession();
  const query = useQuery({
    queryKey: ["private", session.data?.user.id, "orders"],
    queryFn: async ({ signal }) =>
      (await http.get<Order[]>("/orders", { signal })).data,
    enabled: !!session.data,
  });
  return (
    <main id="main-content" className="container account-layout">
      <AccountSidebar />
      <section>
        <h1>Meus pedidos</h1>
        {query.isPending ? (
          <SummarySkeleton />
        ) : query.isError ? (
          <p role="alert">{apiError(query.error).message}</p>
        ) : !query.data.length ? (
          <div className="empty-state">
            <h2>Você ainda não fez uma compra.</h2>
          </div>
        ) : (
          <div className="orders-list">
            {query.data.map((order) => (
              <Link
                to="/pedidos/$orderId"
                params={{ orderId: order.id }}
                key={order.id}
              >
                <span>Pedido {order.id.slice(0, 8)}</span>
                <span>
                  {order.status === "confirmed"
                    ? "Confirmado"
                    : order.status === "pending"
                      ? "Pendente"
                      : "Recusado"}
                </span>
                <strong>{order.quote.total} ETH</strong>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
