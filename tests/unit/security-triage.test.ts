import { describe, expect, it } from "vitest";
import {
  canTransition,
  dedupeFindings,
  isUnresolved,
  MAX_FINDINGS_PER_SCAN,
  nextVerification,
  normalizeSeverity,
  parseFindings,
  prioritize,
  priorityScore,
  summarize,
  type RankableFinding,
} from "@/lib/security-triage";

const NOW = Date.parse("2026-09-25T00:00:00Z");
const f = (o: Partial<RankableFinding> & { title: string }): RankableFinding => ({ severity: "medium", status: "open", verification: "unverified", ...o });

describe("parsing scan input (hostile + messy)", () => {
  it("reads JSON arrays, {findings:[]} wrappers and plain lines", () => {
    expect(parseFindings('[{"title":"A","severity":"high"}]')[0]).toMatchObject({ title: "A", severity: "high" });
    expect(parseFindings('{"findings":[{"name":"B","level":"error"}]}')[0]).toMatchObject({ title: "B", severity: "critical" });
    const lines = parseFindings("HIGH: Missing rate limit — login is brute-forceable\nrandom text\n- [low] Verbose errors");
    expect(lines.map((x) => [x.severity, x.title])).toEqual([["high", "Missing rate limit"], ["low", "Verbose errors"]]);
  });

  it("never throws on garbage and ignores non-object JSON entries", () => {
    for (const bad of ["", "{", "null", "[1,2,\"x\",null,[]]", "💥".repeat(1000), '{"title":""}']) expect(() => parseFindings(bad)).not.toThrow();
    expect(parseFindings("[1,2,null]")).toEqual([]);
  });

  it("strips control characters and clips huge fields", () => {
    const [x] = parseFindings(JSON.stringify([{ title: "a\u001b[31mb" + "z".repeat(500), description: "d".repeat(10_000) }]));
    expect(x!.title).not.toMatch(/\u001b/);
    expect(x!.title.length).toBeLessThanOrEqual(200);
    expect(x!.description.length).toBeLessThanOrEqual(4000);
  });

  it("caps the number of findings per scan", () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ title: `t${i}` }));
    expect(parseFindings(JSON.stringify(many))).toHaveLength(MAX_FINDINGS_PER_SCAN);
  });

  it("unknown severities default to medium (provisional rating)", () => {
    expect(normalizeSeverity("banana")).toBe("medium");
    expect(normalizeSeverity(undefined)).toBe("medium");
    expect(normalizeSeverity(" CRIT ")).toBe("critical");
  });
});

describe("repeated findings", () => {
  it("collapse into one and keep the worst severity", () => {
    const out = dedupeFindings([
      { title: "XSS  in search", severity: "low", category: "web", description: "first", remediation: "" },
      { title: "xss in search", severity: "critical", category: "web", description: "", remediation: "" },
      { title: "xss in search", severity: "medium", category: "web", description: "", remediation: "" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ severity: "critical", description: "first" });
  });
});

describe("prioritisation", () => {
  it("extreme gaps: one critical outranks any number of old lows", () => {
    const lows = Array.from({ length: 50 }, (_, i) => f({ title: `low${i}`, severity: "low", created_at: "2020-01-01T00:00:00Z" }));
    const ranked = prioritize([...lows, f({ title: "crit", severity: "critical", created_at: "2026-09-24T23:59:00Z" })], NOW);
    expect(ranked[0]!.title).toBe("crit");
  });

  it("ageing is capped so time alone never jumps a severity band", () => {
    const ancientHigh = priorityScore(f({ title: "h", severity: "high", created_at: "2000-01-01T00:00:00Z" }), NOW);
    const freshCrit = priorityScore(f({ title: "c", severity: "critical", created_at: "2026-09-25T00:00:00Z" }), NOW);
    expect(freshCrit).toBeGreaterThan(ancientHigh);
  });

  it("ties are deterministic regardless of input order", () => {
    const a = f({ id: "2", title: "Same" });
    const b = f({ id: "1", title: "Same" });
    const c = f({ id: "3", title: "Alpha" });
    const r1 = prioritize([a, b, c], NOW).map((x) => x.id);
    const r2 = prioritize([c, b, a], NOW).map((x) => x.id);
    expect(r1).toEqual(r2);
    expect(r1).toEqual(["3", "1", "2"]);
  });

  it("verified fixes sink, failed verifications rise above untouched items of the same severity", () => {
    const ranked = prioritize([
      f({ title: "verified", severity: "critical", status: "fixed", verification: "verified" }),
      f({ title: "open", severity: "high" }),
      f({ title: "failed", severity: "high", status: "fixed", verification: "failed" }),
    ], NOW);
    expect(ranked.map((x) => x.title)).toEqual(["failed", "open", "verified"]);
  });

  it("invalid dates do not produce NaN scores", () => {
    expect(Number.isFinite(priorityScore(f({ title: "x", created_at: "not-a-date" }), NOW))).toBe(true);
  });
});

describe("status + verification rules", () => {
  it("only allows sensible transitions", () => {
    expect(canTransition("open", "fixed")).toBe(true);
    expect(canTransition("fixed", "open")).toBe(true);
    expect(canTransition("wont_fix", "fixed")).toBe(false);
    expect(canTransition("hacked", "fixed")).toBe(false);
  });

  it("verification exists only on fixed items and resets on reopen", () => {
    expect(nextVerification("open", "verified", "verified")).toBe("unverified");
    expect(nextVerification("fixed", "verified", "unverified")).toBe("verified");
    expect(nextVerification("fixed", undefined, "failed")).toBe("failed");
    expect(nextVerification("fixed", "bogus", "unverified")).toBe("unverified");
  });

  it("a fix counts as resolved only once verified", () => {
    expect(isUnresolved({ status: "fixed", verification: "unverified" })).toBe(true);
    expect(isUnresolved({ status: "fixed", verification: "verified" })).toBe(false);
    expect(isUnresolved({ status: "wont_fix" })).toBe(false);
  });

  it("summary counts line up", () => {
    const s = summarize([
      f({ title: "a", severity: "critical" }),
      f({ title: "b", status: "fixed", verification: "verified" }),
      f({ title: "c", status: "fixed", verification: "failed", severity: "high" }),
    ]);
    expect(s).toMatchObject({ total: 3, unresolved: 2, verified: 1, failed: 1 });
    expect(s.bySeverity.critical).toBe(1);
    expect(s.bySeverity.high).toBe(1);
  });
});

describe("concurrent updates (optimistic locking, same rule as the server)", () => {
  function store() {
    let row = { status: "open", verification: "unverified", updated_at: "v0" };
    let version = 0;
    return {
      read: () => ({ ...row }),
      async update(expected: string, status: string) {
        await new Promise((r) => setTimeout(r, Math.random() * 5));
        if (row.updated_at !== expected) return false; // someone else won
        if (!canTransition(row.status, status)) return false;
        row = { status, verification: nextVerification(status, undefined, row.verification), updated_at: `v${++version}` };
        return true;
      },
    };
  }

  it("exactly one of many simultaneous edits wins; the rest must refresh", async () => {
    const s = store();
    const snapshot = s.read().updated_at;
    const results = await Promise.all(["fixed", "in_progress", "wont_fix", "fixed", "in_progress"].map((st) => s.update(snapshot, st)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(s.read().updated_at).toBe("v1");
  });

  it("sequential edits with fresh snapshots all succeed", async () => {
    const s = store();
    for (const st of ["in_progress", "fixed", "open"]) expect(await s.update(s.read().updated_at, st)).toBe(true);
    expect(s.read()).toMatchObject({ status: "open", verification: "unverified" });
  });
});
