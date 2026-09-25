import { describe, expect, it } from "vitest";
import { SETTING_DEFAULTS, grievanceContact, withDefaults } from "@/lib/settings.functions";
import { parseChangelog, parseFaq, parseTiers } from "@/lib/db-types";

describe("withDefaults", () => {
  it("overlays stored rows on the defaults and ignores unknown keys", () => {
    const settings = withDefaults([
      { key: "contact_email", value: "care@winwin.in" },
      { key: "definitely_not_a_setting", value: "x" },
    ]);
    expect(settings.contact_email).toBe("care@winwin.in");
    expect((settings as Record<string, string>)["definitely_not_a_setting"]).toBeUndefined();
    expect(Object.keys(settings).sort()).toEqual(Object.keys(SETTING_DEFAULTS).sort());
  });
});

describe("grievanceContact", () => {
  it("falls back to the main contact email and a generic title when no officer is configured", () => {
    const settings = withDefaults([{ key: "contact_email", value: "care@winwin.in" }]);
    expect(grievanceContact(settings)).toEqual({ name: "Grievance Officer", email: "care@winwin.in", phone: "" });
  });
  it("uses the configured officer details (trimmed)", () => {
    const settings = withDefaults([
      { key: "grievance_officer_name", value: "  Rohit Sharma " },
      { key: "grievance_officer_email", value: "grievance@winwin.in" },
      { key: "grievance_officer_phone", value: " +91 98765 43210 " },
    ]);
    expect(grievanceContact(settings)).toEqual({ name: "Rohit Sharma", email: "grievance@winwin.in", phone: "+91 98765 43210" });
  });
});

describe("catalog JSON parsers (admin-entered data is untrusted)", () => {
  it("parseTiers keeps only well-formed tiers and normalises numbers", () => {
    const tiers = parseTiers([
      { id: "a", name: "Personal", price: 1499.4, compare_at_price: 2499, description: "d", includes: ["x", 5, null] },
      { id: "b", name: "Bad", price: "1499" },
      { id: "", name: "No id", price: 10 },
      { id: "c", name: "Cheaper compare", price: 500, compare_at_price: 400 },
      "garbage",
      null,
    ]);
    expect(tiers.map((t) => t.id)).toEqual(["a", "c"]);
    expect(tiers[0]).toMatchObject({ price: 1499, compare_at_price: 2499, includes: ["x"] });
    expect(tiers[1]!.compare_at_price).toBeNull();
    expect(parseTiers("nope")).toEqual([]);
    expect(parseTiers(undefined)).toEqual([]);
  });

  it("parseFaq and parseChangelog drop malformed entries", () => {
    expect(parseFaq([{ q: "Q?", a: "A." }, { q: 5, a: "x" }, { q: "only q" }, 3])).toEqual([{ q: "Q?", a: "A." }]);
    const log = parseChangelog([{ version: "2.1.0", date: "2026-09-01", notes: ["Fix", 1] }, { version: "", date: "", notes: [] }]);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ version: "2.1.0", notes: ["Fix"] });
  });
});
