import { expect, test } from "@playwright/test";
import { expectAccessible, gotoReady, trackErrors } from "./helpers";

const PAGES: { path: string; title: RegExp }[] = [
  { path: "/", title: /Win Win/i },
  { path: "/services", title: /services/i },
  { path: "/pricing", title: /pricing/i },
  { path: "/about", title: /about/i },
  { path: "/contact", title: /contact/i },
  { path: "/portfolio", title: /work|portfolio|showcase|projects/i },
  { path: "/assistant", title: /assistant/i },
  { path: "/terms", title: /terms/i },
  { path: "/privacy", title: /privacy/i },
  { path: "/refund-policy", title: /refund/i },
  { path: "/delivery-policy", title: /delivery/i },
];

for (const { path, title } of PAGES) {
  test(`${path} renders with a heading, unique title and no runtime errors`, async ({ page }, testInfo) => {
    const errors = trackErrors(page);
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status(), `HTTP status for ${path}`).toBe(200);
    await expect(page).toHaveTitle(title);
    const h1 = page.locator("main h1").first();
    await expect(h1).toBeVisible();
    expect(((await h1.textContent()) ?? "").trim().length).toBeGreaterThan(3);
    // Exactly one <main> landmark and one <h1> per page.
    await expect(page.locator("main")).toHaveCount(1);
    expect(await page.locator("h1").count()).toBe(1);
    // Every page must link to the four policies from the footer.
    const footer = page.locator("footer");
    for (const href of ["/terms", "/privacy", "/refund-policy", "/delivery-policy"]) {
      await expect(footer.locator(`a[href="${href}"]`)).toHaveCount(1);
    }
    expect(errors).toEqual([]);
    await expectAccessible(page, testInfo);
  });
}

test("header navigation reaches Services, Store, Pricing, Assistant and Contact", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation").first();
  for (const [label, path] of [
    ["Services", "/services"],
    ["Store", "/store"],
    ["Pricing", "/pricing"],
    ["Assistant", "/assistant"],
    ["Contact", "/contact"],
  ] as const) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}/?$`));
    await expect(page.locator("main h1").first()).toBeVisible();
  }
});

test("social sharing metadata is set per page", async ({ request }) => {
  const home = await (await request.get("/")).text();
  const pricing = await (await request.get("/pricing")).text();
  const ogTitle = (html: string) => /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/.exec(html)?.[1] ?? /content="([^"]+)"[^>]+property="og:title"/.exec(html)?.[1];
  expect(ogTitle(home)).toBeTruthy();
  expect(ogTitle(pricing)).toBeTruthy();
  expect(ogTitle(home)).not.toBe(ogTitle(pricing));
  expect(home).toMatch(/property="og:type"|name="twitter:card"/);
});

test("legacy /templates URLs redirect to the store", async ({ page }) => {
  await page.goto("/templates");
  await expect(page).toHaveURL(/\/store(\?type=notion_template)?\/?$/);
  await page.goto("/templates/gstbill-invoice-app");
  await expect(page).toHaveURL(/\/store\/gstbill-invoice-app$/);
});

test("unknown pages show a friendly not-found screen with a way back", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("link", { name: /home|back|store/i }).first()).toBeVisible();
});

test("the floating assistant opens, accepts a question and closes @mobile", async ({ page }) => {
  await gotoReady(page, "/");
  const launcher = page.getByRole("button", { name: /open assistant/i });
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
  const dialog = page.getByRole("dialog", { name: /win win assistant/i });
  await launcher.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox")).toBeVisible();
  await expect(dialog.getByRole("textbox")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();
});
