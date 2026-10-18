import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Field, Message } from "@/components/form";
import { http, apiError } from "@/lib/http";
import { useSession } from "@/features/account/session";
import { walletQuery } from "@/features/account/api";
import type { Collector, Order, Quote, Wallet } from "@/domain/models";
import { useCart, useQuote } from "./api";
import { LineSummary, SummarySkeleton, Totals } from "./shared";

type Attempt = {
  key: string;
  input: {
    quoteId: string;
    walletId: string;
    collector: Collector;
    connected: boolean;
  };
};
function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function CheckoutPage() {
  const session = useSession();
  return session.data ? (
    <Checkout
      key={session.data.user.id}
      userId={session.data.user.id}
      initialName={session.data.user.name}
      initialEmail={session.data.user.email}
      initialPhone={session.data.user.phone}
    />
  ) : (
    <main id="main-content" className="container commerce-page">
      <SummarySkeleton />
    </main>
  );
}
function Checkout({
  userId,
  initialName,
  initialEmail,
  initialPhone,
}: {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
}) {
  const cart = useCart(),
    quote = useQuote(cart.data),
    wallets = useQuery(walletQuery(userId)),
    navigate = useNavigate(),
    client = useQueryClient();
  const draftKey = "kurio:checkout:" + userId,
    attemptKey = "kurio:attempt:" + userId;
  const [collector, setCollector] = useState<Collector>(() =>
    readStored(draftKey, {
      name: initialName,
      email: initialEmail,
      phone: initialPhone,
      country: "Brasil",
      city: "",
      postalCode: "",
      note: "",
    }),
  );
  const [walletId, setWalletId] = useState(""),
    [provider, setProvider] = useState("MetaMask");
  const wallet: Wallet | undefined =
    wallets.data?.find((w) => w.id === walletId) ||
    wallets.data?.find((w) => w.primary) ||
    wallets.data?.[0];
  const [networkChoice, setNetworkChoice] = useState({
    walletId: "",
    network: "",
  });
  const selectedNetwork =
    networkChoice.walletId === wallet?.id
      ? networkChoice.network
      : wallet?.network || "Ethereum";
  const [connection, setConnection] = useState("");
  const connectionKey =
    (wallet?.id || "") + ":" + provider + ":" + selectedNetwork;
  const connected = connection === connectionKey;
  const [review, setReview] = useState<{ quote: Quote; data: string } | null>(
    null,
  );
  const [attempt, setAttempt] = useState<Attempt | null>(() =>
    readStored(attemptKey, null),
  );
  const [reviewMessage, setReviewMessage] = useState("");
  const busy = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const dataSignature = JSON.stringify({
    collector,
    walletId: wallet?.id,
    provider,
    network: selectedNetwork,
  });
  const validReview =
    !!review &&
    !!quote.data &&
    !quote.isError &&
    !quote.isFetching &&
    review.quote.fingerprint === quote.data.fingerprint &&
    review.data === dataSignature &&
    review.quote.expiresAt > now &&
    connected;
  function edit(name: keyof Collector, value: string) {
    const next = { ...collector, [name]: value };
    setCollector(next);
    sessionStorage.setItem(draftKey, JSON.stringify(next));
    setReview(null);
  }
  const connect = useMutation({
    mutationFn: async () =>
      (
        await http.post("/wallet-connection", {
          walletId: wallet?.id,
          provider,
          network: selectedNetwork,
        })
      ).data,
    onSuccess: () => {
      setConnection(connectionKey);
      setReviewMessage("Carteira conectada na simulação.");
    },
  });
  const disconnect = useMutation({
    mutationFn: () => http.delete("/wallet-connection"),
    onSuccess: () => {
      setConnection("");
      setReview(null);
      setReviewMessage("Carteira desconectada.");
    },
  });
  const submit = useMutation({
    mutationFn: async (value: Attempt) =>
      (
        await http.post<Order>("/orders", value.input, {
          headers: { "Idempotency-Key": value.key },
        })
      ).data,
    onSuccess: async (order) => {
      sessionStorage.removeItem(attemptKey);
      sessionStorage.removeItem(draftKey);
      setAttempt(null);
      await client.invalidateQueries({ queryKey: ["cart"] });
      await navigate({
        to: "/pedidos/$orderId",
        params: { orderId: order.id },
      });
    },
    onError: async (error) => {
      const status = (error as { response?: { status: number } }).response
        ?.status;
      if (status && status < 500 && status !== 401) {
        sessionStorage.removeItem(attemptKey);
        setAttempt(null);
        setReview(null);
        await client.invalidateQueries({ queryKey: ["cart"] });
        await client.invalidateQueries({ queryKey: ["quote"] });
      }
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const recover = useMutation({
    mutationFn: async () =>
      (await http.get<Order>("/orders/attempts/" + attempt!.key)).data,
    onSuccess: async (order) => {
      sessionStorage.removeItem(attemptKey);
      setAttempt(null);
      await navigate({
        to: "/pedidos/$orderId",
        params: { orderId: order.id },
      });
    },
  });
  function reviewOrder(event: FormEvent) {
    event.preventDefault();
    if (!connected) {
      setReviewMessage("Conecte uma carteira para revisar.");
      return;
    }
    if (quote.data && !quote.isError) {
      setReview({ quote: quote.data, data: dataSignature });
      setReviewMessage(
        "Revise os dados, a carteira e os valores abaixo antes de confirmar.",
      );
    }
  }
  function confirm() {
    if (busy.current) return;
    if (!validReview || !review || !wallet) {
      setReview(null);
      setReviewMessage(
        "Os dados mudaram. Revise novamente antes de confirmar.",
      );
      return;
    }
    const next = {
      key: crypto.randomUUID(),
      input: {
        quoteId: review.quote.id,
        walletId: wallet.id,
        collector,
        connected: true,
      },
    };
    sessionStorage.setItem(attemptKey, JSON.stringify(next));
    setAttempt(next);
    busy.current = true;
    submit.mutate(next);
  }
  const error = submit.error ? apiError(submit.error) : undefined;
  if (attempt && !submit.isPending)
    return (
      <main id="main-content" className="container commerce-page">
        <h1>Recuperar tentativa de compra</h1>
        <div className="empty-state">
          <p>
            Há uma tentativa aguardando resposta. Vamos consultar o mesmo
            pedido, sem criar outra compra.
          </p>
          <Message
            error={
              error?.message ||
              (recover.error ? apiError(recover.error).message : undefined)
            }
          />
          <Button onClick={() => recover.mutate()} disabled={recover.isPending}>
            Recuperar pedido
          </Button>
          {recover.isError && (
            <Button
              variant="outline"
              onClick={() => submit.mutate(attempt)}
              disabled={submit.isPending}
            >
              Reenviar a mesma tentativa
            </Button>
          )}
        </div>
      </main>
    );
  return (
    <main id="main-content" className="container commerce-page">
      <div className="page-heading">
        <h1>Pagamento com carteira</h1>
        <Link to="/carrinho" className="text-link">
          Voltar ao carrinho
        </Link>
      </div>
      {cart.isPending ? (
        <SummarySkeleton />
      ) : cart.isError ? (
        <div className="empty-state" role="alert">
          <p>{apiError(cart.error).message}</p>
          <Button onClick={() => cart.refetch()}>Tentar novamente</Button>
        </div>
      ) : !cart.data?.items.length ? (
        <div className="empty-state">
          <h2>Adicione NFTs ao carrinho para continuar.</h2>
          <Link to="/carrinho">Ver carrinho</Link>
        </div>
      ) : (
        <form onSubmit={reviewOrder} className="checkout-layout">
          <section className="collector-form">
            <h2>Perfil do colecionador</h2>
            <div className="form-columns">
              {(
                [
                  { key: "name", label: "Nome do colecionador", auto: "name" },
                  { key: "email", label: "E-mail", auto: "email" },
                  { key: "phone", label: "Telefone", auto: "tel" },
                  { key: "country", label: "País", auto: "country-name" },
                  { key: "city", label: "Cidade", auto: "address-level2" },
                  { key: "postalCode", label: "CEP", auto: "postal-code" },
                ] as const
              ).map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  autoComplete={field.auto}
                  type={field.key === "email" ? "email" : "text"}
                  required
                  value={collector[field.key]}
                  onChange={(e) => edit(field.key, e.target.value)}
                  error={error?.fields?.[field.key]}
                />
              ))}
            </div>
            <label className="form-field">
              <span>Observação do colecionador (opcional)</span>
              <textarea
                rows={4}
                maxLength={500}
                value={collector.note}
                onChange={(e) => edit("note", e.target.value)}
              />
            </label>
            <h2>Carteira e rede</h2>
            {wallets.isPending ? (
              <SummarySkeleton />
            ) : wallets.isError ? (
              <Message error={apiError(wallets.error).message} />
            ) : !wallets.data.length ? (
              <p>
                Você precisa{" "}
                <Link className="text-link" to="/carteiras">
                  cadastrar uma carteira
                </Link>{" "}
                antes de comprar.
              </p>
            ) : (
              <fieldset className="checkout-wallets">
                <legend className="sr-only">Carteira cadastrada</legend>
                {wallets.data.map((item) => (
                  <label className="wallet-choice" key={item.id}>
                    <input
                      type="radio"
                      name="wallet"
                      checked={wallet?.id === item.id}
                      onChange={() => {
                        setWalletId(item.id);
                        setConnection("");
                        setReview(null);
                      }}
                    />
                    <div>
                      <strong>{item.label}</strong>
                      <span>
                        {item.address.slice(0, 10)}…{item.address.slice(-4)}
                      </span>
                      <span>Rede {item.network}</span>
                    </div>
                  </label>
                ))}
              </fieldset>
            )}
            <label className="form-field">
              <span>Rede da conexão</span>
              <select
                value={selectedNetwork}
                onChange={(event) => {
                  setNetworkChoice({
                    walletId: wallet?.id || "",
                    network: event.target.value,
                  });
                  setConnection("");
                  setReview(null);
                }}
              >
                {["Ethereum", "Polygon", "Solana"].map((network) => (
                  <option key={network}>{network}</option>
                ))}
              </select>
            </label>
            <fieldset className="provider-options">
              <legend>Conectar usando</legend>
              {["WalletConnect", "MetaMask", "Coinbase Wallet"].map((item) => (
                <label className="wallet-choice" key={item}>
                  <input
                    type="radio"
                    name="provider"
                    checked={provider === item}
                    onChange={() => {
                      setProvider(item);
                      setConnection("");
                      setReview(null);
                    }}
                  />
                  {item}
                </label>
              ))}
            </fieldset>
            <Message
              error={
                connect.error
                  ? apiError(connect.error).message
                  : disconnect.error
                    ? apiError(disconnect.error).message
                    : undefined
              }
            />
            <Button
              type="button"
              variant="outline"
              disabled={!wallet || connect.isPending || disconnect.isPending}
              onClick={() =>
                connected ? disconnect.mutate() : connect.mutate()
              }
            >
              {connected
                ? "Desconectar carteira"
                : connect.isPending
                  ? "Conectando…"
                  : "Conectar carteira"}
            </Button>
            <p className="muted small mt-3">
              Conexão e pagamento simulados. Nenhuma extensão de carteira é
              necessária.
            </p>
          </section>
          <aside className="order-summary">
            <h2>Seus NFTs</h2>
            <LineSummary lines={cart.data.items} />
            {quote.isPending ? (
              <SummarySkeleton />
            ) : quote.isError ? (
              <>
                <Message error={apiError(quote.error).message} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => quote.refetch()}
                >
                  Atualizar cotação
                </Button>
              </>
            ) : (
              <Totals quote={quote.data} />
            )}
            <Message error={error?.message} success={reviewMessage} />
            {review && !validReview && (
              <p role="alert" className="form-message error">
                Os valores ou dados mudaram. É necessário revisar novamente.
              </p>
            )}
            {validReview && (
              <div className="review-box" aria-label="Revisão do pedido">
                <h3>Revise sua compra</h3>
                <p>
                  {collector.name}
                  <br />
                  {collector.email}
                  <br />
                  {wallet?.label} · {wallet?.network}
                </p>
                <p>
                  {review!.quote.lines.reduce((n, l) => n + l.quantity, 0)}{" "}
                  unidade(s) · {review!.quote.total} ETH
                </p>
              </div>
            )}
            {validReview ? (
              <Button
                className="w-full mt-5"
                type="button"
                disabled={submit.isPending || quote.isFetching}
                onClick={confirm}
              >
                {submit.isPending ? "Enviando pedido…" : "Confirmar compra"}
              </Button>
            ) : (
              <Button
                className="w-full mt-5"
                type="submit"
                disabled={
                  !connected || !quote.data || quote.isError || quote.isFetching
                }
              >
                Revisar pedido
              </Button>
            )}
          </aside>
        </form>
      )}
    </main>
  );
}
