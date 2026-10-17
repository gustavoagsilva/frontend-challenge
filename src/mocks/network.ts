import { delay, HttpResponse } from "msw";
import { sessionFor, type Database } from "./database";
export class ApiFault extends Error {
  status: number;
  fields?: Record<string, string>;
  extra?: Record<string, unknown>;
  constructor(
    status: number,
    message: string,
    fields?: Record<string, string>,
    extra?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.extra = extra;
  }
}
export const scenario = () =>
  localStorage.getItem("kurio:scenario") || "success";
export async function network(request: Request) {
  const mode = scenario(),
    q = new URL(request.url).searchParams.get("q") || "";
  await delay(
    mode === "slow"
      ? 2500
      : mode === "out-of-order"
        ? q.length < 5
          ? 1500
          : 100
        : 120,
  );
  if (mode === "offline") return HttpResponse.error();
  if (mode === "error")
    return HttpResponse.json(
      { message: "Serviço temporariamente indisponível." },
      { status: 503 },
    );
  return null;
}
export function tokenOf(request: Request) {
  return request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? null;
}
export function requireUser(db: Database, request: Request) {
  const session = sessionFor(db, tokenOf(request));
  if (!session || scenario() === "session-expired")
    throw new ApiFault(
      401,
      "Sua sessão expirou. Entre novamente para continuar.",
    );
  return session;
}
export function ownerOf(db: Database, request: Request) {
  if (tokenOf(request)) return requireUser(db, request).user.id;
  return "guest:" + (request.headers.get("X-Guest-Id") || "anonymous");
}
export function fail(error: unknown) {
  if (error instanceof ApiFault)
    return HttpResponse.json(
      { message: error.message, fields: error.fields, ...error.extra },
      { status: error.status },
    );
  return HttpResponse.json(
    { message: "Não foi possível concluir a operação." },
    { status: 500 },
  );
}
export const emailValid = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const passwordValid = (value: string) =>
  value.length >= 8 && /[a-z]/i.test(value) && /\d/.test(value);
export async function body<T>(request: Request) {
  return request.json() as Promise<T>;
}
