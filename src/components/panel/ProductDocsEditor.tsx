import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BookOpen, ExternalLink, Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PanelCard } from "@/components/panel/PanelShell";
import { DocMarkdown } from "@/components/store/ProductDocs";
import type { ProductDocRow } from "@/lib/db-ext";
import { detectDocProvider, docProviderById } from "@/lib/doc-links";
import { adminDeleteDoc, adminListDocs, adminSaveDoc, type DocInput } from "@/lib/docs.functions";

type Draft = Omit<DocInput, "templateId">;

const emptyDraft = (sort: number): Draft => ({ title: "", kind: "link", url: "", content_md: "", visibility: "public", sort_order: sort });

/**
 * Link-only documentation for one product. Lives inside the product editor
 * (which is a <form>), so everything here is buttons — no nested forms.
 */
export function ProductDocsEditor({ templateId }: { templateId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListDocs);
  const save = useServerFn(adminSaveDoc);
  const remove = useServerFn(adminDeleteDoc);
  const q = useQuery({ queryKey: ["admin-docs", templateId], queryFn: () => list({ data: { templateId } }) });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    await Promise.all([qc.invalidateQueries({ queryKey: ["admin-docs", templateId] }), qc.invalidateQueries({ queryKey: ["docs"] })]);
  }

  async function submit() {
    if (!draft) return;
    setBusy("save");
    try {
      await save({ data: { ...draft, templateId } });
      toast.success(draft.id ? "Guide updated" : "Guide added");
      setDraft(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the guide");
    } finally {
      setBusy(null);
    }
  }

  async function del(doc: ProductDocRow) {
    if (!window.confirm(`Remove “${doc.title}”?`)) return;
    setBusy(doc.id);
    try {
      await remove({ data: { id: doc.id } });
      toast.success("Guide removed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(null);
    }
  }

  const docs = q.data?.docs ?? [];
  const input = "mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground";

  return (
    <PanelCard
      title="Documentation (links only)"
      description="Setup guides, FAQs, video walkthroughs. Paste Google Docs / Sheets / Drive, Notion, GitHub or PDF links — or write a short guide in Markdown. Nothing is uploaded."
      actions={
        q.data?.available ? (
          <button
            type="button"
            onClick={() => setDraft(emptyDraft(docs.length))}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add guide
          </button>
        ) : undefined
      }
    >
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : q.error ? (
        <p className="text-sm text-destructive">{q.error instanceof Error ? q.error.message : "Could not load guides"}</p>
      ) : !q.data?.available ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Switch on by running <code className="rounded bg-muted px-1 py-0.5 text-xs">db/pending/20260925_reviews_videos_docs.sql</code> in the Supabase SQL editor.
        </p>
      ) : (
        <>
          {docs.length === 0 && !draft ? (
            <p className="text-sm text-muted-foreground">No guides yet. Buyers see public guides on the product page; “buyers only” guides unlock after payment.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => {
                const provider = docProviderById(d.provider);
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                    {d.visibility === "buyers" ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Buyers only" /> : <BookOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{d.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.kind === "link" ? `${provider.label} · ${d.url}` : "Markdown guide"} · {d.visibility === "buyers" ? "buyers only" : "public"} · order {d.sort_order}
                      </span>
                    </span>
                    {d.kind === "link" ? (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${d.title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          id: d.id,
                          title: d.title,
                          kind: d.kind === "markdown" ? "markdown" : "link",
                          url: d.url,
                          content_md: d.content_md,
                          visibility: d.visibility === "buyers" ? "buyers" : "public",
                          sort_order: d.sort_order,
                        })
                      }
                      aria-label={`Edit ${d.title}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy === d.id}
                      onClick={() => void del(d)}
                      aria-label={`Remove ${d.title}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-destructive hover:bg-destructive/5 disabled:opacity-60"
                    >
                      {busy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {draft ? (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">{draft.id ? "Edit guide" : "New guide"}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-foreground sm:col-span-2">
                  Title
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} className={input} placeholder="e.g. Setup guide (Hindi + English)" />
                </label>
                <label className="block text-xs font-medium text-foreground">
                  Type
                  <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })} className={input}>
                    <option value="link">Link (Google Doc, Notion, Drive, GitHub, PDF…)</option>
                    <option value="markdown">Write it here (Markdown)</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-foreground">
                  Who can see it
                  <select value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value as Draft["visibility"] })} className={input}>
                    <option value="public">Everyone (product page)</option>
                    <option value="buyers">Buyers only (after payment)</option>
                  </select>
                </label>
                {draft.kind === "link" ? (
                  <label className="block text-xs font-medium text-foreground sm:col-span-2">
                    Link (https)
                    <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} maxLength={1000} className={input} placeholder="https://docs.google.com/document/d/…" />
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {draft.url.trim() ? `Detected: ${docProviderById(detectDocProvider(draft.url)).label}` : "Share the doc as “Anyone with the link can view” first."}
                    </span>
                  </label>
                ) : (
                  <div className="grid gap-3 sm:col-span-2 lg:grid-cols-2">
                    <label className="block text-xs font-medium text-foreground">
                      Guide text (Markdown)
                      <textarea value={draft.content_md} onChange={(e) => setDraft({ ...draft, content_md: e.target.value })} rows={10} maxLength={40_000} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs text-foreground" placeholder={"## Install\n1. Unzip the download\n2. Run `npm install`\n\n**Default login:** admin / changeme"} />
                    </label>
                    <div>
                      <p className="text-xs font-medium text-foreground">Preview</p>
                      <div className="mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-3">
                        {draft.content_md.trim() ? <DocMarkdown text={draft.content_md} /> : <p className="text-xs text-muted-foreground">Start typing to preview.</p>}
                      </div>
                    </div>
                  </div>
                )}
                <label className="block text-xs font-medium text-foreground">
                  Order
                  <input type="number" min={0} max={999} value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} className={input} />
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" disabled={busy === "save"} onClick={() => void submit()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {draft.id ? "Save guide" : "Add guide"}
                </button>
                <button type="button" onClick={() => setDraft(null)} className="min-h-10 rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </PanelCard>
  );
}
