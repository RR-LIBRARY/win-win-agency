import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { LiteVideoEmbed } from "@/components/site/LiteVideoEmbed";
import { VIDEO_PLACEMENTS, type SiteVideoRow, type VideoPlacement } from "@/lib/db-ext";
import { parseVideoLink, videoProviderLabel } from "@/lib/video-links";
import { adminDeleteVideo, adminListVideos, adminSaveVideo, type VideoInput } from "@/lib/videos.functions";

export const Route = createFileRoute("/_authenticated/admin/videos")({
  head: () => ({
    meta: [
      { title: "Videos — Win Win Admin" },
      { name: "description", content: "Paste YouTube or Vimeo links to show privacy-friendly videos on the site. No uploads." },
      { property: "og:title", content: "Videos — Win Win Admin" },
      { property: "og:description", content: "Link-only video manager." },
    ],
  }),
  component: VideosPage,
});

const PLACEMENT_LABEL: Record<VideoPlacement, string> = {
  home: "Home page",
  about: "About page",
  services: "Services page",
  store: "Store page",
};

const empty: VideoInput = { title: "", caption: "", url: "", transcript: "", placement: "home", sort_order: 0, is_published: false };

function VideosPage() {
  const list = useServerFn(adminListVideos);
  const q = useQuery({ queryKey: ["admin-videos"], queryFn: () => list() });
  const [editing, setEditing] = useState<VideoInput | null>(null);

  if (q.isLoading) return <PanelLoading rows={3} />;
  if (q.error) return <PanelError error={q.error} />;
  if (!q.data?.available) {
    return (
      <PanelEmpty
        title="Videos aren't switched on yet"
        text="Run db/pending/20260925_reviews_videos_docs.sql in the Supabase SQL editor (project “Win Win Agency”) to enable link-only videos."
      />
    );
  }
  const videos = q.data.videos;

  return (
    <div className="space-y-4">
      <PanelCard
        title="Videos"
        description="Paste a YouTube or Vimeo link — the site embeds it privately (nothing loads until a visitor presses play) and never stores video files."
        actions={
          <button
            type="button"
            onClick={() => setEditing({ ...empty, sort_order: videos.length })}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add video
          </button>
        }
      >
        {videos.length === 0 && !editing ? (
          <p className="text-sm text-muted-foreground">No videos yet. Add a walkthrough, a client story or a product demo.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} onEdit={() => setEditing(toInput(v))} />
            ))}
          </ul>
        )}
      </PanelCard>

      {editing ? <VideoEditor value={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function toInput(v: SiteVideoRow): VideoInput {
  return {
    id: v.id,
    title: v.title,
    caption: v.caption,
    url: v.url,
    transcript: v.transcript,
    placement: (VIDEO_PLACEMENTS as readonly string[]).includes(v.placement) ? (v.placement as VideoPlacement) : "home",
    sort_order: v.sort_order,
    is_published: v.is_published,
  };
}

function VideoCard({ video, onEdit }: { video: SiteVideoRow; onEdit: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(adminSaveVideo);
  const remove = useServerFn(adminDeleteVideo);
  const [busy, setBusy] = useState(false);

  async function togglePublish() {
    setBusy(true);
    try {
      await save({ data: { ...toInput(video), is_published: !video.is_published } });
      toast.success(video.is_published ? "Video hidden" : "Video published");
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-videos"] }), qc.invalidateQueries({ queryKey: ["site-videos"] })]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!window.confirm(`Remove “${video.title}” from the site?`)) return;
    setBusy(true);
    try {
      await remove({ data: { id: video.id } });
      toast.success("Video removed");
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-videos"] }), qc.invalidateQueries({ queryKey: ["site-videos"] })]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <LiteVideoEmbed provider={video.provider} videoId={video.video_id} title={video.title} caption={video.caption} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {PLACEMENT_LABEL[(video.placement as VideoPlacement) ?? "home"] ?? video.placement} · {videoProviderLabel(video.provider)} · order {video.sort_order}
          {video.transcript ? " · transcript ✓" : " · no transcript"}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${video.is_published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {video.is_published ? "Live" : "Draft"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-medium text-foreground hover:bg-secondary">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button type="button" disabled={busy} onClick={togglePublish} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : video.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {video.is_published ? "Hide" : "Publish"}
        </button>
        <button type="button" disabled={busy} onClick={del} aria-label="Remove video" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function VideoEditor({ value, onClose }: { value: VideoInput; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(adminSaveVideo);
  const [form, setForm] = useState<VideoInput>(value);
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => parseVideoLink(form.url), [form.url]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed) {
      toast.error("Paste a YouTube or Vimeo link");
      return;
    }
    setSaving(true);
    try {
      await save({ data: form });
      toast.success(form.id ? "Video updated" : "Video added");
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-videos"] }), qc.invalidateQueries({ queryKey: ["site-videos"] })]);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const input = "mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground";

  return (
    <PanelCard title={form.id ? "Edit video" : "Add video"} description="YouTube or Vimeo only. Add a transcript so the video is accessible and searchable.">
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-foreground">
            Video link
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://youtu.be/… or https://vimeo.com/…" className={input} required />
            <span className={`mt-1 block text-[11px] ${form.url && !parsed ? "text-destructive" : "text-muted-foreground"}`}>
              {form.url ? (parsed ? `${videoProviderLabel(parsed.provider)} · id ${parsed.videoId}` : "Only YouTube or Vimeo links are supported") : "Paste the share link from YouTube or Vimeo"}
            </span>
          </label>
          <label className="block text-xs font-medium text-foreground">
            Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} className={input} required />
          </label>
          <label className="block text-xs font-medium text-foreground">
            Caption <span className="font-normal text-muted-foreground">(one line, optional)</span>
            <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} maxLength={300} className={input} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-foreground">
              Show on
              <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as VideoPlacement })} className={input}>
                {VIDEO_PLACEMENTS.map((p) => (
                  <option key={p} value={p}>
                    {PLACEMENT_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-foreground">
              Order
              <input type="number" min={0} max={999} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} className={input} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="h-4 w-4 accent-primary" />
            Published (visible on the site)
          </label>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-foreground">
            Transcript <span className="font-normal text-muted-foreground">(recommended — accessibility + SEO)</span>
            <textarea value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} rows={8} maxLength={20_000} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Paste the spoken text of the video…" />
          </label>
          {parsed ? (
            <div>
              <p className="text-xs font-medium text-foreground">Preview</p>
              <LiteVideoEmbed provider={parsed.provider} videoId={parsed.videoId} title={form.title || "Preview"} link={parsed} className="mt-1" />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              <Video className="mr-2 h-4 w-4" /> Preview appears after a valid link
            </div>
          )}
        </div>
        <div className="flex gap-2 lg:col-span-2">
          <button type="submit" disabled={saving || !parsed} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {form.id ? "Save changes" : "Add video"}
          </button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-border px-5 text-sm font-medium text-foreground hover:bg-secondary">
            Cancel
          </button>
        </div>
      </form>
    </PanelCard>
  );
}
