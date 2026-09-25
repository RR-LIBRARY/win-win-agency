import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicClient } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";
import { asExt, isMissingTableError, VIDEO_PLACEMENTS, type SiteVideoRow, type VideoPlacement } from "./db-ext";
import { parseVideoLink } from "./video-links";

export type SiteVideo = Pick<SiteVideoRow, "id" | "title" | "caption" | "provider" | "video_id" | "url" | "transcript" | "placement">;

const placementSchema = z.enum(VIDEO_PLACEMENTS as [VideoPlacement, ...VideoPlacement[]]);

/** Published videos for one placement. Empty until the table exists — sections simply hide. */
export const listSiteVideos = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ placement: placementSchema }).parse(input))
  .handler(async ({ data }): Promise<SiteVideo[]> => {
    const supabase = asExt(createPublicClient());
    const { data: rows, error } = await supabase
      .from("site_videos")
      .select("id, title, caption, provider, video_id, url, transcript, placement")
      .eq("placement", data.placement)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(6);
    if (error) {
      if (isMissingTableError(error)) return [];
      throw new Error(error.message);
    }
    return rows ?? [];
  });

export const siteVideosQuery = (placement: VideoPlacement) =>
  queryOptions({
    queryKey: ["site-videos", placement],
    queryFn: () => listSiteVideos({ data: { placement } }),
    staleTime: 10 * 60 * 1000,
  });

// ---------- admin ----------

export const adminListVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ available: boolean; videos: SiteVideoRow[] }> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await asExt(context.supabase)
      .from("site_videos")
      .select("*")
      .order("placement", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) {
      if (isMissingTableError(error)) return { available: false, videos: [] };
      throw new Error(error.message);
    }
    return { available: true, videos: data ?? [] };
  });

const videoInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  caption: z.string().trim().max(300),
  url: z.string().trim().min(5).max(500),
  transcript: z.string().trim().max(20_000),
  placement: placementSchema,
  sort_order: z.number().int().min(0).max(999),
  is_published: z.boolean(),
});

export type VideoInput = z.input<typeof videoInputSchema>;

export const adminSaveVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => videoInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertAdmin(context.supabase, context.userId);
    const parsed = parseVideoLink(data.url);
    if (!parsed) throw new Error("Paste a YouTube or Vimeo link (e.g. https://youtu.be/…). Other hosts aren't supported.");
    const { id, url: _url, ...rest } = data;
    const row = { ...rest, provider: parsed.provider, video_id: parsed.videoId, url: parsed.url };
    const s = asExt(context.supabase);
    if (id) {
      const { error } = await s.from("site_videos").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: inserted, error } = await s.from("site_videos").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const adminDeleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await asExt(context.supabase).from("site_videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
