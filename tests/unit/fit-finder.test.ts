import { describe, expect, it } from "vitest";
import { BUDGETS, GOALS, TIMELINES, recommend, whatsappLink, type FitAnswers } from "@/lib/fit-finder";

const answers = (partial: Partial<FitAnswers>): FitAnswers => ({
  goal: "website",
  budget: "5k-30k",
  timeline: "month",
  ...partial,
});

describe("recommend", () => {
  it("picks the smallest website package for a modest budget", () => {
    const r = recommend(answers({ goal: "website", budget: "5k-30k" }));
    expect(r.kind).toBe("service");
    expect(r.headline).toContain("Websites");
    expect(r.headline).toContain("Basic");
    expect(r.primary).toEqual({ label: "Book Basic with this price", to: "/book", search: { service: "websites", pkg: "web-basic" } });
    expect(r.facts.find((f) => f.label === "Your total")?.value).toBe("₹16,999");
  });

  it("never upsells past the middle package from a form, even with a big budget", () => {
    const r = recommend(answers({ goal: "website", budget: "30k-1l" }));
    expect(r.headline).toContain("Standard");
    const open = recommend(answers({ goal: "website", budget: "1l-plus" }));
    expect(open.headline).toContain("Premium");
  });

  it("sends a tiny budget to the store when a real alternative exists", () => {
    const r = recommend(answers({ goal: "notion", budget: "under-5k" }));
    expect(r.kind).toBe("store");
    expect(r.primary.search).toEqual({ type: "notion_template" });
    expect(r.why).toMatch(/store/i);
  });

  it("is honest when a tiny budget has no store alternative", () => {
    const r = recommend(answers({ goal: "documents", budget: "under-5k" }));
    expect(r.kind).toBe("talk");
    expect(r.primary.to).toBe("/contact");
    expect(r.why).toMatch(/not hiring us/);
  });

  it("flags an unrealistic timeline instead of hiding it", () => {
    const r = recommend(answers({ goal: "app", budget: "30k-1l", timeline: "this-week" }));
    // Apps have a store alternative, so a one-week deadline goes to the store.
    expect(r.kind).toBe("store");
    expect(r.why).toMatch(/3-4 weeks at minimum/);

    const slow = recommend(answers({ goal: "documents", budget: "5k-30k", timeline: "this-week" }));
    expect(slow.kind).toBe("service");
    expect(slow.caveat).toMatch(/longer than "this week"/);
  });

  it("recommends a conversation when the person only wants advice on a small budget", () => {
    const r = recommend(answers({ goal: "advice", budget: "unsure" }));
    expect(r.kind).toBe("talk");
    expect(r.facts[0]).toEqual({ label: "Reply time", value: "Within one working day" });
  });

  it("books consulting when advice is wanted and the budget covers it", () => {
    const r = recommend(answers({ goal: "advice", budget: "5k-30k" }));
    expect(r.kind).toBe("service");
    expect(r.primary.search?.service).toBe("software-consulting");
  });

  it("always sends 'buy something ready-made' to the software store", () => {
    const r = recommend(answers({ goal: "ready", budget: "1l-plus", timeline: "flexible" }));
    expect(r.kind).toBe("store");
    expect(r.primary.search).toEqual({ type: "software" });
  });

  it("uses the cheapest package when the budget is unknown", () => {
    const r = recommend(answers({ goal: "coaching", budget: "unsure", timeline: "quarter" }));
    expect(r.headline).toContain("Basic");
    expect(r.caveat).toBeUndefined();
  });

  it("produces a recommendation for every combination without throwing", () => {
    for (const g of GOALS) for (const b of BUDGETS) for (const t of TIMELINES) {
      const r = recommend({ goal: g.id, budget: b.id, timeline: t.id });
      expect(r.headline.length).toBeGreaterThan(5);
      expect(r.message).toContain(g.label);
      expect(r.facts.length).toBeGreaterThan(0);
    }
  });
});

describe("whatsappLink", () => {
  it("strips formatting from the number and encodes the message", () => {
    expect(whatsappLink("+91 98765-43210", "Hi there & hello")).toBe("https://wa.me/919876543210?text=Hi%20there%20%26%20hello");
  });
});
