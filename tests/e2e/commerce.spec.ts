import { test, expect } from "@playwright/test";
import { addNft, login, reviewCheckout, scenario } from "./helpers";
test("carrinho visitante, quantidade, cupom, login e compra confirmada", async ({
  page,
}) => {
  await addNft(page);
  await page.goto("/carrinho");
  await page.getByRole("button", { name: /Aumentar quantidade/ }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Carrinho atualizado" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("output")).toHaveText("2");
  await page.getByLabel("Código promocional").fill("EXPIRED");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.getByText("Este cupom expirou.")).toBeVisible();
  await page.getByLabel("Código promocional").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.getByTestId("quote-total")).toContainText("2.158");
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("E-mail", { exact: true }).fill("ana@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/pagamento");
  await reviewCheckout(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seus NFTs chegaram!" }),
  ).toBeVisible({ timeout: 15000 });
  const id = await page.getByTestId("order-id").textContent();
  const total = await page.getByTestId("quote-total").textContent();
  await page.reload();
  await expect(page.getByTestId("order-id")).toHaveText(id!);
  await expect(page.getByTestId("quote-total")).toHaveText(total!);
  await page.goto("/carrinho");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio." }),
  ).toBeVisible();
});
test("preço alterado exige nova revisão e recusa mantém carrinho", async ({
  page,
}) => {
  await login(page);
  await addNft(page);
  await reviewCheckout(page);
  await scenario(page, "price-changed");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByText(
      "Preço ou disponibilidade mudou. Revise o carrinho antes de confirmar.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("quote-total")).toContainText("2.506");
  await page
    .getByRole("button", { name: "Revisar pedido", exact: true })
    .click();
  await scenario(page, "payment-declined");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "Transação simulada" }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Voltar ao carrinho", exact: true })
    .click();
  await expect(page.locator(".cart-line")).toHaveCount(1);
});
test("timeout após criação recupera a mesma tentativa após refresh", async ({
  page,
}) => {
  await login(page);
  await addNft(page);
  await reviewCheckout(page);
  await scenario(page, "order-timeout");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recuperar tentativa de compra" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Recuperar pedido", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seus NFTs chegaram!" }),
  ).toBeVisible({ timeout: 15000 });
  await page.goto("/pedidos");
  await expect(page.locator(".orders-list > a")).toHaveCount(1);
});
test("carteira recusada, rede incorreta e desconexão bloqueiam compra", async ({
  page,
}) => {
  await login(page);
  await addNft(page);
  await page.goto("/pagamento");
  await scenario(page, "wallet-rejected");
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await expect(page.getByText(/Conexão recusada na carteira/)).toBeVisible();
  await scenario(page, "wrong-network");
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await expect(page.getByText(/Rede incompatível/)).toBeVisible();
  await scenario(page, "success");
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desconectar carteira", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Revisar pedido", exact: true }),
  ).toBeDisabled();
});
