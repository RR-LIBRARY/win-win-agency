import { expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Navigates and waits until React is interactive (the root layout sets
 * html[data-hydrated]). Clicking server-rendered buttons/forms before that
 * point is a no-op or a native GET submit — the classic flaky-test trap.
 *
 * Content inside Suspense boundaries hydrates on its own schedule, so pass
 * `readySelector` (e.g. "form[data-ready='true']") for forms that expose one.
 */
export async function gotoReady(page: Page, path: string, readySelector?: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.waitForSelector("html[data-hydrated='true']", { state: "attached", timeout: 30_000 });
  if (readySelector) await page.waitForSelector(readySelector, { state: "attached", timeout: 30_000 });
}

export const CHECKOUT_READY = "form[data-ready='true']";
/** Any interactive section that flags itself hydrated (store filters, Find-your-fit wizard). */
export const SECTION_READY = "[data-ready='true']";

/** Collects console errors + page crashes so every spec can assert a clean run. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Third-party noise we do not own (blocked trackers, favicon 404s in dev).
    if (/favicon|net::ERR_BLOCKED_BY_CLIENT|Download the React DevTools/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

/** Runs axe-core on the current page and fails on serious/critical WCAG A/AA violations. */
export async function expectAccessible(page: Page, testInfo: TestInfo, options: { disable?: string[] } = {}) {
  const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]);
  if (options.disable?.length) builder.disableRules(options.disable);
  const results = await builder.analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  if (results.violations.length) {
    await testInfo.attach("axe-violations.json", {
      body: JSON.stringify(results.violations, null, 2),
      contentType: "application/json",
    });
  }
  const summary = blocking
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.slice(0, 3).map((n) => `  - ${n.target.join(" ")}`).join("\n")}`)
    .join("\n\n");
  expect(blocking, summary).toEqual([]);
}

export const FIRST_PRODUCT_SLUG = "gstbill-invoice-app";
