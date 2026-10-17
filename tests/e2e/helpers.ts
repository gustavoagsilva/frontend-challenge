import { expect, type Page } from "@playwright/test";
export async function login(
  page: Page,
  redirect = "/perfil",
  email = "ana@kurio.test",
) {
  await page.goto("/login?redirect=" + encodeURIComponent(redirect));
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL((url) => url.pathname === redirect);
}
export async function addNft(page: Page) {
  await page.goto("/nfts/kurio-001");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.getByText("NFT adicionado ao carrinho.")).toBeVisible();
}
export async function reviewCheckout(page: Page) {
  await page.goto("/pagamento");
  await page.getByLabel("Cidade", { exact: true }).fill("São Paulo");
  await page.getByLabel("CEP", { exact: true }).fill("01001-000");
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Desconectar carteira" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revisar pedido", exact: true })
    .click();
  await expect(page.getByLabel("Revisão do pedido")).toBeVisible();
}
export async function scenario(page: Page, value: string) {
  await page.evaluate(
    (value) => localStorage.setItem("kurio:scenario", value),
    value,
  );
}
