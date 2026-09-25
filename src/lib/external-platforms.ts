/**
 * Marketplaces and platforms an "external" product can live on.
 * `detectPlatform` guesses from a pasted URL; admins can override in the editor.
 */
export type ExternalPlatform = {
  id: string;
  label: string;
  /** Verb shown on the buy button, e.g. "Buy on Gumroad". */
  cta: string;
  hosts: string[];
};

export const EXTERNAL_PLATFORMS: ExternalPlatform[] = [
  { id: "gumroad", label: "Gumroad", cta: "Buy on Gumroad", hosts: ["gumroad.com"] },
  // More specific hosts first: read.amazon.* is Kindle, everything else on amazon.* is the store.
  { id: "kindle", label: "Kindle", cta: "Get it on Kindle", hosts: ["read.amazon."] },
  { id: "amazon", label: "Amazon", cta: "Buy on Amazon", hosts: ["amazon.", "amzn.", "kdp.amazon"] },
  { id: "fiverr", label: "Fiverr", cta: "Order on Fiverr", hosts: ["fiverr.com"] },
  { id: "upwork", label: "Upwork", cta: "Hire on Upwork", hosts: ["upwork.com"] },
  { id: "udemy", label: "Udemy", cta: "Enroll on Udemy", hosts: ["udemy.com"] },
  { id: "youtube", label: "YouTube", cta: "Watch on YouTube", hosts: ["youtube.com", "youtu.be"] },
  { id: "play_store", label: "Google Play", cta: "Get it on Google Play", hosts: ["play.google.com"] },
  { id: "app_store", label: "App Store", cta: "Download on the App Store", hosts: ["apps.apple.com"] },
  { id: "github", label: "GitHub", cta: "Open on GitHub", hosts: ["github.com"] },
  { id: "notion", label: "Notion", cta: "Open in Notion", hosts: ["notion.so", "notion.site"] },
  { id: "etsy", label: "Etsy", cta: "Buy on Etsy", hosts: ["etsy.com"] },
  { id: "payhip", label: "Payhip", cta: "Buy on Payhip", hosts: ["payhip.com"] },
  { id: "lemon_squeezy", label: "Lemon Squeezy", cta: "Buy on Lemon Squeezy", hosts: ["lemonsqueezy.com"] },
  { id: "instamojo", label: "Instamojo", cta: "Buy on Instamojo", hosts: ["instamojo.com"] },
  { id: "topmate", label: "Topmate", cta: "Book on Topmate", hosts: ["topmate.io"] },
  { id: "flipkart", label: "Flipkart", cta: "Buy on Flipkart", hosts: ["flipkart.com"] },
  { id: "medium", label: "Medium", cta: "Read on Medium", hosts: ["medium.com"] },
  { id: "substack", label: "Substack", cta: "Read on Substack", hosts: ["substack.com"] },
  { id: "skillshare", label: "Skillshare", cta: "Watch on Skillshare", hosts: ["skillshare.com"] },
  { id: "chrome_web_store", label: "Chrome Web Store", cta: "Add to Chrome", hosts: ["chromewebstore.google.com", "chrome.google.com/webstore"] },
  { id: "other", label: "Website", cta: "Open the product page", hosts: [] },
];

export function platformById(id: string): ExternalPlatform {
  return EXTERNAL_PLATFORMS.find((p) => p.id === id) ?? EXTERNAL_PLATFORMS[EXTERNAL_PLATFORMS.length - 1]!;
}

/** Safe hostname for display ("gumroad.com"), or "" when the URL is not parseable. */
export function externalHost(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Does the link's hostname belong to `pattern`? Matching is anchored to the
 * hostname (never the path or query) so `evil.com/gumroad.com` cannot dress
 * itself up as Gumroad. Patterns:
 *   "gumroad.com"                → gumroad.com or any subdomain of it
 *   "amazon."                    → amazon.<anything> (amazon.in, amazon.com, …) incl. subdomains
 *   "chrome.google.com/webstore" → hostname match + path prefix
 */
function hostMatches(hostname: string, pathname: string, pattern: string): boolean {
  const [hostPattern, ...pathParts] = pattern.split("/");
  const pathPrefix = pathParts.length ? `/${pathParts.join("/")}` : "";
  if (!hostPattern) return false;
  let hostOk: boolean;
  if (hostPattern.endsWith(".")) {
    // Country-TLD family (amazon.in / amazon.co.uk / kdp.amazon.com …)
    hostOk = hostname.startsWith(hostPattern) || hostname.includes(`.${hostPattern}`);
  } else {
    hostOk = hostname === hostPattern || hostname.endsWith(`.${hostPattern}`);
  }
  if (!hostOk) return false;
  return pathPrefix ? pathname.startsWith(pathPrefix) : true;
}

/** Guess the platform from a pasted link. Falls back to "other" (label = website hostname). */
export function detectPlatform(url: string | null | undefined): ExternalPlatform {
  if (!url) return platformById("other");
  let hostname: string;
  let pathname: string;
  try {
    const u = new URL(url);
    hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    pathname = u.pathname.toLowerCase();
  } catch {
    return platformById("other");
  }
  if (!hostname) return platformById("other");
  for (const platform of EXTERNAL_PLATFORMS) {
    if (platform.hosts.some((pattern) => hostMatches(hostname, pathname, pattern))) return platform;
  }
  return platformById("other");
}

/** Resolve the platform for a product, honouring a manual override when present. */
export function resolvePlatform(product: { external_url?: string | null; external_platform?: string | null }): ExternalPlatform {
  const manual = product.external_platform?.trim();
  if (manual && manual !== "other") return platformById(manual);
  const detected = detectPlatform(product.external_url);
  if (detected.id === "other") {
    const host = externalHost(product.external_url);
    return host ? { ...detected, label: host, cta: `Open on ${host}` } : detected;
  }
  return detected;
}

export function isExternalProduct(product: { delivery_type: string }): boolean {
  return product.delivery_type === "external";
}

/** Only https links are ever rendered as external CTAs. */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
