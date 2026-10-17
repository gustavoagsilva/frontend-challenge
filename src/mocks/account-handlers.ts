import { http, HttpResponse } from "msw";
import {
  cartFor,
  database,
  passwordHash,
  publicUser,
  sessionFor,
  transaction,
} from "./database";
import {
  ApiFault,
  body,
  emailValid,
  fail,
  network,
  passwordValid,
  requireUser,
  scenario,
  tokenOf,
} from "./network";
import type { Wallet } from "@/domain/models";
const auth =
  (register: boolean) =>
  async ({ request }: { request: Request }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      const input = await body<{
        name?: string;
        email: string;
        password: string;
      }>(request);
      return await transaction(async (db) => {
        const email = input.email?.trim().toLowerCase() || "";
        if (!emailValid(email))
          throw new ApiFault(422, "Confira seu e-mail.", {
            email: "Informe um e-mail válido.",
          });
        let user = db.users.find((u) => u.email === email);
        if (register) {
          if (user || scenario() === "registration-conflict")
            throw new ApiFault(409, "Este e-mail já está cadastrado.", {
              email: "Use outro e-mail ou entre na sua conta.",
            });
          if (!input.name?.trim() || !passwordValid(input.password || ""))
            throw new ApiFault(422, "Confira os campos.", {
              name: !input.name?.trim() ? "Informe seu nome." : "",
              password: !passwordValid(input.password || "")
                ? "Use ao menos 8 caracteres, letras e números."
                : "",
            });
          const salt = crypto.randomUUID();
          user = {
            id: crypto.randomUUID(),
            name: input.name.trim(),
            email,
            phone: "",
            avatar: "",
            salt,
            passwordHash: await passwordHash(input.password, salt),
          };
          db.users.push(user);
          db.wallets[user.id] = [];
        } else if (
          !user ||
          (await passwordHash(input.password || "", user.salt)) !==
            user.passwordHash
        ) {
          throw new ApiFault(401, "E-mail ou senha incorretos.");
        }
        if (!user) throw new ApiFault(401, "Conta não encontrada.");
        const token = crypto.randomUUID(),
          expiresAt = Date.now() + 60 * 60 * 1000;
        db.sessions[token] = { userId: user.id, expiresAt };
        const guestKey =
          "guest:" + (request.headers.get("X-Guest-Id") || "anonymous");
        const guest = cartFor(db, guestKey),
          cart = cartFor(db, user.id);
        for (const item of guest.items) {
          const edition = db.products
            .find((p) => p.id === item.nftId)
            ?.editions.find((e) => e.id === item.editionId);
          if (!edition?.available) continue;
          const existing = cart.items.find(
            (i) => i.nftId === item.nftId && i.editionId === item.editionId,
          );
          if (existing)
            existing.quantity = Math.min(
              edition.available,
              existing.quantity + item.quantity,
            );
          else
            cart.items.push({
              ...item,
              quantity: Math.min(edition.available, item.quantity),
            });
        }
        if (guest.items.length) {
          cart.version++;
          guest.items = [];
          guest.coupon = "";
          guest.version++;
        }
        return HttpResponse.json({ token, expiresAt, user: publicUser(user) });
      });
    } catch (error) {
      return fail(error);
    }
  };
export const accountHandlers = [
  http.post("/api/session/login", auth(false)),
  http.post("/api/session/register", auth(true)),
  http.get("/api/session", async ({ request }) => {
    const failure = await network(request);
    if (failure) return failure;
    const db = await database();
    return HttpResponse.json(
      scenario() === "session-expired"
        ? null
        : sessionFor(db, tokenOf(request)),
    );
  }),
  http.delete("/api/session", async ({ request }) => {
    await transaction((db) => {
      const token = tokenOf(request);
      if (token) delete db.sessions[token];
    });
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("/api/profile", async ({ request }) => {
    try {
      return HttpResponse.json(requireUser(await database(), request).user);
    } catch (error) {
      return fail(error);
    }
  }),
  http.patch("/api/profile", async ({ request }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      const input = await body<{
        name: string;
        email: string;
        phone: string;
        avatar: string;
      }>(request);
      return await transaction((db) => {
        const session = requireUser(db, request),
          fields: Record<string, string> = {};
        if (!input.name?.trim()) fields.name = "Informe seu nome.";
        if (!emailValid(input.email || "")) fields.email = "E-mail inválido.";
        if (input.phone && !/^[+\d ()-]{8,22}$/.test(input.phone))
          fields.phone = "Telefone inválido.";
        if (
          input.avatar &&
          (!/^data:image\/(png|jpeg|webp);base64,/.test(input.avatar) ||
            input.avatar.length > 700000)
        )
          fields.avatar = "Use PNG, JPG ou WebP de até 500 KB.";
        if (
          db.users.some(
            (u) =>
              u.id !== session.user.id &&
              u.email === input.email.trim().toLowerCase(),
          )
        )
          fields.email = "E-mail já utilizado.";
        if (Object.keys(fields).length || scenario() === "validation-error")
          throw new ApiFault(
            422,
            "Revise os dados do perfil.",
            Object.keys(fields).length
              ? fields
              : { name: "Nome não aceito neste cenário." },
          );
        const user = db.users.find((u) => u.id === session.user.id)!;
        Object.assign(user, {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone,
          avatar: input.avatar,
        });
        return HttpResponse.json(publicUser(user));
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.put("/api/profile/password", async ({ request }) => {
    try {
      const input = await body<{ currentPassword: string; password: string }>(
        request,
      );
      return await transaction(async (db) => {
        const session = requireUser(db, request),
          user = db.users.find((u) => u.id === session.user.id)!;
        if (
          (await passwordHash(input.currentPassword || "", user.salt)) !==
          user.passwordHash
        )
          throw new ApiFault(422, "Senha atual incorreta.", {
            currentPassword: "Confira a senha atual.",
          });
        if (!passwordValid(input.password || ""))
          throw new ApiFault(422, "Senha muito curta.", {
            password: "Use ao menos 8 caracteres, letras e números.",
          });
        user.salt = crypto.randomUUID();
        user.passwordHash = await passwordHash(input.password, user.salt);
        return HttpResponse.json({ updated: true });
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.get("/api/wallets", async ({ request }) => {
    try {
      const db = await database();
      return HttpResponse.json(
        db.wallets[requireUser(db, request).user.id] || [],
      );
    } catch (error) {
      return fail(error);
    }
  }),
  http.put("/api/wallets", async ({ request }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      const input = await body<Wallet>(request);
      return await transaction((db) => {
        const session = requireUser(db, request),
          fields: Record<string, string> = {};
        if (!input.label?.trim()) fields.label = "Dê um nome à carteira.";
        if (!["Ethereum", "Polygon", "Solana"].includes(input.network))
          fields.network = "Selecione uma rede válida.";
        if (
          !(
            input.network === "Solana"
              ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
              : /^0x[a-fA-F0-9]{40}$/
          ).test(input.address || "")
        )
          fields.address = "Endereço inválido para a rede selecionada.";
        const wallets = (db.wallets[session.user.id] ??= []);
        if (
          wallets.some(
            (w) =>
              w.address.toLowerCase() === input.address?.toLowerCase() &&
              w.network === input.network &&
              w.id !== input.id,
          )
        )
          fields.address = "Esta carteira já está cadastrada.";
        if (Object.keys(fields).length)
          throw new ApiFault(422, "Revise a carteira.", fields);
        if (input.id && !wallets.some((w) => w.id === input.id))
          throw new ApiFault(404, "Carteira não encontrada.");
        if (!input.id && wallets.length >= 2)
          throw new ApiFault(
            409,
            "Você pode cadastrar uma carteira principal e uma secundária.",
          );
        const wallet = {
          id: input.id || crypto.randomUUID(),
          label: input.label.trim(),
          address: input.address,
          network: input.network,
          primary: input.primary || !wallets.length,
        };
        if (wallet.primary)
          wallets.forEach((w) => {
            w.primary = false;
          });
        const index = wallets.findIndex((w) => w.id === wallet.id);
        if (index >= 0) wallets[index] = wallet;
        else wallets.push(wallet);
        if (!wallets.some((w) => w.primary)) wallets[0].primary = true;
        return HttpResponse.json(wallets);
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.get("/api/favorites", async ({ request }) => {
    try {
      const db = await database();
      return HttpResponse.json(
        db.favorites[requireUser(db, request).user.id] || [],
      );
    } catch (error) {
      return fail(error);
    }
  }),
  http.put("/api/favorites/:id", async ({ request, params }) => {
    await network(request);
    try {
      const { favorite } = await body<{ favorite: boolean }>(request);
      return await transaction((db) => {
        const user = requireUser(db, request).user;
        if (scenario() === "favorite-error")
          throw new ApiFault(
            503,
            "Não foi possível salvar o favorito. Tente novamente.",
          );
        if (!db.products.some((p) => p.id === params.id))
          throw new ApiFault(404, "NFT não encontrado.");
        const favorites = new Set(db.favorites[user.id] || []);
        if (favorite) favorites.add(String(params.id));
        else favorites.delete(String(params.id));
        db.favorites[user.id] = [...favorites];
        return HttpResponse.json(db.favorites[user.id]);
      });
    } catch (error) {
      return fail(error);
    }
  }),
];
