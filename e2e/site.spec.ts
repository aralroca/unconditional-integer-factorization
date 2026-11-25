import { expect, test, type Page } from "@playwright/test";

const M1279 = (2n ** 1279n - 1n).toString();
const RSA_100 =
  "1522605027922533360535618378132637429718068114961380688657908494580122963258952897654000350692006139";

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  return errors;
}

async function factorize(page: Page, value: string) {
  await page.getByLabel("Integer to factorize").fill(value);
  await page.getByRole("button", { name: "Factorize" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
});

test("shows the paper's bound as MathML", async ({ page }) => {
  const formula = page.locator("h1 math");

  await expect(formula).toBeVisible();
  await expect(formula.locator("msub")).toHaveText("LN");
  await expect(formula).toHaveText("LN[1/3,O(1)]");
});

test("factors a sample with the WebAssembly engine", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.getByRole("button", { name: "2^67 − 1" }).click();

  await expect(page.getByTestId("factorization")).toHaveText("147573952589676412927 = 193707721 × 761838257287");
  await expect(page.getByText(/^2 distinct prime factors · /)).toBeVisible();
  expect(errors).toEqual([]);
});

test("shows repeated primes as powers", async ({ page }) => {
  await factorize(page, "1_000_000");

  await expect(page.getByTestId("factorization")).toHaveText("1000000 = 26 × 56");
  await expect(page.getByTestId("factorization").locator("sup")).toHaveText(["6", "6"]);
});

test("recognises a 1279-bit prime", async ({ page }) => {
  await factorize(page, M1279);

  await expect(page.getByText(/^prime · /)).toBeVisible();
});

test("explains invalid input", async ({ page }) => {
  await factorize(page, "12a");

  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Enter an integer greater than 1.");
});

test("cancels a long factorization", async ({ page }) => {
  await factorize(page, RSA_100);
  await expect(page.getByRole("status")).toContainText("Factoring");
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByRole("button", { name: "Factorize" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("status")).toHaveCount(0);
});
