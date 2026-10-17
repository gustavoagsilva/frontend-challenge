import type { CartLine, Quote } from "@/domain/models";
import { formatEth } from "@/features/catalog/contracts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
export function Totals({ quote }: { quote: Quote }) {
  return (
    <dl className="totals">
      <dt>Subtotal</dt>
      <dd>{formatEth(quote.subtotal)}</dd>
      <dt>Desconto {quote.coupon && "(" + quote.coupon + ")"}</dt>
      <dd>− {formatEth(quote.discount)}</dd>
      <dt>Taxa de rede</dt>
      <dd>{formatEth(quote.fee)}</dd>
      <dt className="total">Total</dt>
      <dd className="total" data-testid="quote-total">
        {formatEth(quote.total)}
      </dd>
    </dl>
  );
}
export function LineSummary({ lines }: { lines: CartLine[] }) {
  return (
    <div className="line-summary">
      {lines.map((line) => (
        <div key={line.nftId + line.editionId}>
          <img src={line.image} alt="" width="60" height="60" />
          <div>
            <strong>{line.name}</strong>
            <span>
              Edição {line.edition} · {line.quantity} un.
            </span>
          </div>
          <span>{formatEth(line.total)}</span>
        </div>
      ))}
    </div>
  );
}
export function Quantity({
  quantity,
  max,
  busy,
  onChange,
  name,
}: {
  quantity: number;
  max: number;
  busy?: boolean;
  onChange: (value: number) => void;
  name: string;
}) {
  return (
    <div className="quantity">
      <Button
        variant="outline"
        size="icon"
        aria-label={"Diminuir quantidade de " + name}
        disabled={busy || quantity <= 1}
        onClick={() => onChange(quantity - 1)}
      >
        −
      </Button>
      <output aria-label={"Quantidade de " + name}>{quantity}</output>
      <Button
        variant="outline"
        size="icon"
        aria-label={"Aumentar quantidade de " + name}
        disabled={busy || quantity >= max}
        onClick={() => onChange(quantity + 1)}
      >
        +
      </Button>
    </div>
  );
}
export function SummarySkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando resumo"
      className="summary-skeleton"
    >
      {[1, 2, 3, 4].map((n) => (
        <Skeleton key={n} className="h-5 w-full mb-5" />
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
