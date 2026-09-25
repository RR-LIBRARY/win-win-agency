/**
 * Static security audit that runs with every test run: fails the build if an
 * admin server function loses its auth check, a secret leaks into browser code,
 * or production security headers are removed.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const src = walk(join(ROOT, "src")).filter((p) => /\.(ts|tsx)$/.test(p));
const read = (p: string) => readFileSync(p, "utf8");

describe("authorization on server functions", () => {
  const fnFiles = src.filter((p) => p.endsWith(".functions.ts"));

  it("every admin* server function requires a session AND the admin role", () => {
    const offenders: string[] = [];
    for (const file of fnFiles) {
      const chunks = read(file).split(/(?=export const )/);
      for (const chunk of chunks) {
        const name = /^export const (\w+)/.exec(chunk)?.[1];
        if (!name || !/^admin|^(grantAdmin|revokeAdmin|listTeam|getAdminOverview)/.test(name)) continue;
        if (!chunk.includes("createServerFn")) continue;
        if (!chunk.includes("requireSupabaseAuth") || !chunk.includes("assertAdmin(")) offenders.push(`${file}:${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every POST server function validates its input", () => {
    const offenders: string[] = [];
    for (const file of fnFiles) {
      for (const chunk of read(file).split(/(?=export const )/)) {
        const name = /^export const (\w+)/.exec(chunk)?.[1];
        if (!name || !/createServerFn\(\{\s*method:\s*"POST"/.test(chunk)) continue;
        if (!chunk.includes(".inputValidator(") && /\.handler\(async \(\{\s*data/.test(chunk)) offenders.push(`${file}:${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the service-role client is never imported at module scope of a client-reachable file", () => {
    const offenders = src.filter((p) => !p.includes(".server.") && /^import .*client\.server/m.test(read(p)));
    expect(offenders).toEqual([]);
  });
});

describe("secrets exposure", () => {
  const SECRET = /(SUPABASE_SERVICE_ROLE_KEY|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|LOVABLE_API_KEY)/;

  it("browser code never reads secret env vars", () => {
    const browser = src.filter((p) => (p.includes("/components/") || (p.includes("/routes/") && !p.includes("/routes/api/"))) && !p.includes(".server."));
    const offenders = browser.filter((p) => new RegExp(`(import\\.meta\\.env|process\\.env)[^\\n]*${SECRET.source}`).test(read(p)));
    expect(offenders).toEqual([]);
  });

  it("no VITE_-prefixed secret (VITE_ vars ship to the browser)", () => {
    const offenders = src.filter((p) => /VITE_[A-Z_]*(SECRET|SERVICE_ROLE|PRIVATE)/.test(read(p)));
    expect(offenders).toEqual([]);
  });

  it("no hard-coded live keys or JWT service tokens in source", () => {
    const offenders = src.filter((p) => /rzp_live_[A-Za-z0-9]{8,}|sk_live_|"role":"service_role"|sb_secret_[A-Za-z0-9]/.test(read(p)));
    expect(offenders).toEqual([]);
  });

  it(".env files are git-ignored", () => {
    expect(read(join(ROOT, ".gitignore"))).toMatch(/^\.env$/m);
  });
});

describe("Vercel production headers", () => {
  const cfg = JSON.parse(read(join(ROOT, "vercel.json"))) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const all = Object.fromEntries(cfg.headers.find((h) => h.source === "/(.*)")!.headers.map((h) => [h.key.toLowerCase(), h.value]));

  it.each([
    ["x-frame-options", /SAMEORIGIN|DENY/],
    ["x-content-type-options", /^nosniff$/],
    ["referrer-policy", /strict-origin/],
    ["strict-transport-security", /max-age=(\d{8,})/],
    ["content-security-policy", /frame-ancestors 'self'.*object-src 'none'/],
    ["permissions-policy", /camera=\(\)/],
    ["cross-origin-opener-policy", /same-origin/],
  ])("%s is set correctly", (key, re) => {
    expect(all[key]).toMatch(re);
  });

  it("HSTS lasts at least one year", () => {
    const age = Number(/max-age=(\d+)/.exec(all["strict-transport-security"] ?? "")?.[1]);
    expect(age).toBeGreaterThanOrEqual(31_536_000);
  });

  it("API responses are never cached by shared caches", () => {
    const api = cfg.headers.find((h) => h.source.startsWith("/api"));
    expect(api?.headers.find((h) => h.key === "Cache-Control")?.value).toBe("no-store");
  });
});
