import { SETUP_FEE, services, type Package, type Service } from "@/data/services";

/**
 * "Find your fit" — a small, honest recommender. Three answers in, one clear
 * suggestion out. Pure and deterministic so it can be unit-tested and rendered
 * on the server without any AI call.
 */

export const GOALS = [
  { id: "website", label: "Launch or redo a website", hint: "Business, product or portfolio site" },
  { id: "app", label: "Build an app", hint: "Login, data, dashboards, payments" },
  { id: "coaching", label: "Run a coaching centre or classes", hint: "Fees, batches, attendance, parents" },
  { id: "notion", label: "Organise my work in Notion", hint: "Tasks, clients, content, money" },
  { id: "documents", label: "Store and share documents safely", hint: "PDF library with access control" },
  { id: "advice", label: "Get advice before I spend", hint: "Not sure what to build, or with whom" },
  { id: "ready", label: "Just buy something ready-made", hint: "Software or source code, today" },
] as const;

export const BUDGETS = [
  { id: "under-5k", label: "Under ₹5,000", max: 4_999 },
  { id: "5k-30k", label: "₹5,000 – ₹30,000", max: 30_000 },
  { id: "30k-1l", label: "₹30,000 – ₹1,00,000", max: 100_000 },
  { id: "1l-plus", label: "More than ₹1,00,000", max: Number.POSITIVE_INFINITY },
  { id: "unsure", label: "I don't know yet", max: Number.POSITIVE_INFINITY },
] as const;

export const TIMELINES = [
  { id: "this-week", label: "This week", days: 7 },
  { id: "month", label: "Within a month", days: 30 },
  { id: "quarter", label: "In the next 1–3 months", days: 90 },
  { id: "flexible", label: "No fixed date", days: Number.POSITIVE_INFINITY },
] as const;

export type GoalId = (typeof GOALS)[number]["id"];
export type BudgetId = (typeof BUDGETS)[number]["id"];
export type TimelineId = (typeof TIMELINES)[number]["id"];

export type FitAnswers = { goal: GoalId; budget: BudgetId; timeline: TimelineId };

export type FitRecommendation = {
  /** What we recommend, in one line. */
  headline: string;
  /** The honest reasoning, written like a consultant would say it. */
  why: string;
  /** Where to go next. */
  primary: { label: string; to: "/book" | "/store" | "/contact"; search?: Record<string, string> | undefined };
  /** Price + timeline facts for the card. */
  facts: { label: string; value: string }[];
  /** Optional plain-language caveat ("this will take longer than a week"). */
  caveat?: string | undefined;
  /** Prefilled message for the "talk it through" link. */
  message: string;
  kind: "service" | "store" | "talk";
};

const GOAL_TO_SERVICE: Partial<Record<GoalId, string>> = {
  website: "websites",
  app: "apps",
  coaching: "educational-projects",
  notion: "notion-templates",
  documents: "pdf-storage",
  advice: "software-consulting",
};

const GOAL_TO_STORE_TYPE: Partial<Record<GoalId, string>> = {
  notion: "notion_template",
  ready: "software",
  coaching: "source_code",
  app: "source_code",
};

const STORE_NOTE: Partial<Record<GoalId, string>> = {
  notion: "Our Notion systems in the store start under ₹1,500 and unlock the moment you pay.",
  coaching: "The store has a ready coaching-institute ERP you can own outright for a fraction of a custom build.",
  app: "Ready source code in the store gets you a working product this week; custom work can come later.",
  ready: "Everything in the store is built by the same team and unlocks the moment you pay.",
};

function packageCount(days: string): number {
  // "5-7 days" -> 7, "2-3 weeks" -> 21, "Monthly" -> 30
  const m = /(\d+)(?:\s*-\s*(\d+))?\s*(day|week)/i.exec(days);
  if (!m) return 30;
  const n = Number(m[2] ?? m[1]);
  return m[3]!.toLowerCase().startsWith("week") ? n * 7 : n;
}

function fitsTimeline(pkg: Package, timeline: TimelineId): boolean {
  const limit = TIMELINES.find((t) => t.id === timeline)!.days;
  return packageCount(pkg.timeline) <= limit;
}

/** "Up to 50 GB library" -> "up to 50 GB library"; leaves acronyms like "GST" alone. */
function lcFirst(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function serviceRecommendation(service: Service, pkg: Package, answers: FitAnswers, storeAlt?: string): FitRecommendation {
  const total = pkg.price + SETUP_FEE;
  const slow = !fitsTimeline(pkg, answers.timeline);
  const timelineLabel = TIMELINES.find((t) => t.id === answers.timeline)!.label.toLowerCase();
  return {
    kind: "service",
    headline: `${service.name} — ${pkg.name} package`,
    why:
      pkg === service.packages[0]
        ? `Start with the smallest package that solves the problem. ${pkg.includes.slice(0, 2).join(", ")} — enough to go live and learn what you actually need next.`
        : `Your budget comfortably covers ${pkg.name}, which adds ${pkg.includes.slice(0, 2).map(lcFirst).join(" and ")}. Bigger packages exist, but we would not push you there yet.`,
    facts: [
      { label: "Build cost", value: formatInr(pkg.price) },
      { label: "Setup charge", value: formatInr(SETUP_FEE) },
      { label: "Your total", value: formatInr(total) },
      { label: "Timeline", value: pkg.timeline },
    ],
    caveat: slow
      ? `Honest note: this normally takes ${pkg.timeline}, which is longer than "${timelineLabel}". ${storeAlt ?? "Tell us the real deadline and we will say if rush delivery is possible."}`
      : undefined,
    primary: { label: `Book ${pkg.name} with this price`, to: "/book", search: { service: service.slug, pkg: pkg.id } },
    message: `Hi, I used Find your fit on your site. Goal: ${GOALS.find((g) => g.id === answers.goal)!.label}. Budget: ${BUDGETS.find((b) => b.id === answers.budget)!.label}. Timeline: ${TIMELINES.find((t) => t.id === answers.timeline)!.label}. You suggested ${service.name} – ${pkg.name}. Can we talk it through?`,
  };
}

function storeRecommendation(answers: FitAnswers, note: string, type?: string): FitRecommendation {
  return {
    kind: "store",
    headline: "Start with something ready-made from the store",
    why: `${note} It is the cheapest sensible first step — and if it does not fit, the store refund policy covers you.`,
    facts: [
      { label: "Typical price", value: type === "notion_template" ? "₹999 – ₹1,499" : "₹999 – ₹15,000" },
      { label: "Delivery", value: "Instant after payment" },
      { label: "Ownership", value: "One-time payment, yours to keep" },
    ],
    primary: { label: "Browse the store", to: "/store", search: type ? { type } : undefined },
    message: `Hi, I used Find your fit on your site. Goal: ${GOALS.find((g) => g.id === answers.goal)!.label}. Budget: ${BUDGETS.find((b) => b.id === answers.budget)!.label}. Which store product would you recommend?`,
  };
}

function talkRecommendation(answers: FitAnswers): FitRecommendation {
  const consulting = services.find((s) => s.slug === "software-consulting")!;
  const first = consulting.packages[0]!;
  return {
    kind: "talk",
    headline: "Talk to us first — no booking needed",
    why: "When the budget or the idea is still open, the useful next step is a short conversation, not a purchase. We will tell you the cheapest sensible way to solve it, even if that means not hiring us.",
    facts: [
      { label: "Reply time", value: "Within one working day" },
      { label: "If you want a written plan", value: `${consulting.name} from ${formatInr(first.price)}` },
    ],
    primary: { label: "Send us the problem", to: "/contact" },
    message: `Hi, I used Find your fit on your site. Goal: ${GOALS.find((g) => g.id === answers.goal)!.label}. Budget: ${BUDGETS.find((b) => b.id === answers.budget)!.label}. Timeline: ${TIMELINES.find((t) => t.id === answers.timeline)!.label}. What would you suggest?`,
  };
}

export function recommend(answers: FitAnswers): FitRecommendation {
  const budget = BUDGETS.find((b) => b.id === answers.budget)!;

  if (answers.goal === "ready") return storeRecommendation(answers, STORE_NOTE.ready!, "software");

  if (answers.goal === "advice") {
    if (answers.budget === "under-5k" || answers.budget === "unsure") return talkRecommendation(answers);
    const consulting = services.find((s) => s.slug === "software-consulting")!;
    const pkg = bestPackage(consulting, budget.max);
    return serviceRecommendation(consulting, pkg, answers);
  }

  const serviceSlug = GOAL_TO_SERVICE[answers.goal];
  const service = serviceSlug ? services.find((s) => s.slug === serviceSlug) : undefined;
  if (!service) return talkRecommendation(answers);

  const cheapest = service.packages[0]!;
  const storeType = GOAL_TO_STORE_TYPE[answers.goal];
  const storeNote = STORE_NOTE[answers.goal];

  // Budget below the smallest package: point at the store when there is a real
  // alternative, otherwise be straight and suggest a conversation.
  if (answers.budget !== "unsure" && budget.max < cheapest.price + SETUP_FEE) {
    if (storeType && storeNote) return storeRecommendation(answers, storeNote, storeType);
    return talkRecommendation(answers);
  }

  // Very tight timeline + a goal the store can serve today: say so.
  if (answers.timeline === "this-week" && storeType && storeNote && !fitsTimeline(cheapest, "this-week")) {
    return storeRecommendation(answers, `${storeNote} Custom ${service.name.toLowerCase()} work takes ${cheapest.timeline} at minimum.`, storeType);
  }

  const pkg = answers.budget === "unsure" ? cheapest : bestPackage(service, budget.max);
  const storeAlt = storeType && storeNote ? `Need it sooner? ${storeNote}` : undefined;
  return serviceRecommendation(service, pkg, answers, storeAlt);
}

/** Largest package whose all-in total (build + setup) fits the budget, never above the middle tier unless budget is unlimited. */
function bestPackage(service: Service, max: number): Package {
  const fitting = service.packages.filter((p) => p.price + SETUP_FEE <= max);
  if (fitting.length === 0) return service.packages[0]!;
  // A consultant does not upsell to the top tier from a form — cap at the
  // second package unless the budget is explicitly open-ended.
  const cap = Number.isFinite(max) ? Math.min(fitting.length, 2) : fitting.length;
  return fitting[cap - 1]!;
}

export function whatsappLink(number: string, message: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
