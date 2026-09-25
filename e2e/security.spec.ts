import { expect, test } from "@playwright/test";

test.describe("Payment webhook endpoint", () => {
  test("rejects requests without a valid Razorpay signature and never processes them", async ({ request }) => {
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_forged", amount: 100 } } } });

    const unsigned = await request.post("/api/public/webhooks/razorpay", { data: body, headers: { "content-type": "application/json" } });
    expect([400, 503]).toContain(unsigned.status());
    expect(await unsigned.json()).toMatchObject({ ok: false });

    const forged = await request.post("/api/public/webhooks/razorpay", {
      data: body,
      headers: { "content-type": "application/json", "x-razorpay-signature": "0".repeat(64), "x-razorpay-event-id": "evt_forged" },
    });
    expect([401, 503]).toContain(forged.status());
    expect(await forged.json()).toMatchObject({ ok: false });
  });

  test("refuses oversized payloads", async ({ request }) => {
    const huge = "x".repeat(600 * 1024);
    const response = await request.post("/api/public/webhooks/razorpay", {
      data: huge,
      headers: { "content-type": "application/json", "x-razorpay-signature": "0".repeat(64) },
    });
    expect([401, 413, 503]).toContain(response.status());
  });

  test("GET is only a health check — it never processes anything or renders HTML", async ({ request }) => {
    const response = await request.get("/api/public/webhooks/razorpay");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toMatchObject({ ok: true, accepts: ["POST"] });
  });
});

test.describe("Licence verification endpoint", () => {
  test("answers pre-flight requests so desktop software can call it", async ({ request, baseURL }) => {
    // In development the Vite server answers pre-flights itself and only
    // allows local origins; in production the route handler answers with "*".
    // Use a local origin so both environments must return an allow header.
    const origin = new URL(baseURL ?? "http://localhost:8080").origin;
    const response = await request.fetch("/api/public/license/verify", {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "POST" },
    });
    expect([200, 204]).toContain(response.status());
    expect(["*", origin]).toContain(response.headers()["access-control-allow-origin"]);
  });

  test("rejects invalid bodies and malformed keys without touching the database", async ({ request }) => {
    const bad = await request.post("/api/public/license/verify", { data: "{oops", headers: { "content-type": "application/json" } });
    expect(bad.status()).toBe(400);
    expect(await bad.json()).toMatchObject({ valid: false, reason: "invalid_request" });

    const injected = await request.post("/api/public/license/verify", { data: { key: "WWD-AAAA' OR 1=1 --", activate: true } });
    expect(injected.status()).toBe(200);
    expect(await injected.json()).toMatchObject({ valid: false, reason: "malformed" });

    const tooLong = await request.post("/api/public/license/verify", { data: { key: "W".repeat(500) } });
    expect(tooLong.status()).toBe(400);
  });
});

test.describe("Private pages", () => {
  test("order pages need the secret access link", async ({ page }) => {
    await page.goto("/orders/WWT-NOPE1234");
    await expect(page.getByText(/not found|sign in|access link|expired|no order/i).first()).toBeVisible();
    await expect(page.getByText(/invoice number/i)).toHaveCount(0);
  });

  test("account and admin areas redirect signed-out visitors to sign in", async ({ page }) => {
    for (const path of ["/account", "/account/orders", "/admin", "/admin/payments", "/admin/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test("the sign-in page never leaks server secrets into the browser bundle", async ({ page }) => {
    await page.goto("/auth");
    const html = await page.content();
    for (const needle of ["SERVICE_ROLE", "sb_secret_", "RAZORPAY_KEY_SECRET", "LOVABLE_API_KEY", "whsec_"]) {
      expect(html, `${needle} must never appear in HTML`).not.toContain(needle);
    }
  });
});

test.describe("Security headers & responses", () => {
  test("HTML pages are served with sensible content types and no server stack traces", async ({ request }) => {
    for (const path of ["/", "/store", "/checkout?product=does-not-exist"]) {
      const response = await request.get(path);
      expect(response.headers()["content-type"]).toContain("text/html");
      const body = await response.text();
      expect(body).not.toMatch(/at .*node_modules|Error: .*\n\s+at /);
    }
  });
});
