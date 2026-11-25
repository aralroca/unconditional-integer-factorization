import { expect, test, type Page } from "@playwright/test";

const M1279 = (2n ** 1279n - 1n).toString();
const RSA_100 =
  "1522605027922533360535618378132637429718068114961380688657908494580122963258952897654000350692006139";
const TWIN_BILLIONS = "1000000016000000063"; // 1000000007 × 1000000009
const SEMIPRIME_39 = "300000000000000438880000000000084056037";

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  return errors;
}

/** First visit installs the COOP/COEP service worker; after a reload the page is isolated. */
async function openIsolated(page: Page) {
  await page.goto("./");
  await expect.poll(() => isolateOnce(page), { timeout: 15_000 }).toBe(true);
}

async function isolateOnce(page: Page) {
  try {
    if (await page.evaluate(() => window.crossOriginIsolated)) return true;
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
  } catch {
    // coi-serviceworker reloaded the page itself in the meantime.
  }

  return false;
}

async function chooseMethod(page: Page, label: string) {
  await page.getByRole("combobox", { name: /Method/ }).selectOption({ label });
}

async function factorize(page: Page, value: string) {
  await page.getByLabel("Integer to factorize").fill(value);
  await page.getByRole("button", { name: "Factorize" }).click();
}

test.beforeEach(async ({ page }) => {
  await openIsolated(page);
});

test("shows the paper's bound as MathML", async ({ page }) => {
  const formula = page.locator("h1 math");

  await expect(formula).toBeVisible();
  await expect(formula.locator("msub")).toHaveText("LN");
  await expect(formula).toHaveText("LN[1/3,O(1)]");
});

test("factors a sample on the thread pool and lists the methods used", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.getByRole("button", { name: "2^67 − 1" }).click();

  await expect(page.getByTestId("factorization")).toHaveText("147573952589676412927 = 193707721 × 761838257287");
  await expect(page.getByText(/^2 distinct prime factors · .* on \d+ threads$/)).toBeVisible();
  await expect(page.getByTestId("methods")).toHaveText(
    /^Methods used: Trial division → .*Baillie–PSW primality test$/,
  );
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

test("shows live progress of the race between ECM and the quadratic sieve, then cancels", async ({ page }) => {
  const running = page.getByRole("list", { name: "Running now" });
  const errors = collectConsoleErrors(page);

  await factorize(page, RSA_100);

  await expect(running).toContainText("ECM (elliptic curves): racing the sieve for factors up to");
  await expect(running).toContainText(/Quadratic sieve \(SIQS\): \d+% of the relations/, { timeout: 45_000 });
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByRole("button", { name: "Factorize" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("status")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("explains what Auto runs and when", async ({ page }) => {
  const table = page.getByRole("region", { name: "What Auto runs, and when" }).getByRole("table");

  await expect(table.getByRole("rowheader")).toHaveText([
    "Trial division",
    "Pollard P−1",
    "ECM (elliptic curves)",
    "Quadratic sieve (SIQS)",
    "Baillie–PSW",
  ]);
  await expect(table.getByRole("row", { name: /Quadratic sieve/ }).locator("math")).toHaveText("LN[1/2,1]");
});

test("reports an engine that failed to load and recovers on the next run", async ({ page, context }) => {
  // The .wasm is fetched through the service worker, so block it for the whole context.
  await context.route("**/*.wasm", (route) => route.abort());
  await page.reload();
  await factorize(page, "3233");

  await expect(page.getByRole("main").getByRole("alert")).toHaveText(/could not be loaded/);

  await context.unroute("**/*.wasm");
  await page.getByRole("button", { name: "Factorize" }).click();

  await expect(page.getByTestId("factorization")).toHaveText("3233 = 53 × 61");
});

test("runs a single method on its own: Pollard rho", async ({ page }) => {
  await chooseMethod(page, "Pollard rho");
  await factorize(page, TWIN_BILLIONS);

  await expect(page.getByTestId("factorization")).toHaveText(`${TWIN_BILLIONS} = 1000000007 × 1000000009`);
  await expect(page.getByTestId("methods")).toHaveText("Methods used: Pollard rho → Baillie–PSW primality test");
});

test("Google's algorithm runs its first step, trial division, at browser sizes", async ({ page }) => {
  await chooseMethod(page, "Google's L_N[1/3, O(1)] algorithm (2026 paper)");
  await factorize(page, "1000002936999811");

  await expect(page.getByTestId("factorization")).toHaveText("1000002936999811 = 1000003 × 999999937");
  await expect(page.getByTestId("methods")).toHaveText(
    "Methods used: Google's algorithm (trial division below 2^10000) → Baillie–PSW primality test",
  );
});

test("trial division shows how far it is from √N, then cancels", async ({ page }) => {
  await chooseMethod(page, "Trial division");
  await factorize(page, SEMIPRIME_39);

  await expect(page.getByRole("list", { name: "Running now" })).toContainText("it may need up to √N ≈ 10^19", {
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Factorize" })).toBeVisible();
});

test("compares the estimated cost of every method, highlighting the chosen one", async ({ page }) => {
  const estimates = page.getByRole("region", { name: "Estimated cost for this number" });

  await page.getByLabel("Integer to factorize").fill(RSA_100);
  await chooseMethod(page, "Google's L_N[1/3, O(1)] algorithm (2026 paper)");

  await expect(estimates.getByRole("rowheader")).toHaveText([
    "Trial division",
    "Pollard rho",
    "Pollard P−1",
    "ECM (elliptic curves)",
    "Quadratic sieve (SIQS)",
    "Number Field Sieve",
    "Google's algorithm",
  ]);
  await expect(estimates.getByRole("row", { name: /Quadratic sieve/ })).toContainText("≈ 1015");
  await expect(estimates.locator('tr[aria-current="true"]')).toContainText("≈ 10861");
  await expect(estimates.locator('tr[aria-current="true"]')).toContainText("below 2^10000 it is trial division");
});

test("shows a composite part P−1 cannot split once, with its exponent", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const square = (BigInt("147573952589676412927") ** 2n).toString();

  await chooseMethod(page, "Pollard P−1");
  await factorize(page, square);

  await expect(page.getByTestId("factorization")).toHaveText(`${square} = 1475739525896764129272`);
  await expect(page.getByTestId("factorization").locator(".unfactored sup")).toHaveText("2");
  expect(errors).toEqual([]);
});
