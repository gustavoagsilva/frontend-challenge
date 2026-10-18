import { test, expect, type Page } from "@playwright/test";
import { login, addNft, reviewCheckout, scenario } from "./helpers";
async function action(page: Page, input: Record<string, unknown>) {
  return page.evaluate(async (input) => {
    const response = await fetch("/api/__mock/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return response.json();
  }, input);
}
test("Socket.IO atualiza preço e estoque, ignora duplicatas e reconcilia ao reconectar", async ({
  page,
}) => {
  await page.goto("/nfts/kurio-001");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await (await fetch("/api/__mock/status")).json()).connections,
      ),
    )
    .toBe(1);
  await action(page, { action: "update-nft", price: "3.25", available: 2 });
  await expect(page.locator(".detail-price")).toHaveText("3.25 ETH");
  await expect(page.locator(".product-facts")).toContainText("2 unidades");
  let reads = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/nfts/kurio-001") reads++;
  });
  await action(page, { action: "duplicates" });
  await page.waitForTimeout(400);
  expect(reads).toBe(0);
  await action(page, { action: "disconnect" });
  // Reconciliation reads current REST state even if no update was delivered.
  await page.evaluate(() => {
    const key = "kurio:database:v2";
    const db = JSON.parse(localStorage.getItem(key)!);
    db.products[0].price = "4.25";
    db.products[0].editions[0].price = "4.25";
    db.products[0].version++;
    localStorage.setItem(key, JSON.stringify(db));
  });
  await expect(page.locator(".detail-price")).toHaveText("4.25 ETH", {
    timeout: 15000,
  });
});
test("pedido pendente recupera por refresh, confirma por evento e é privado", async ({
  page,
}) => {
  await login(page);
  await addNft(page);
  await reviewCheckout(page);
  await scenario(page, "pending");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pedido em processamento" }),
  ).toBeVisible();
  const id = await page.getByTestId("order-id").innerText();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pedido em processamento" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Transação simulada" }),
  ).toHaveCount(0);
  await action(page, { action: "settle", orderId: id });
  await expect(
    page.getByRole("heading", { name: "Seus NFTs chegaram!" }),
  ).toBeVisible();
  await login(page, "/perfil", "bruno@kurio.test");
  await page.goto("/pedidos/" + id);
  await expect(
    page.getByText("Este pedido pertence a outro colecionador."),
  ).toBeVisible();
  await page.goto("/pedidos");
  await expect(
    page.getByRole("heading", { name: "Você ainda não fez uma compra." }),
  ).toBeVisible();
});
test("expiração preserva carrinho e rascunho e retorna após autenticação", async ({
  page,
}) => {
  await login(page);
  await addNft(page);
  await reviewCheckout(page);
  await action(page, { action: "expire" });
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("E-mail", { exact: true }).fill("ana@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/pagamento");
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue(
    "São Paulo",
  );
  await expect(page.locator(".line-summary")).toContainText("Emerald Ape");
  await expect(
    page.getByRole("button", { name: "Revisar pedido", exact: true }),
  ).toBeDisabled();
});
