/**
 * Link-only video support. Admins paste a YouTube or Vimeo link; we never host
 * video files (Supabase free tier). Embeds use the privacy-enhanced
 * `youtube-nocookie.com` / `player.vimeo.com?dnt=1` hosts and load only on click.
 */
export type VideoLink = {
  provider: "youtube" | "vimeo";
  videoId: string;
  /** Canonical watch page, safe to link out to. */
  url: string;
  /** Privacy-friendly embed URL (loaded only after the visitor clicks play). */
  embedUrl: string;
  /** Poster image, when the provider offers a predictable one (YouTube only). */
  posterUrl: string | null;
  /** Start offset in seconds parsed from `t=` / `start=` / `#t=` when present. */
  startSeconds: number;
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

function parseStart(value: string | null): number {
  if (!value) return 0;
  const v = value.trim().toLowerCase();
  if (/^\d+$/.test(v)) return Math.min(Number(v), 86_400);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(v);
  if (!m || (!m[1] && !m[2] && !m[3])) return 0;
  const seconds = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return Math.min(seconds, 86_400);
}

function hostIs(host: string, ...patterns: string[]): boolean {
  return patterns.some((p) => host === p || host.endsWith(`.${p}`));
}

/**
 * Parse a pasted YouTube / Vimeo link. Returns `null` for anything else — the
 * admin form uses that to show "Only YouTube or Vimeo links are supported".
 */
export function parseVideoLink(input: string | null | undefined): VideoLink | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // Bare YouTube id pasted on its own.
  if (YT_ID.test(raw)) return buildYouTube(raw, 0);

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "").toLowerCase();

  if (hostIs(host, "youtube.com", "youtube-nocookie.com", "youtu.be")) {
    let id = "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (host === "youtu.be") id = parts[0] ?? "";
    else if (parts[0] === "watch") id = url.searchParams.get("v") ?? "";
    else if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") id = parts[1] ?? "";
    if (!YT_ID.test(id)) return null;
    const hashStart = url.hash.startsWith("#t=") ? url.hash.slice(3) : null;
    const start = parseStart(url.searchParams.get("t") ?? url.searchParams.get("start") ?? hashStart);
    return buildYouTube(id, start);
  }

  if (hostIs(host, "vimeo.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    // vimeo.com/123456789, vimeo.com/channels/x/123456789, player.vimeo.com/video/123456789
    const id = [...parts].reverse().find((p) => VIMEO_ID.test(p)) ?? "";
    if (!VIMEO_ID.test(id)) return null;
    const start = parseStart(url.hash.startsWith("#t=") ? url.hash.slice(3) : null);
    return {
      provider: "vimeo",
      videoId: id,
      url: `https://vimeo.com/${id}`,
      embedUrl: `https://player.vimeo.com/video/${id}?dnt=1&autoplay=1${start ? `#t=${start}s` : ""}`,
      posterUrl: null,
      startSeconds: start,
    };
  }

  return null;
}

function buildYouTube(id: string, start: number): VideoLink {
  const params = new URLSearchParams({ autoplay: "1", rel: "0", modestbranding: "1" });
  if (start > 0) params.set("start", String(start));
  return {
    provider: "youtube",
    videoId: id,
    url: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ""}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`,
    posterUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    startSeconds: start,
  };
}

/** Rebuild a VideoLink from stored columns (provider + id) without re-parsing the URL. */
export function videoFromStored(provider: string, videoId: string): VideoLink | null {
  if (provider === "youtube" && YT_ID.test(videoId)) return buildYouTube(videoId, 0);
  if (provider === "vimeo" && VIMEO_ID.test(videoId)) return parseVideoLink(`https://vimeo.com/${videoId}`);
  return null;
}

export function videoProviderLabel(provider: string): string {
  return provider === "vimeo" ? "Vimeo" : "YouTube";
}
