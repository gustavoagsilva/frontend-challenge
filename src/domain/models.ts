import type { Nft } from "@/features/catalog/contracts";

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
};
export type Wallet = {
  id: string;
  label: string;
  address: string;
  network: string;
  primary: boolean;
};
export type Session = { user: Profile; token: string; expiresAt: number };
export type Edition = {
  id: string;
  label: string;
  available: number;
  price: string;
};
export type Product = Nft & { editions: Edition[]; description: string };
export type CartItem = { nftId: string; editionId: string; quantity: number };
export type CartLine = CartItem & {
  name: string;
  image: string;
  edition: string;
  price: string;
  available: number;
  total: string;
  version: number;
};
export type Cart = { items: CartLine[]; coupon: string; version: number };
export type Quote = {
  id: string;
  lines: CartLine[];
  coupon: string;
  subtotal: string;
  discount: string;
  fee: string;
  total: string;
  expiresAt: number;
  fingerprint: string;
};
export type Collector = {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  postalCode: string;
  note: string;
};
export type Order = {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "declined";
  quote: Quote;
  collector: Collector;
  wallet: Wallet;
  transaction: string;
  createdAt: string;
  dueAt: number;
  version: number;
  reason?: string;
};
export type ApiError = {
  message: string;
  fields?: Record<string, string>;
  quote?: Quote;
};
export type ResourceEvent = {
  id: string;
  resourceId: string;
  version: number;
  userId?: string;
};
