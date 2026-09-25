import { describe, expect, it } from "vitest";
import { LICENSE_PREFIX, generateLicenseKey, isLicenseKeyFormat, normalizeLicenseKey } from "@/lib/payments/license";

const AMBIGUOUS = /[01OIL]/;

describe("generateLicenseKey", () => {
  it("produces WWD-XXXX-XXXX-XXXX-XXXX", () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^WWD(?:-[A-Z2-9]{4}){4}$/);
    expect(key.startsWith(`${LICENSE_PREFIX}-`)).toBe(true);
  });

  it("never contains characters that are confused when read aloud (0/O, 1/I/L)", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateLicenseKey().slice(4)).not.toMatch(AMBIGUOUS);
    }
  });

  it("is deterministic for a given random source", () => {
    const rng = (n: number) => new Uint8Array(n).map((_, i) => i * 7);
    expect(generateLicenseKey(rng)).toBe(generateLicenseKey(rng));
    expect(generateLicenseKey(rng)).not.toBe(generateLicenseKey((n) => new Uint8Array(n).fill(3)));
  });

  it("has enough entropy that 1,000 keys never collide", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateLicenseKey());
    expect(seen.size).toBe(1000);
  });
});

describe("normalizeLicenseKey", () => {
  it("uppercases, trims and strips whitespace and stray characters", () => {
    expect(normalizeLicenseKey("  wwd-7k3n-pq2x-m9rt-4vzc \n")).toBe("WWD-7K3N-PQ2X-M9RT-4VZC");
    expect(normalizeLicenseKey("WWD 7K3N PQ2X M9RT 4VZC")).toBe("WWD7K3NPQ2XM9RT4VZC");
    expect(normalizeLicenseKey("WWD-7K3N-PQ2X-M9RT-4VZC;drop")).toBe("WWD-7K3N-PQ2X-M9RT-4VZCDROP");
  });
});

describe("isLicenseKeyFormat", () => {
  it("accepts well-formed keys in any case", () => {
    expect(isLicenseKeyFormat("wwd-7k3n-pq2x-m9rt-4vzc")).toBe(true);
    expect(isLicenseKeyFormat(generateLicenseKey())).toBe(true);
  });
  it("rejects wrong prefix, wrong grouping, ambiguous letters and injection attempts", () => {
    expect(isLicenseKeyFormat("ABC-7K3N-PQ2X-M9RT-4VZC")).toBe(false);
    expect(isLicenseKeyFormat("WWD-7K3N-PQ2X-M9RT")).toBe(false);
    expect(isLicenseKeyFormat("WWD-7K3N-PQ2X-M9RT-4VZ0")).toBe(false);
    expect(isLicenseKeyFormat("WWD-7K3N-PQ2X-M9RT-4VZC' OR 1=1")).toBe(false);
    expect(isLicenseKeyFormat("")).toBe(false);
  });
});
