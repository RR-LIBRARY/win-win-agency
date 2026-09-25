import { useRouter } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function isInternal(href: string) {
  if (href.startsWith("/")) return true;
  if (typeof window === "undefined") return false;
  try {
    return new URL(href, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

function toPath(href: string) {
  try {
    const u = new URL(href, typeof window === "undefined" ? "http://localhost" : window.location.origin);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return href;
  }
}

function SmartLink({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  const router = useRouter();
  if (!href) return <span>{children}</span>;
  const safe = /^(https?:\/\/|\/|mailto:|tel:)/i.test(href) ? href : "#";
  if (safe === "#") return <span>{children}</span>;
  const internal = isInternal(safe);
  return (
    <a
      {...rest}
      href={internal ? toPath(safe) : safe}
      target={internal ? undefined : "_blank"}
      rel={internal ? undefined : "noopener noreferrer"}
      onClick={(e) => {
        if (internal && !e.metaKey && !e.ctrlKey && e.button === 0) {
          e.preventDefault();
          void router.navigate({ href: toPath(safe) });
        }
      }}
      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
    >
      {children}
    </a>
  );
}

export function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div className="assistant-prose text-sm leading-relaxed [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_th]:border-b [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border-b [&_td]:border-border/60 [&_td]:px-2 [&_td]:py-1 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_hr]:my-3 [&_hr]:border-border">
      <Markdown remarkPlugins={[remarkGfm]} components={{ a: SmartLink }}>
        {text}
      </Markdown>
    </div>
  );
}
