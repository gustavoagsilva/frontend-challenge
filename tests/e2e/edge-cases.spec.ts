import { test, expect } from "@playwright/test";
import { login, addNft, reviewCheckout, scenario } from "./helpers";
test("avatar validado e persistido, conflito de perfil e edição da carteira secundária", async ({
  page,
}) => {
  await login(page);
  await page
    .getByLabel("Avatar", { exact: true })
    .setInputFiles({
      name: "avatar.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await expect(
    page.getByText("Use PNG, JPG ou WebP de até 500 KB."),
  ).toBeVisible();
  await page
    .getByLabel("Avatar", { exact: true })
    .setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil atualizado.")).toBeVisible();
  await page.reload();
  await expect(page.getByAltText("Seu avatar")).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("bruno@kurio.test");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Senha atual", { exact: true }).fill("errada");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123!");
  await page.getByLabel("Confirmar nova senha").fill("NovaSenha123!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(page.getByText("Senha atual incorreta.")).toBeVisible();
  await page.goto("/carteiras");
  await page
    .getByRole("button", { name: "Editar carteira Reserva", exact: true })
    .click();
  await page.getByLabel("Nome da carteira").fill("Viagens");
  await page.getByLabel("Usar como principal").check();
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByText("Carteira salva.")).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator(".wallet-card")
      .filter({ hasText: "Viagens" })
      .locator(".inline-badge"),
  ).toHaveText("Principal");
  await expect(page.locator(".inline-badge")).toHaveCount(1);
});
test("cadastro conflita com conta existente sem criar sessão", async ({
  page,
}) => {
  await page.goto("/cadastro");
  await page.getByLabel("Nome de usuário").fill("Outro nome");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page.getByLabel("Confirmar senha", { exact: true }).fill("Kurio123!");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page.getByText("Este e-mail já está cadastrado.")).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
test("edição esgotada, limite, remoção e cupom removido", async ({ page }) => {
  await addNft(page);
  await expect(
    page.getByRole("button", { name: "1/1 · esgotada", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: /Aumentar quantidade/ })
    .click({ clickCount: 1 });
  await page.goto("/carrinho");
  await page.getByLabel("Código promocional").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await page
    .getByRole("button", { name: "Remover cupom", exact: true })
    .click();
  await expect(page.getByTestId("quote-total")).toHaveText("1.206 ETH");
  await page.getByRole("button", { name: /Remover Emerald/ }).click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio." }),
  ).toBeVisible();
});
test("evento no checkout invalida revisão, clique repetido produz apenas um pedido", async ({
  page,
}) => {
  await login(page);
  await addNft(page);
  await reviewCheckout(page);
  await page.evaluate(async () =>
    fetch("/api/__mock/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-nft", price: "1.75" }),
    }),
  );
  await expect(
    page.getByText(/Preço ou disponibilidade atualizados/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("quote-total")).toHaveText("1.766 ETH");
  await page
    .getByRole("button", { name: "Revisar pedido", exact: true })
    .click();
  await scenario(page, "pending");
  // Two clicks in the same browser task exercise the synchronous submission guard.
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(
    page.getByRole("heading", { name: "Pedido em processamento" }),
  ).toBeVisible();
  const id = await page.getByTestId("order-id").innerText();
  await page.evaluate(
    async (id) =>
      fetch("/api/__mock/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settle", orderId: id }),
      }),
    id,
  );
  await expect(
    page.getByRole("heading", { name: "Seus NFTs chegaram!" }),
  ).toBeVisible();
  const total = await page.getByTestId("quote-total").innerText();
  await page.evaluate(async () =>
    fetch("/api/__mock/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-nft", price: "8.88" }),
    }),
  );
  await page.reload();
  await expect(page.getByTestId("quote-total")).toHaveText(total);
  await page.goto("/pedidos");
  await expect(page.locator(".orders-list > a")).toHaveCount(1);
});
test("estoque esgotado durante revisão bloqueia envio e preserva item", async ({
  page,
}) => {
  await login(page);
  await addNft(page);
  await reviewCheckout(page);
  await page.evaluate(async () =>
    fetch("/api/__mock/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-nft", available: 0 }),
    }),
  );
  await expect(
    page.getByRole("button", { name: "Revisar pedido", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "A disponibilidade mudou. Ajuste as quantidades no carrinho.",
    ),
  ).toBeVisible();
  await page.goto("/carrinho");
  await expect(page.locator(".cart-line")).toHaveCount(1);
  await expect(
    page.getByText("Disponível: 0. Ajuste ou remova."),
  ).toBeVisible();
});
