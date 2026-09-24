import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { adminListMessages, adminSetMessageRead } from "@/lib/inbox.functions";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Win Win Admin" },
      { name: "description", content: "Contact form messages from visitors." },
      { property: "og:title", content: "Messages — Win Win Admin" },
      { property: "og:description", content: "Contact form inbox." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const list = useServerFn(adminListMessages);
  const setRead = useServerFn(adminSetMessageRead);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-messages"], queryFn: () => list() });

  async function toggle(id: string, is_read: boolean) {
    try {
      await setRead({ data: { id, is_read } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-messages"] }),
        qc.invalidateQueries({ queryKey: ["admin-counts"] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  if (q.isLoading) return <PanelLoading rows={4} />;
  if (q.error) return <PanelError error={q.error} />;
  const rows = q.data ?? [];
  if (rows.length === 0)
    return <PanelEmpty title="No messages yet" text="Messages sent from the Contact page show up here." />;

  return (
    <PanelCard title="Messages" description={`${rows.filter((r) => !r.is_read).length} unread`}>
      <ul className="space-y-3">
        {rows.map((m) => (
          <li
            key={m.id}
            className={`rounded-xl border p-4 ${m.is_read ? "border-border" : "border-primary/40 bg-primary/5"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("en-IN")}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(m.id, !m.is_read)}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary"
              >
                {m.is_read ? "Mark unread" : "Mark read"}
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{m.message}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Mail className="h-3.5 w-3.5" /> {m.email}
              </a>
              {m.phone ? (
                <a
                  href={`https://wa.me/${m.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> {m.phone}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
