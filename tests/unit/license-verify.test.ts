import { beforeEach, describe, expect, it } from "vitest";
import { verifyLicense } from "@/lib/payments/license-verify.server";
import { createFakeSupabase, type FakeDb } from "./helpers/fake-supabase";
import { ORDER_ID, TEMPLATE_ID, makeTemplate } from "./helpers/fixtures";

const KEY = "WWD-7K3N-PQ2X-M9RT-4VZC";

let db: FakeDb;
let admin: ReturnType<typeof createFakeSupabase>["admin"];

function license() {
  return db.tables["license_keys"]![0]!;
}

beforeEach(() => {
  ({ db, admin } = createFakeSupabase({
    templates: [makeTemplate()],
    license_keys: [
      {
        id: "lic-1",
        key: KEY,
        order_id: ORDER_ID,
        template_id: TEMPLATE_ID,
        status: "active",
        activations: 0,
        max_activations: 2,
        buyer_email: "asha@example.com",
        created_at: "2026-09-25T05:00:00.000Z",
        last_activated_at: null,
      },
    ],
  }));
});

describe("verifyLicense — lookups", () => {
  it("returns product info for a valid key without consuming an activation", async () => {
    const result = await verifyLicense(admin, { key: KEY.toLowerCase() });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      valid: true,
      product: "gstbill-invoice-app",
      product_name: "GSTBill — Invoice & Quotation App",
      latest_version: "2.1.0",
      activations: 0,
      max_activations: 2,
    });
    expect(license()["activations"]).toBe(0);
  });

  it("never leaks buyer details", async () => {
    const result = await verifyLicense(admin, { key: KEY });
    expect(JSON.stringify(result.body)).not.toContain("asha@example.com");
    expect(JSON.stringify(result.body)).not.toContain(ORDER_ID);
  });

  it("rejects malformed, unknown, revoked and wrong-product keys with distinct reasons", async () => {
    expect((await verifyLicense(admin, { key: "WWD-0000-0000-0000-0000" })).body).toMatchObject({ valid: false, reason: "malformed" });
    expect((await verifyLicense(admin, { key: "WWD-AAAA-BBBB-CCCC-DDDD" })).body).toMatchObject({ valid: false, reason: "not_found" });
    expect((await verifyLicense(admin, { key: KEY, product: "some-other-app" })).body).toMatchObject({ valid: false, reason: "wrong_product" });
    license()["status"] = "revoked";
    expect((await verifyLicense(admin, { key: KEY })).body).toMatchObject({ valid: false, reason: "revoked" });
  });

  it("does not hit the database for malformed input", async () => {
    await verifyLicense(admin, { key: "'; DROP TABLE license_keys; --" });
    expect(db.ops).toHaveLength(0);
  });
});

describe("verifyLicense — activation counter", () => {
  it("consumes one slot per activation and stops at the limit", async () => {
    expect((await verifyLicense(admin, { key: KEY, activate: true })).body).toMatchObject({ valid: true, activations: 1 });
    expect((await verifyLicense(admin, { key: KEY, activate: true })).body).toMatchObject({ valid: true, activations: 2 });
    const third = await verifyLicense(admin, { key: KEY, activate: true });
    expect(third.body).toMatchObject({ valid: false, reason: "activation_limit", activations: 2, max_activations: 2 });
    expect(license()["activations"]).toBe(2);
    expect(license()["last_activated_at"]).toBeTruthy();
  });

  it("treats max_activations = 0 as unlimited", async () => {
    license()["max_activations"] = 0;
    for (let i = 1; i <= 5; i++) {
      expect((await verifyLicense(admin, { key: KEY, activate: true })).body).toMatchObject({ valid: true, activations: i });
    }
  });

  it("five devices activating at the same instant can never exceed the limit (compare-and-swap)", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => verifyLicense(admin, { key: KEY, activate: true })));
    const granted = results.filter((r) => r.body.valid);
    const denied = results.filter((r) => !r.body.valid);
    expect(granted).toHaveLength(2);
    expect(denied).toHaveLength(3);
    expect(denied.every((r) => (r.body as { reason: string }).reason === "activation_limit")).toBe(true);
    expect(license()["activations"]).toBe(2);
  });

  it("re-checks status after losing a race so a key revoked mid-flight is not activated", async () => {
    // Simulate: read happens, then before the CAS another writer revokes the key.
    const original = admin.from.bind(admin);
    let intercepted = false;
    (admin as unknown as { from: typeof admin.from }).from = ((table: string) => {
      const query = original(table as never);
      if (table === "license_keys" && !intercepted) {
        const update = (query as unknown as { update: (p: Record<string, unknown>) => unknown }).update.bind(query);
        (query as unknown as { update: (p: Record<string, unknown>) => unknown }).update = (patch) => {
          intercepted = true;
          license()["status"] = "revoked";
          return update(patch);
        };
      }
      return query;
    }) as typeof admin.from;

    const result = await verifyLicense(admin, { key: KEY, activate: true });
    expect(result.body).toMatchObject({ valid: false, reason: "revoked" });
    expect(license()["activations"]).toBe(0);
  });
});
