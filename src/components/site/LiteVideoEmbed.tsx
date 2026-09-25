import { useId, useState } from "react";
import { ExternalLink, FileText, Play } from "lucide-react";
import { videoFromStored, videoProviderLabel, type VideoLink } from "@/lib/video-links";

type Props = {
  provider: string;
  videoId: string;
  title: string;
  caption?: string;
  transcript?: string;
  /** Optional override when the stored link should not be re-derived. */
  link?: VideoLink | null;
  className?: string;
};

/**
 * Click-to-load video. Nothing from YouTube/Vimeo is requested until the
 * visitor presses play (privacy + page speed); the embed then uses the
 * privacy-enhanced host. A transcript disclosure keeps the content accessible.
 */
export function LiteVideoEmbed({ provider, videoId, title, caption, transcript, link, className }: Props) {
  const [playing, setPlaying] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const transcriptId = useId();
  const video = link ?? videoFromStored(provider, videoId);
  if (!video) return null;
  const providerLabel = videoProviderLabel(video.provider);

  return (
    <figure className={className}>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-foreground">
        {playing ? (
          <iframe
            src={video.embedUrl}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
            className="group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/60"
          >
            {video.posterUrl ? (
              <img
                src={video.posterUrl}
                alt=""
                loading="lazy"
                width={480}
                height={360}
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
            ) : (
              <span className="absolute inset-0 bg-gradient-to-br from-primary/40 via-foreground to-foreground" aria-hidden="true" />
            )}
            <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
              <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
            </span>
            <span className="absolute right-3 bottom-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground">
              Loads from {providerLabel} on play
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-foreground">{title}</p>
          {caption ? <p className="mt-0.5 text-sm text-muted-foreground">{caption}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {transcript ? (
            <button
              type="button"
              onClick={() => setTranscriptOpen((v) => !v)}
              aria-expanded={transcriptOpen}
              aria-controls={transcriptId}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 font-medium text-foreground hover:bg-secondary"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {transcriptOpen ? "Hide transcript" : "Read transcript"}
            </button>
          ) : null}
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 font-medium text-foreground hover:bg-secondary"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Watch on {providerLabel}
          </a>
        </div>
      </figcaption>
      {transcript ? (
        <div id={transcriptId} hidden={!transcriptOpen} className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border bg-secondary/50 p-4 text-sm whitespace-pre-line text-muted-foreground">
          {transcript}
        </div>
      ) : null}
    </figure>
  );
}
