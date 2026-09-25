import { expect, test } from "@playwright/test";
import { SECTION_READY, expectAccessible, gotoReady, trackErrors } from "./helpers";

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

test("Find your fit gives an honest recommendation in three clicks and is keyboard-friendly @mobile", async ({ page }, testInfo) => {
  await gotoReady(page, "/", SECTION_READY);
  const finder = page.getByRole("region", { name: /answer three questions/i });
  await finder.scrollIntoViewIfNeeded();
  await expect(finder.getByText("Step 1 of 3")).toBeVisible();

  const pick = (label: string) => finder.locator("label", { hasText: label }).first().click();
  await pick("Organise my work in Notion");
  await expect(finder.getByText("Step 2 of 3")).toBeVisible();
  await pick("Under ₹5,000");
  await pick("This week");

  // A small budget is pointed at the store, not upsold to a custom build.
  const result = finder.getByRole("status");
  await expect(result.getByRole("heading", { level: 3 })).toHaveText(/ready-made from the store/i);
  await expect(result.getByRole("link", { name: /browse the store/i })).toHaveAttribute("href", /\/store\?type=notion_template/);
  await expect(result.getByRole("link", { name: /whatsapp/i })).toHaveAttribute("href", /wa\.me\/\d+\?text=/);

  // Start over, answer with the keyboard only: arrow keys move between radio options.
  await result.getByRole("button", { name: /start over/i }).click();
  await expect(finder.getByText("Step 1 of 3")).toBeVisible();
  await finder.locator("input[name='fit-goal']").first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(finder.getByText("Step 2 of 3")).toBeVisible();
  await finder.getByRole("button", { name: /back/i }).click();
  await expect(finder.getByText("Step 1 of 3")).toBeVisible();

  // Pricier goal + healthy budget books a real package with the total shown.
  await pick("Launch or redo a website");
  await pick("₹30,000 – ₹1,00,000");
  await pick("Within a month");
  await expect(result.getByRole("heading", { level: 3 })).toHaveText(/Websites — Standard/);
  await expect(result.getByText("₹34,999")).toBeVisible();
  await expect(result.getByRole("link", { name: /book standard/i })).toHaveAttribute("href", /\/book\?service=websites&pkg=web-standard/);
  await expectAccessible(page, testInfo);
});

test("the contact page explains what happens next and never shows internal notes", async ({ page }) => {
  await gotoReady(page, "/contact");
  await expect(page.getByRole("heading", { name: /what happens after you write/i })).toBeVisible();
  await expect(page.getByText(/within one working day/i).first()).toBeVisible();
  await expect(page.getByText(/admin panel/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /whatsapp us/i }).first()).toHaveAttribute("href", /wa\.me\/\d+\?text=/);
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
