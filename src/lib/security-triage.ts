/**
 * Pure helpers for the admin security dashboard: parse pasted scan output,
 * rank findings, and guard status/verification changes. No I/O here so every
 * rule is unit-testable.
 */

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const FINDING_STATUSES = ["open", "in_progress", "fixed", "wont_fix"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const VERIFICATIONS = ["unverified", "verified", "failed"] as const;
export type Verification = (typeof VERIFICATIONS)[number];

export type ParsedFinding = {
  title: string;
  severity: Severity;
  category: string;
  description: string;
  remediation: string;
};

export const MAX_FINDINGS_PER_SCAN = 100;
export const MAX_RAW_INPUT = 50_000;
const MAX_TITLE = 200;
const MAX_TEXT = 4000;

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 100, high: 70, medium: 40, low: 15, info: 5 };

const ALIASES: Record<string, Severity> = {
  critical: "critical", crit: "critical", error: "critical", p0: "critical", blocker: "critical",
  high: "high", severe: "high", p1: "high", major: "high",
  medium: "medium", moderate: "medium", med: "medium", warn: "medium", warning: "medium", p2: "medium",
  low: "low", minor: "low", p3: "low",
  info: "info", informational: "info", note: "info", notice: "info", p4: "info",
};

export function normalizeSeverity(value: unknown): Severity {
  const key = String(value ?? "").trim().toLowerCase();
  return ALIASES[key] ?? "medium";
}

function clip(value: unknown, max: number) {
  // Strip control characters (keep newlines/tabs) so pasted output can't smuggle terminal escapes.
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

function fromObject(o: Record<string, unknown>): ParsedFinding | null {
  const title = clip(o["title"] ?? o["name"] ?? o["id"] ?? o["rule"], MAX_TITLE);
  if (!title) return null;
  return {
    title,
    severity: normalizeSeverity(o["severity"] ?? o["level"] ?? o["priority"]),
    category: clip(o["category"] ?? o["type"] ?? o["scanner"] ?? "general", 60) || "general",
    description: clip(o["description"] ?? o["details"] ?? o["message"], MAX_TEXT),
    remediation: clip(o["remediation"] ?? o["fix"] ?? o["recommendation"], MAX_TEXT),
  };
}

const SEV_WORD = "critical|crit|error|high|severe|medium|moderate|warn|warning|low|minor|info|note|p[0-4]";
const LINE_RE = new RegExp(`^\\s*[-*•]?\\s*(?:\\[(${SEV_WORD})\\]\\s*[:\\-–|]?|(${SEV_WORD})\\s*[:\\-–|])\\s*(.+)$`, "i");

/** Accepts a JSON array / `{findings: [...]}` or plain lines like `HIGH: title — details`. */
export function parseFindings(raw: string): ParsedFinding[] {
  const text = raw.slice(0, MAX_RAW_INPUT).trim();
  if (!text) return [];
  let out: ParsedFinding[] = [];
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const json: unknown = JSON.parse(text);
      const list = Array.isArray(json)
        ? json
        : json && typeof json === "object" && Array.isArray((json as { findings?: unknown }).findings)
          ? (json as { findings: unknown[] }).findings
          : [json];
      out = list
        .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x))
        .map(fromObject)
        .filter((x): x is ParsedFinding => x !== null);
      return dedupeFindings(out).slice(0, MAX_FINDINGS_PER_SCAN);
    } catch {
      // fall through to line parsing
    }
  }
  for (const line of text.split(/\r?\n/)) {
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const [title, ...rest] = (m[3] ?? "").split(/\s+[—–]\s+|\s+-\s+/);
    const f = fromObject({ title, severity: m[1] ?? m[2], description: rest.join(" - ") });
    if (f) out.push(f);
  }
  return dedupeFindings(out).slice(0, MAX_FINDINGS_PER_SCAN);
}

/** Repeated findings (same title + category) collapse into one, keeping the worst severity. */
export function dedupeFindings(list: ParsedFinding[]): ParsedFinding[] {
  const map = new Map<string, ParsedFinding>();
  for (const f of list) {
    const key = `${f.category.toLowerCase()}::${f.title.toLowerCase().replace(/\s+/g, " ")}`;
    const prev = map.get(key);
    if (!prev) map.set(key, f);
    else if (SEVERITY_WEIGHT[f.severity] > SEVERITY_WEIGHT[prev.severity]) map.set(key, { ...f, description: f.description || prev.description });
  }
  return [...map.values()];
}

export type RankableFinding = {
  id?: string;
  title: string;
  severity: string;
  status: string;
  verification?: string;
  created_at?: string;
};

/** Higher = fix first. Resolved items sink; failed verifications get pushed back up. */
export function priorityScore(f: RankableFinding, now = Date.now()): number {
  let score = SEVERITY_WEIGHT[normalizeSeverity(f.severity)];
  if (f.status === "wont_fix") return score * 0.05;
  if (f.status === "fixed") return f.verification === "failed" ? score + 20 : f.verification === "verified" ? 0 : score * 0.2;
  if (f.status === "in_progress") score -= 5;
  if (f.created_at) {
    const days = Math.max(0, (now - Date.parse(f.created_at)) / 86_400_000);
    if (Number.isFinite(days)) score += Math.min(10, days / 3); // ageing: +1 per 3 days, capped
  }
  return Math.round(score * 100) / 100;
}

/** Deterministic: ties broken by severity, then title, then id — never input order. */
export function prioritize<T extends RankableFinding>(list: readonly T[], now = Date.now()): T[] {
  return [...list].sort((a, b) => {
    const d = priorityScore(b, now) - priorityScore(a, now);
    if (d !== 0) return d;
    const s = SEVERITY_WEIGHT[normalizeSeverity(b.severity)] - SEVERITY_WEIGHT[normalizeSeverity(a.severity)];
    if (s !== 0) return s;
    const t = a.title.localeCompare(b.title);
    return t !== 0 ? t : (a.id ?? "").localeCompare(b.id ?? "");
  });
}

export function isUnresolved(f: { status: string; verification?: string }) {
  if (f.status === "open" || f.status === "in_progress") return true;
  return f.status === "fixed" && f.verification !== "verified";
}

const ALLOWED: Record<FindingStatus, FindingStatus[]> = {
  open: ["in_progress", "fixed", "wont_fix"],
  in_progress: ["open", "fixed", "wont_fix"],
  fixed: ["open", "in_progress"], // reopen when a verification fails
  wont_fix: ["open"],
};

export function canTransition(from: string, to: string) {
  if (from === to) return true;
  return (ALLOWED[from as FindingStatus] ?? []).includes(to as FindingStatus);
}

/** Verification only makes sense for fixed items; changing status away from fixed resets it. */
export function nextVerification(status: string, requested: string | undefined, current: string): Verification {
  if (status !== "fixed") return "unverified";
  const v = (requested ?? current) as Verification;
  return VERIFICATIONS.includes(v) ? v : "unverified";
}

export function summarize(list: readonly RankableFinding[]) {
  const unresolved = list.filter((f) => isUnresolved({ status: f.status, verification: f.verification ?? "unverified" }));
  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, unresolved.filter((f) => normalizeSeverity(f.severity) === s).length])) as Record<Severity, number>;
  return {
    total: list.length,
    unresolved: unresolved.length,
    verified: list.filter((f) => f.status === "fixed" && f.verification === "verified").length,
    failed: list.filter((f) => f.verification === "failed").length,
    bySeverity,
  };
}
