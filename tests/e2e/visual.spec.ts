import { test, expect, type Page } from "@playwright/test";
import { login, addNft, reviewCheckout } from "./helpers";
async function assets(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) => {
        img.loading = "eager";
        return img.decode();
      }),
    );
  });
}
async function visual(page: Page, name: string) {
  await assets(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: "disabled",
  });
  const original = page.viewportSize()!;
  await page.setViewportSize({ width: 768, height: 1024 });
  await assets(page);
  await expect(page).toHaveScreenshot("tablet-" + name, {
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize(original);
}
test("detalhe, carrinho e pagamento possuem baselines e suportam tablet", async ({
  page,
}) => {
  await addNft(page);
  await page.reload();
  await expect(page.locator(".detail-price")).toHaveText("1.19 ETH");
  await visual(page, "detalhe.png");
  await page.goto("/carrinho");
  await expect(page.getByTestId("quote-total")).toHaveText("1.206 ETH");
  await visual(page, "carrinho.png");
  await login(page, "/pagamento");
  await reviewCheckout(page);
  await visual(page, "pagamento.png");
});
