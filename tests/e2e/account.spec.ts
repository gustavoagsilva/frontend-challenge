import { test, expect, type Page } from "@playwright/test";

export async function login(
  page: Page,
  email = "ana@kurio.test",
  password = "Kurio123!",
) {
  await page.goto("/login?redirect=/perfil");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/perfil");
}
test("login, perfil, senha, logout e isolamento entre usuários", async ({
  page,
}) => {
  await login(page);
  await page.getByLabel("Nome de usuário").fill("Ana Colecionadora");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Perfil atualizado");
  await page.reload();
  await expect(page.getByLabel("Nome de usuário")).toHaveValue(
    "Ana Colecionadora",
  );
  await page.getByLabel("Senha atual", { exact: true }).fill("Kurio123!");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123!");
  await page.getByLabel("Confirmar nova senha").fill("NovaSenha123!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(
    page.getByText("Senha alterada.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await login(page, "bruno@kurio.test");
  await expect(page.getByLabel("Nome de usuário")).toHaveValue("Bruno Costa");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await login(page, "ana@kurio.test", "NovaSenha123!");
  await expect(page.getByLabel("Nome de usuário")).toHaveValue(
    "Ana Colecionadora",
  );
});
test("cadastro, conflito e retorno à rota protegida", async ({ page }) => {
  await page.goto("/carteiras");
  await expect(page).toHaveURL(/login/);
  await page.getByRole("link", { name: "Crie uma conta", exact: true }).click();
  await page.getByLabel("Nome de usuário").fill("Nova Pessoa");
  await page.getByLabel("E-mail", { exact: true }).fill("nova@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page.getByLabel("Confirmar senha", { exact: true }).fill("Kurio123!");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page).toHaveURL(/carteiras$/);
  await page.getByLabel("Nome da carteira").fill("Minha carteira");
  await page.getByLabel("Endereço da carteira").fill("inválido");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(
    page.getByText("Endereço inválido para a rede selecionada."),
  ).toBeVisible();
  await page.getByLabel("Endereço da carteira").fill("0x" + "f".repeat(40));
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByText("Carteira salva.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Minha carteira/ }),
  ).toBeVisible();
});
test("favorito persistente e rollback de falha", async ({ page }) => {
  await login(page);
  await page.goto("/");
  const favorite = page.getByRole("button", {
    name: "Favoritar kurio-001",
    exact: true,
  });
  await favorite.click();
  await expect(
    page.getByRole("button", { name: "Remover favorito kurio-001" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Remover favorito kurio-001" }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remover favorito kurio-001" }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("kurio:scenario", "favorite-error"),
  );
  await page
    .getByRole("button", { name: "Remover favorito kurio-001" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await expect(
    page.getByRole("button", { name: "Remover favorito kurio-001" }),
  ).toHaveAttribute("aria-pressed", "true");
});
