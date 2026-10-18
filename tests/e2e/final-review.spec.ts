import { test, expect } from "@playwright/test";
import { addNft, login, reviewCheckout, scenario } from "./helpers";

test("falha de rede no favorito desfaz a alteração otimista", async ({
  page,
}) => {
  await login(page);
  await page.goto("/");
  const favorite = page.getByRole("button", {
    name: "Favoritar kurio-001",
    exact: true,
  });
  await expect(favorite).toBeEnabled();
  await scenario(page, "offline");
  await favorite.click();
  await expect(page.getByRole("dialog")).toContainText("Falha de conexão");
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await scenario(page, "success");
  await page.reload();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
});

test("resposta de perfil anterior não substitui a sessão de outra aba", async ({
  page,
  context,
}) => {
  await login(page);
  await page.getByLabel("Nome de usuário").fill("Ana atualizada");
  await scenario(page, "slow");
  const sent = page.waitForRequest(
    (request) =>
      request.method() === "PATCH" && request.url().endsWith("/api/profile"),
  );
  const finished = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith("/api/profile"),
  );
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await sent;
  await scenario(page, "success");
  const other = await context.newPage();
  await login(other, "/perfil", "bruno@kurio.test");
  expect((await finished).status()).toBe(200);
  await expect(page.getByLabel("Nome de usuário")).toHaveValue("Bruno Costa");
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue(
    "bruno@kurio.test",
  );
  await other.close();
});

test("erro ao atualizar carrinho no checkout não aparenta carrinho vazio", async ({
  page,
}) => {
  await login(page);
  await addNft(page);
  await reviewCheckout(page);
  await scenario(page, "error");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByRole("alert")).toContainText(
    "Serviço temporariamente indisponível",
    { timeout: 15000 },
  );
  await expect(
    page.getByText("Adicione NFTs ao carrinho para continuar."),
  ).toHaveCount(0);
  await scenario(page, "success");
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.locator(".order-summary")).toContainText("Emerald Ape");
});

test("todas as telas permitem acesso direto, refresh e reflow", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  await addNft(page);
  await reviewCheckout(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seus NFTs chegaram!" }),
  ).toBeVisible();
  const receipt = new URL(page.url()).pathname;
  await addNft(page);
  const screens = [
    ["/", "SEJA DONO DO FUTURO"],
    ["/nfts/kurio-001", "Emerald Ape #042"],
    ["/carrinho", "Carrinho de NFTs"],
    ["/pagamento", "Pagamento com carteira"],
    ["/perfil", "Perfil do colecionador"],
    ["/carteiras", "Minhas carteiras"],
    ["/favoritos", "Favoritos"],
    ["/pedidos", "Meus pedidos"],
    [receipt, "Seus NFTs chegaram!"],
    ["/login", "Entrar"],
    ["/cadastro", "Criar perfil de colecionador"],
  ];
  // 720 CSS px covers the layout viewport of a 1440 px window at 200% zoom.
  for (const width of [390, 720, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, heading] of screens) {
      await page.goto(path);
      await expect(page.locator("main")).toContainText(heading);
      if (path === "/")
        await expect(page.getByTestId("nft-card")).toHaveCount(9);
      if (path === "/carteiras")
        await expect(page.locator(".wallet-card")).toHaveCount(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path + " at " + width,
      ).toBe(true);
    }
  }
  await page.goto("/rota-inexistente");
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
});
