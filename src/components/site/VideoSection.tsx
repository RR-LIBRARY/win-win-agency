import { useSuspenseQuery } from "@tanstack/react-query";
import { LiteVideoEmbed } from "@/components/site/LiteVideoEmbed";
import type { VideoPlacement } from "@/lib/db-ext";
import { siteVideosQuery } from "@/lib/videos.functions";

type Props = {
  placement: VideoPlacement;
  heading?: string;
  intro?: string;
  className?: string;
};

/**
 * Published videos for a placement. Renders nothing when there are none (or the
 * table doesn't exist yet), so pages never show an empty block. The route's
 * loader must prefetch `siteVideosQuery(placement)`.
 */
export function VideoSection({ placement, heading = "See it in action", intro, className }: Props) {
  const { data: videos } = useSuspenseQuery(siteVideosQuery(placement));
  if (videos.length === 0) return null;
  const [first, ...rest] = videos;
  return (
    <section className={className ?? "border-b border-border"} aria-labelledby={`videos-${placement}`}>
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 id={`videos-${placement}`} className="font-display text-2xl font-semibold text-foreground md:text-3xl">
            {heading}
          </h2>
          {intro ? <p className="mt-3 text-muted-foreground">{intro}</p> : null}
        </div>
        <div className={rest.length > 0 ? "mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]" : "mt-10"}>
          {first ? (
            <LiteVideoEmbed
              provider={first.provider}
              videoId={first.video_id}
              title={first.title}
              caption={first.caption}
              transcript={first.transcript}
            />
          ) : null}
          {rest.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              {rest.map((v) => (
                <LiteVideoEmbed key={v.id} provider={v.provider} videoId={v.video_id} title={v.title} caption={v.caption} transcript={v.transcript} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
