import { useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, Lock } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { docHost, docPreviewUrl, docProviderById } from "@/lib/doc-links";
import type { ProductDoc } from "@/lib/docs.functions";

const PROSE =
  "text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_th]:border-b [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border-b [&_td]:border-border/60 [&_td]:px-2 [&_td]:py-1 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_hr]:my-3 [&_hr]:border-border";

/** Markdown guide with links forced to open safely in a new tab. */
export function DocMarkdown({ text }: { text: string }) {
  return (
    <div className={PROSE}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const safe = href && /^(https:\/\/|mailto:)/i.test(href) ? href : undefined;
            return safe ? (
              <a href={safe} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          img: () => null,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}

function DocItem({ doc, defaultOpen = false }: { doc: ProductDoc; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const buyersOnly = doc.visibility === "buyers";
  if (doc.kind === "link") {
    const provider = docProviderById(doc.provider);
    const href = docPreviewUrl(doc.url);
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/50 hover:bg-secondary/40"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">{doc.title}</span>
            <span className="block text-xs text-muted-foreground">
              {provider.label} · {docHost(doc.url)}
              {buyersOnly ? " · buyers only" : ""}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
            {provider.cta} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </a>
      </li>
    );
  }
  return (
    <li className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-sm"
      >
        <BookOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">{doc.title}</span>
          <span className="block text-xs text-muted-foreground">Guide{buyersOnly ? " · buyers only" : ""}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-4">
          <DocMarkdown text={doc.content_md} />
        </div>
      ) : null}
    </li>
  );
}

/** Reusable list: product page (public docs) and order pages (public + buyer docs). */
export function DocList({ docs, lockedCount = 0 }: { docs: ProductDoc[]; lockedCount?: number }) {
  return (
    <ul className="space-y-2">
      {docs.map((doc, i) => (
        <DocItem key={doc.id} doc={doc} defaultOpen={docs.length === 1 && i === 0 && doc.kind === "markdown"} />
      ))}
      {lockedCount > 0 ? (
        <li className="flex min-h-12 items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {lockedCount} more {lockedCount === 1 ? "guide unlocks" : "guides unlock"} after purchase
        </li>
      ) : null}
    </ul>
  );
}

/** Product page section. Renders nothing when there is nothing to show. */
export function ProductDocs({ docs, lockedCount, legacyDocsUrl }: { docs: ProductDoc[]; lockedCount: number; legacyDocsUrl: string | null }) {
  if (docs.length === 0 && lockedCount === 0) return null;
  return (
    <section id="documentation" className="scroll-mt-24" aria-labelledby="docs-heading">
      <h2 id="docs-heading" className="font-display text-xl font-semibold text-foreground">
        Documentation
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Setup guides and references — hosted as links, always up to date.</p>
      <div className="mt-4">
        <DocList docs={docs} lockedCount={lockedCount} />
        {legacyDocsUrl && !docs.some((d) => d.url === legacyDocsUrl) ? (
          <a href={legacyDocsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            Full documentation site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
