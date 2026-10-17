import { http, HttpResponse } from "msw";
import { transaction } from "./database";
import {
  ApiFault,
  body,
  fail,
  network,
  requireUser,
  scenario,
} from "./network";

export const connectionHandlers = [
  http.post("/api/wallet-connection", async ({ request }) => {
    const failure = await network(request);
    if (failure) return failure;
    try {
      const input = await body<{ walletId: string; provider: string }>(request);
      return await transaction((db) => {
        const session = requireUser(db, request);
        const wallet = db.wallets[session.user.id]?.find(
          (w) => w.id === input.walletId,
        );
        if (!wallet)
          throw new ApiFault(422, "Selecione uma carteira cadastrada.");
        if (
          !["MetaMask", "WalletConnect", "Coinbase Wallet"].includes(
            input.provider,
          )
        )
          throw new ApiFault(422, "Provedor não suportado.");
        if (scenario() === "wallet-rejected")
          throw new ApiFault(
            400,
            "Conexão recusada na carteira. Tente novamente quando estiver pronto.",
          );
        if (scenario() === "wrong-network")
          throw new ApiFault(
            409,
            "Rede incompatível. Selecione a rede cadastrada da carteira.",
          );
        db.connections[session.token] = {
          walletId: wallet.id,
          provider: input.provider,
        };
        return HttpResponse.json({
          connected: true,
          walletId: wallet.id,
          network: wallet.network,
        });
      });
    } catch (error) {
      return fail(error);
    }
  }),
  http.delete("/api/wallet-connection", async ({ request }) => {
    try {
      return await transaction((db) => {
        const session = requireUser(db, request);
        delete db.connections[session.token];
        return HttpResponse.json({ connected: false });
      });
    } catch (error) {
      return fail(error);
    }
  }),
];
