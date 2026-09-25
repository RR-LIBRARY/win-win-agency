import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircleQuestion, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AssistantChat } from "@/components/assistant/AssistantChat";

/** Site-wide floating assistant button + panel. Hidden on the full /assistant page. */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (pathname.startsWith("/assistant")) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-x-3 bottom-20 z-50 flex h-[min(560px,70dvh)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold text-foreground">Win Win Assistant</p>
              <p className="text-[11px] text-muted-foreground">Rates, directions, orders & doubts — Hindi/English</p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to="/assistant"
                className="rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-secondary"
              >
                Full page
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <AssistantChat mode="business" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-primary p-3.5 text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircleQuestion className="h-5 w-5" />}
      </button>
    </>
  );
}
