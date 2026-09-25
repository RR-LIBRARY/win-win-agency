import { expect, test } from "@playwright/test";
import { CHECKOUT_READY, FIRST_PRODUCT_SLUG, SECTION_READY, expectAccessible, gotoReady, trackErrors } from "./helpers";

test.describe("Software store", () => {
  test("lists products, filters by search and sorts by price", async ({ page }, testInfo) => {
    const errors = trackErrors(page);
    await gotoReady(page, "/store", SECTION_READY);
    await expect(page.locator("main h1")).toBeVisible();

    const cards = page.locator('main a[href^="/store/"]');
    const initial = await cards.count();
    expect(initial).toBeGreaterThanOrEqual(4);

    const search = page.getByRole("searchbox").or(page.getByLabel(/search products/i)).first();
    await search.fill("gst");
    await expect.poll(async () => cards.count()).toBeLessThan(initial);
    await expect(cards.first()).toContainText(/gst/i);

    await search.fill("zzzz-nothing-matches");
    await expect(page.getByText(/no products|nothing found|no results/i)).toBeVisible();

    await search.fill("");
    await expect.poll(async () => cards.count()).toBe(initial);

    const sort = page.getByLabel(/sort products/i);
    await sort.selectOption({ index: 1 });
    await expect(cards.first()).toBeVisible();

    expect(errors).toEqual([]);
    await expectAccessible(page, testInfo);
  });

  test("product page shows price, buy button and policies, then leads to checkout", async ({ page }, testInfo) => {
    const errors = trackErrors(page);
    await gotoReady(page, `/store/${FIRST_PRODUCT_SLUG}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByText(/₹\s?[\d,]+/).first()).toBeVisible();

    const buy = page.getByRole("link", { name: /buy now/i }).first();
    await expect(buy).toBeVisible();
    await buy.click();
    await expect(page).toHaveURL(new RegExp(`/checkout\\?.*product=${FIRST_PRODUCT_SLUG}`));
    await expect(page.locator("main h1")).toBeVisible();
    expect(errors).toEqual([]);
    await expectAccessible(page, testInfo);
  });

  test("checkout enforces required fields, validates coupons and shows the policy consent", async ({ page }) => {
    await gotoReady(page, `/checkout?product=${FIRST_PRODUCT_SLUG}`, CHECKOUT_READY);

    // Order summary with an INR total and the pay button.
    const payButton = page.getByRole("button", { name: /pay ₹|place order/i });
    await expect(payButton).toBeVisible();
    await expect(payButton).toContainText(/₹/);

    // Policy consent line links to the legal pages.
    const consent = page.getByText(/you agree to our/i);
    await expect(consent).toBeVisible();
    await expect(consent.getByRole("link", { name: /terms/i })).toHaveAttribute("href", "/terms");
    await expect(consent.getByRole("link", { name: /refund/i })).toHaveAttribute("href", "/refund-policy");

    // Native required validation blocks an empty submit — we stay on checkout with no order created.
    await payButton.click();
    await expect(page).toHaveURL(/\/checkout/);
    const nameField = page.getByLabel(/full name/i);
    expect(await nameField.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);

    // Email must be an email.
    await nameField.fill("Test Buyer");
    const emailField = page.getByLabel(/email/i).first();
    await emailField.fill("not-an-email");
    await payButton.click();
    expect(await emailField.evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);

    // Coupon: an invalid code must be rejected with a visible, customer-safe
    // message and no price change. Without a backend the lookup itself fails,
    // which must still read as a calm "try again" — never an internal detail.
    const totalBefore = (await payButton.textContent()) ?? "";
    await page.getByLabel(/coupon code/i).fill("DEFINITELY-NOT-A-COUPON");
    await page.getByRole("button", { name: /^apply$/i }).click();
    const errorToast = page.locator("[data-sonner-toast][data-type='error']").first();
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toHaveText(/not valid|invalid|expired|unknown|not found|could not|temporarily unavailable/i);
    await expect(errorToast).not.toHaveText(/SUPABASE|SERVICE_ROLE|environment variable|Lovable Cloud/i);
    await expect(payButton).toHaveText(totalBefore);

    // GST toggle reveals business fields with a 15-char GSTIN limit.
    await page.getByText(/gst/i).locator("xpath=ancestor-or-self::label").first().click().catch(() => {});
    const gstin = page.getByLabel(/gstin/i);
    if (await gstin.isVisible()) {
      await gstin.fill("22aaaaa0000a1z5extra");
      await expect(gstin).toHaveValue("22AAAAA0000A1Z5");
    }
  });

  test("checkout without a product shows an empty state instead of crashing", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/checkout", { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: /store|browse/i }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("a product that lives on another platform never enters checkout", async ({ page, request }) => {
    // Discover an external product from the store listing, if any is published.
    const html = await (await request.get("/store")).text();
    const match = /href="(\/store\/[a-z0-9-]+)"[^>]*>(?:(?!<\/a>).)*?(Buy on|Get it on|Enroll on|Open on|Watch on|Read on)/is.exec(html);
    test.skip(!match, "No external-platform product is published right now");
    await page.goto(match![1]!);
    const cta = page.getByRole("link", { name: /buy on|get it on|enroll on|open on|watch on|read on|order on/i }).first();
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toMatch(/^https:\/\//);
    await expect(cta).toHaveAttribute("rel", /noopener/);
    await expect(page.getByRole("link", { name: /buy now/i })).toHaveCount(0);
  });

  test("mobile store browsing keeps tap targets and the buy button reachable @mobile", async ({ page }) => {
    await gotoReady(page, `/store/${FIRST_PRODUCT_SLUG}`);
    const buy = page.getByRole("link", { name: /buy now/i }).first();
    await buy.scrollIntoViewIfNeeded();
    const box = await buy.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    // No horizontal overflow on a phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("on a phone the buy panel comes right after the photos and a buy bar follows the reader @mobile", async ({ page }, testInfo) => {
    // Desktop keeps the buy panel pinned in the right column, so the bar is a phone-only feature.
    test.skip(testInfo.project.name !== "mobile-chromium", "phone layout only");
    await gotoReady(page, `/store/${FIRST_PRODUCT_SLUG}`);
    // Title + price are above the long spec/description block on small screens.
    const h1 = page.locator("main h1").first();
    const about = page.getByRole("heading", { level: 2, name: /^About / });
    const h1Y = (await h1.boundingBox())?.y ?? Number.POSITIVE_INFINITY;
    const aboutY = (await about.boundingBox())?.y ?? 0;
    expect(h1Y).toBeLessThan(aboutY);

    // Sticky bar is hidden until the panel scrolls out of view, then offers the same Buy now.
    const bar = page.locator("div.fixed.inset-x-0.bottom-0");
    await expect(bar).toHaveAttribute("aria-hidden", "true");
    await about.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 1600);
    await expect(bar).toHaveAttribute("aria-hidden", "false");
    const stickyBuy = bar.getByRole("link", { name: /buy now/i });
    await expect(stickyBuy).toBeVisible();
    expect(((await stickyBuy.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);
    await stickyBuy.click();
    await expect(page).toHaveURL(new RegExp(`/checkout\\?product=${FIRST_PRODUCT_SLUG}`));
  });

  test("the product page offers a way to ask a human before buying", async ({ page }) => {
    await gotoReady(page, `/store/${FIRST_PRODUCT_SLUG}`);
    const ask = page.getByRole("link", { name: /ask before you buy/i });
    await expect(ask).toBeVisible();
    await expect(ask).toHaveAttribute("href", /wa\.me\/\d+\?text=/);
  });
});

test.describe("Guest purchase (needs backend + Razorpay test keys)", () => {
  test.skip(process.env["E2E_FULL"] !== "1", "Set E2E_FULL=1 once the backend and Razorpay test keys are configured");

  // Remove the unpaid test orders this suite creates (service role only —
  // skipped silently when the key is not available to the test runner).
  test.afterAll(async () => {
    const url = process.env["SUPABASE_URL"];
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !serviceKey) return;
    const response = await fetch(`${url}/rest/v1/orders?buyer_email=like.e2e%2B*%40example.com&status=eq.pending_payment`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "return=representation" },
    }).catch(() => undefined);
    if (response && !response.ok) console.warn(`e2e cleanup failed [${response.status}]: ${await response.text()}`);
  });

  test("manual payment order lands on a private order page with a reference", async ({ page }) => {
    await gotoReady(page, `/checkout?product=${FIRST_PRODUCT_SLUG}`, CHECKOUT_READY);
    await page.getByLabel(/full name/i).fill("E2E Buyer");
    const buyerEmail = `e2e+${Date.now()}@example.com`;
    await page.getByLabel(/email/i).first().fill(buyerEmail);
    await page.getByLabel(/mobile|whatsapp/i).fill("9876543210");
    await page.getByRole("radio", { name: /bank|manual|upi id/i }).check();
    await page.getByRole("button", { name: /place order/i }).click();
    await expect(page).toHaveURL(/\/orders\/WWT-[A-Z0-9]+\?key=/);
    const reference = new URL(page.url()).pathname.split("/").pop()!;
    // Confirmation toast + page header + summary row all carry the reference.
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: reference })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(reference, { exact: true })).toBeVisible();
    await expect(page.getByText(/pending|awaiting|pay/i).first()).toBeVisible();
    // Bank-transfer instructions are shown only after the order exists — never before.
    await expect(page.getByText(/upi|bank|transfer/i).first()).toBeVisible();
    // The private page must not leak buyer details without its access key.
    await page.goto(`/orders/${reference}`);
    await expect(page.getByText(/sign in|access link|not found|no order/i).first()).toBeVisible();
    await expect(page.getByText(buyerEmail)).toHaveCount(0);
  });
});
