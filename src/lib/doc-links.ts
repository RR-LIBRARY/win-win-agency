/**
 * Link-only product documentation. Admins paste a Google Doc / Sheet / Slides /
 * Drive file, Notion page, GitHub README, PDF or any https page — nothing is
 * uploaded to Supabase Storage (free tier). We detect the provider for a nice
 * label/icon and, where the provider supports it, build a read-only preview URL.
 */
export type DocProvider = {
  id: string;
  label: string;
  /** Short verb for the button. */
  cta: string;
};

export const DOC_PROVIDERS: DocProvider[] = [
  { id: "google_doc", label: "Google Doc", cta: "Open the guide" },
  { id: "google_sheet", label: "Google Sheet", cta: "Open the sheet" },
  { id: "google_slides", label: "Google Slides", cta: "Open the slides" },
  { id: "google_drive", label: "Google Drive", cta: "Open on Drive" },
  { id: "notion", label: "Notion", cta: "Open in Notion" },
  { id: "github", label: "GitHub", cta: "Open on GitHub" },
  { id: "youtube", label: "YouTube", cta: "Watch the video" },
  { id: "loom", label: "Loom", cta: "Watch the walkthrough" },
  { id: "figma", label: "Figma", cta: "Open in Figma" },
  { id: "pdf", label: "PDF", cta: "Open the PDF" },
  { id: "link", label: "Web page", cta: "Open the page" },
];

export function docProviderById(id: string): DocProvider {
  return DOC_PROVIDERS.find((p) => p.id === id) ?? DOC_PROVIDERS[DOC_PROVIDERS.length - 1]!;
}

function hostIs(host: string, ...patterns: string[]): boolean {
  return patterns.some((p) => host === p || host.endsWith(`.${p}`));
}

/** Detect the provider of a pasted documentation link. Non-https / unparsable → "link". */
export function detectDocProvider(input: string | null | undefined): string {
  if (!input) return "link";
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return "link";
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname.toLowerCase();

  if (host === "docs.google.com") {
    if (path.startsWith("/document/")) return "google_doc";
    if (path.startsWith("/spreadsheets/")) return "google_sheet";
    if (path.startsWith("/presentation/")) return "google_slides";
    return "google_drive";
  }
  if (host === "drive.google.com" || host === "sheets.google.com") return "google_drive";
  if (hostIs(host, "notion.so", "notion.site")) return "notion";
  if (hostIs(host, "github.com", "raw.githubusercontent.com", "gist.github.com")) return "github";
  if (hostIs(host, "youtube.com", "youtu.be")) return "youtube";
  if (hostIs(host, "loom.com")) return "loom";
  if (hostIs(host, "figma.com")) return "figma";
  if (path.endsWith(".pdf")) return "pdf";
  return "link";
}

/**
 * Only https links are accepted for docs. Returns the trimmed URL or null.
 * (Google/Notion share links are always https; this also blocks javascript: etc.)
 */
export function normaliseDocUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Read-only "preview" variant for Google files so a buyer lands on a clean
 * viewer instead of an edit request page. Others are returned unchanged.
 *   docs.google.com/document/d/<id>/edit?usp=sharing → …/d/<id>/preview
 */
export function docPreviewUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "docs.google.com") {
      const m = /^\/(document|spreadsheets|presentation)\/d\/([^/]+)/.exec(u.pathname);
      if (m) return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`;
    }
    if (u.hostname === "drive.google.com") {
      const m = /^\/file\/d\/([^/]+)/.exec(u.pathname);
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    }
    return url;
  } catch {
    return url;
  }
}

/** Hostname for display next to the link ("docs.google.com"). */
export function docHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
