import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BadgeCheck, Check, EyeOff, Loader2, MessageSquareReply, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { RatingStars } from "@/components/site/RatingStars";
import { formatDate } from "@/components/site/StatusBadge";
import { REVIEW_CRITERIA } from "@/lib/review-rules";
import { adminDeleteReview, adminListReviews, adminModerateReview, adminReplyReview, type AdminReview } from "@/lib/reviews.functions";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — Win Win Admin" },
      { name: "description", content: "Moderate verified-buyer reviews against the published guidelines and reply publicly." },
      { property: "og:title", content: "Reviews — Win Win Admin" },
      { property: "og:description", content: "Review moderation." },
    ],
  }),
  component: ReviewsPage,
});

type Filter = "pending" | "approved" | "hidden" | "all";

function ReviewsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const list = useServerFn(adminListReviews);
  const q = useQuery({ queryKey: ["admin-reviews", filter], queryFn: () => list({ data: { status: filter } }) });

  if (q.isLoading) return <PanelLoading rows={4} />;
  if (q.error) return <PanelError error={q.error} />;
  const data = q.data;
  if (!data?.available) {
    return (
      <PanelEmpty
        title="Reviews aren't switched on yet"
        text="Run db/pending/20260925_reviews_videos_docs.sql in the Supabase SQL editor (project “Win Win Agency”). Verified-buyer reviews, videos and product docs switch on together."
      />
    );
  }

  const tabs: { id: Filter; label: string }[] = [
    { id: "pending", label: "Awaiting moderation" },
    { id: "approved", label: "Published" },
    { id: "hidden", label: "Not published" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="space-y-4">
      <PanelCard
        title="Reviews"
        description="Check each review only against the published guidelines. Approve or hide — never edit the words or the rating."
        actions={
          <Link to="/review-policy" target="_blank" className="text-xs font-medium text-primary hover:underline">
            Public guidelines
          </Link>
        }
      >
        <div role="tablist" aria-label="Review status" className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              className={
                filter === t.id
                  ? "rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <details className="mt-4 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Moderation criteria (what the buyer agreed to)</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {REVIEW_CRITERIA.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </details>
      </PanelCard>

      {data.reviews.length === 0 ? (
        <PanelEmpty
          title={filter === "pending" ? "Nothing waiting" : "No reviews here"}
          text={filter === "pending" ? "New reviews from verified buyers land here for a quick check." : "Try another tab."}
        />
      ) : (
        <ul className="space-y-3">
          {data.reviews.map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewRow({ review }: { review: AdminReview }) {
  const qc = useQueryClient();
  const moderate = useServerFn(adminModerateReview);
  const reply = useServerFn(adminReplyReview);
  const remove = useServerFn(adminDeleteReview);
  const [replyText, setReplyText] = useState(review.admin_reply);
  const [replying, setReplying] = useState(Boolean(review.admin_reply));
  const [busy, setBusy] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<unknown>, success: string) {
    setBusy(label);
    try {
      await fn();
      toast.success(success);
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-reviews"] }), qc.invalidateQueries({ queryKey: ["admin-counts"] }), qc.invalidateQueries({ queryKey: ["reviews"] })]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the review");
    } finally {
      setBusy(null);
    }
  }

  const statusTone =
    review.status === "approved" ? "bg-primary/10 text-primary" : review.status === "hidden" ? "bg-muted text-muted-foreground" : "bg-chart-4/15 text-foreground";
  const statusLabel = review.status === "approved" ? "Published" : review.status === "hidden" ? "Not published" : "Awaiting moderation";

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RatingStars value={review.rating} size="sm" />
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone}`}>{statusLabel}</span>
            {review.verified_purchase ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified purchase
              </span>
            ) : null}
          </div>
          {review.title ? <p className="mt-2 font-display text-base font-semibold text-foreground">{review.title}</p> : null}
          <p className="mt-1 text-sm whitespace-pre-line text-foreground">{review.body}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {review.author_name} · {review.buyer_email} · order {review.order_reference} · {formatDate(review.created_at)} ·{" "}
            {review.product_slug ? (
              <Link to="/store/$slug" params={{ slug: review.product_slug }} target="_blank" className="text-primary hover:underline">
                {review.product_title}
              </Link>
            ) : (
              review.product_title
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {review.status !== "approved" ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("approve", () => moderate({ data: { id: review.id, status: "approved" } }), "Review published")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Publish
            </button>
          ) : null}
          {review.status !== "hidden" ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("hide", () => moderate({ data: { id: review.id, status: "hidden" } }), "Review hidden (buyer still sees it on their order)")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
            >
              {busy === "hide" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />} Don't publish
            </button>
          ) : null}
          {review.status !== "pending" ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("pending", () => moderate({ data: { id: review.id, status: "pending" } }), "Moved back to the queue")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Re-queue
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              if (!window.confirm("Delete this review permanently? Prefer “Don't publish” unless it's spam.")) return;
              void run("delete", () => remove({ data: { id: review.id } }), "Review deleted");
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
            aria-label="Delete review"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        {replying ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run("reply", () => reply({ data: { id: review.id, reply: replyText.trim() } }), replyText.trim() ? "Reply saved" : "Reply removed");
            }}
            className="space-y-2"
          >
            <label className="block text-xs font-medium text-foreground">
              Public reply from Win Win Digital
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                maxLength={1000}
                className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Thank the buyer, fix the issue, or add context. Shown under the review."
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={busy !== null} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-semibold text-background disabled:opacity-60">
                {busy === "reply" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquareReply className="h-3.5 w-3.5" />} Save reply
              </button>
              <button type="button" onClick={() => setReplying(false)} className="min-h-9 rounded-full border border-border px-3.5 text-xs font-medium text-foreground hover:bg-secondary">
                Close
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setReplying(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <MessageSquareReply className="h-3.5 w-3.5" /> {review.admin_reply ? "Edit reply" : "Reply publicly"}
          </button>
        )}
      </div>
    </li>
  );
}
