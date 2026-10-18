import { nfts } from "./fixtures";
import { originalArtwork } from "@/lib/nft-artwork";
import type {
  CartItem,
  Order,
  Product,
  Profile,
  Session,
  Wallet,
  Quote,
} from "@/domain/models";

type UserRecord = Profile & { passwordHash: string; salt: string };
type StoredCart = { items: CartItem[]; coupon: string; version: number };
export type Database = {
  connections: Record<string, { walletId: string; provider: string }>;
  users: UserRecord[];
  sessions: Record<string, { userId: string; expiresAt: number }>;
  products: Product[];
  favorites: Record<string, string[]>;
  wallets: Record<string, Wallet[]>;
  carts: Record<string, StoredCart>;
  orders: Order[];
  attempts: Record<string, { fingerprint: string; orderId: string }>;
  quotes: Record<string, { owner: string; quote: Quote }>;
};
const KEY = "kurio:database:v2";
let seedPromise: Promise<Database> | undefined;
export async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
async function seed(): Promise<Database> {
  const users = await Promise.all(
    [
      {
        id: "ana",
        name: "Ana Silva",
        email: "ana@kurio.test",
        salt: "kurio-demo-ana",
      },
      {
        id: "bruno",
        name: "Bruno Costa",
        email: "bruno@kurio.test",
        salt: "kurio-demo-bruno",
      },
    ].map((user) => ({
      ...user,
      phone: "11999998888",
      avatar: "",
      passwordHash:
        user.id === "ana"
          ? "b0bc10b60758577ca4b3e221a9b967cece6296b474823098dff1a8d9014fc668"
          : "e68ba55e43176364481138b3395b1fb9f7bf237021a99a72dec8979d1d0d8d28",
    })),
  );
  const wallets = Object.fromEntries(
    users.map((user) => [
      user.id,
      [
        {
          id: user.id + "-primary",
          label: "Principal",
          address: "0x" + (user.id === "ana" ? "a" : "b").repeat(40),
          network: "Ethereum",
          primary: true,
        },
        {
          id: user.id + "-reserve",
          label: "Reserva",
          address: "0x" + (user.id === "ana" ? "c" : "d").repeat(40),
          network: "Polygon",
          primary: false,
        },
      ],
    ]),
  );
  return {
    users,
    sessions: {},
    connections: {},
    products: nfts.map((n) => ({
      ...n,
      description:
        "Um colecionável digital da coleção " +
        n.collection +
        ", com edição limitada e identidade única.",
      editions: [
        {
          id: "limited",
          label: n.edition,
          available: n.available,
          price: n.price,
        },
        {
          id: "unique",
          label: "1/1",
          available: n.id === "kurio-001" ? 0 : 1,
          price: "4.95",
        },
        { id: "open", label: "Aberta", available: 20, price: "0.75" },
      ],
    })),
    favorites: {},
    wallets,
    carts: {},
    orders: [],
    attempts: {},
    quotes: {},
  };
}
export async function database() {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    const db = JSON.parse(saved) as Database;
    db.quotes ??= {};
    db.connections ??= {};
    // Upgrade artwork URLs without resetting users, carts or monetary snapshots.
    for (const product of db.products)
      product.image = originalArtwork(product.image);
    for (const order of db.orders)
      for (const line of order.quote.lines)
        line.image = originalArtwork(line.image);
    for (const { quote } of Object.values(db.quotes))
      for (const line of quote.lines) line.image = originalArtwork(line.image);
    return db;
  }
  seedPromise ??= seed();
  const db = await seedPromise;
  localStorage.setItem(KEY, JSON.stringify(db));
  return structuredClone(db);
}
export function save(db: Database) {
  localStorage.setItem(KEY, JSON.stringify(db));
}
export async function transaction<T>(
  work: (db: Database) => T | Promise<T>,
): Promise<T> {
  return navigator.locks.request("kurio-database", async () => {
    const db = await database();
    const result = await work(db);
    save(db);
    return result;
  });
}
export async function resetDatabase() {
  await navigator.locks.request("kurio-database", async () => {
    localStorage.removeItem(KEY);
    seedPromise = undefined;
    await database();
  });
}
export function publicUser(user: UserRecord): Profile {
  const { id, name, email, phone, avatar } = user;
  return { id, name, email, phone, avatar };
}
export function sessionFor(db: Database, token: string | null): Session | null {
  const session = token ? db.sessions[token] : undefined;
  const user =
    session && session.expiresAt > Date.now()
      ? db.users.find((user) => user.id === session.userId)
      : undefined;
  return user && token && session
    ? { user: publicUser(user), token, expiresAt: session.expiresAt }
    : null;
}
export function cartFor(db: Database, owner: string): StoredCart {
  return (db.carts[owner] ??= { items: [], coupon: "", version: 1 });
}
