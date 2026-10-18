import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("nft-card")).toHaveCount(9);
}
async function openFilters(page: Page) {
  const trigger = page.getByRole("button", { name: "Abrir filtros" });
  if (await trigger.isVisible()) {
    await trigger.click();
    return page.getByRole("dialog", { name: "Filtros do catálogo" });
  }
  return page.locator(".desktop-filters");
}
test("busca, filtros combinados, ordenação e histórico persistem na URL", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Página 2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  const filters = await openFilters(page);
  await filters.getByRole("button", { name: /Kurio Apes/ }).click();
  await filters.getByLabel("Ethereum").check();
  if (
    await page
      .getByRole("button", { name: "Ver resultados", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Ver resultados", exact: true })
      .click();
  await expect(page).toHaveURL(/page=1/);
  await expect(page.getByTestId("nft-card")).toHaveCount(3);
  await page.getByLabel("Ordenar NFTs").selectOption("price-asc");
  await expect(page.getByTestId("nft-card").first()).toContainText(
    "Emerald Ape",
  );
  await page
    .getByRole("textbox", { name: "Buscar NFTs", exact: true })
    .fill("Golden");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByTestId("nft-card")).toHaveCount(0);
  await expect(page.getByText("Nenhum NFT encontrado")).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId("nft-card")).toHaveCount(3);
  await page.reload();
  await expect(page.getByTestId("nft-card")).toHaveCount(3);
  await expect(page.getByLabel("Ordenar NFTs")).toHaveValue("price-asc");
});

test("preço é filtrado pela API e preço invertido recebe validação", async ({
  page,
}) => {
  await ready(page);
  const filters = await openFilters(page);
  await filters.getByLabel("Preço mínimo em ETH").fill("1e1");
  await filters.getByLabel("Preço máximo em ETH").fill("100");
  await filters.getByRole("button", { name: "Aplicar preço" }).click();
  await expect(filters.getByRole("alert")).toContainText(
    "sem notação exponencial",
  );
  await filters.getByLabel("Preço mínimo em ETH").fill("2");
  await filters.getByLabel("Preço máximo em ETH").fill("1");
  await filters.getByRole("button", { name: "Aplicar preço" }).click();
  await expect(filters.getByRole("alert")).toBeVisible();
  await filters.getByLabel("Preço mínimo em ETH").fill("1.19");
  await filters.getByLabel("Preço máximo em ETH").fill("1.19");
  await filters.getByRole("button", { name: "Aplicar preço" }).click();
  if (
    await page
      .getByRole("button", { name: "Ver resultados", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Ver resultados", exact: true })
      .click();
  await expect(page.getByTestId("nft-card")).toHaveCount(6);
  for (const card of await page.getByTestId("nft-card").all())
    await expect(card).toContainText("1.19 ETH");
});

test("detalhe aceita navegação, refresh e ID inexistente", async ({ page }) => {
  await ready(page);
  await page
    .getByRole("link", { name: "Ver Emerald Ape #042", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await page.goto("/nfts/inexistente");
  await expect(
    page.getByRole("heading", { name: "NFT não encontrado" }),
  ).toBeVisible();
});

test("carregamento lento mostra skeleton e falha permite recuperação", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kurio:scenario", "slow"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "Carregando catálogo" }),
  ).toBeVisible();
  await expect(page.getByTestId("nft-card")).toHaveCount(9);
  await page.evaluate(() => localStorage.setItem("kurio:scenario", "error"));
  await page
    .getByRole("textbox", { name: "Buscar NFTs", exact: true })
    .fill("Sage");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar",
  );
  await page.evaluate(() => localStorage.setItem("kurio:scenario", "success"));
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByTestId("nft-card")).toHaveCount(6);
});

test("resposta antiga não substitui a busca mais recente", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("kurio:scenario", "out-of-order"),
  );
  await ready(page);
  await page
    .getByRole("textbox", { name: "Buscar NFTs", exact: true })
    .fill("Sage");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar NFTs", exact: true })
    .fill("Emerald");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByTestId("nft-card")).toHaveCount(6);
  await page.waitForTimeout(1700); // Wait beyond the deterministic stale-response delay.
  for (const card of await page.getByTestId("nft-card").all())
    await expect(card).toContainText("Emerald");
});

test("diálogo prende foco, fecha com Escape e devolve foco ao botão", async ({
  page,
}) => {
  await ready(page);
  const trigger = page.getByRole("button", {
    name: "Receber novidades",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Nenhuma operação foi realizada");
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("início possui assets locais, sem overflow, e baseline visual", async ({
  page,
}) => {
  await ready(page);
  // Wait for the initial socket reconciliation before capturing the settled UI.
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await (await fetch("/api/__mock/status")).json()).connections,
      ),
    )
    .toBeGreaterThan(0);
  await expect(page.getByText(/Atualizando/)).toBeHidden();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) => {
        img.loading = "eager";
        return img.decode();
      }),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("img")
      .evaluateAll((images) =>
        images.every((img) => (img as HTMLImageElement).naturalWidth > 0),
      ),
  ).toBe(true);
  await expect(page).toHaveScreenshot("inicio.png", {
    fullPage: true,
    animations: "disabled",
    timeout: 15000,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page).toHaveScreenshot("inicio-tablet.png", {
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
