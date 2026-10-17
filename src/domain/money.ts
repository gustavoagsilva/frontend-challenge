const SCALE = 10n ** 18n;
export function units(value: string) {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) throw new Error("Valor ETH inválido");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, "0"));
}
export function decimal(value: bigint) {
  const fraction = (value % SCALE)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return (value / SCALE).toString() + (fraction ? "." + fraction : "");
}
export const multiply = (value: string, quantity: number) =>
  decimal(units(value) * BigInt(quantity));
