import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircleQuestion, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AssistantChat } from "@/components/assistant/AssistantChat";

/** Site-wide floating assistant button + panel. Hidden on the full /assistant page. */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Keyboard + focus management: Escape closes, focus lands in the panel on
  // open and returns to the launcher on close (non-modal dialog pattern).
  useEffect(() => {
    if (!open) return;
    // Land in the message box (not the close button, which comes first in DOM
    // order); wait a frame so the chat has mounted its composer.
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const composer = panel?.querySelector<HTMLElement>("textarea, input:not([type='hidden'])");
      const fallback = panel?.querySelector<HTMLElement>("button");
      (composer ?? fallback)?.focus();
    });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        launcherRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (pathname.startsWith("/assistant")) return null;

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="fixed inset-x-3 bottom-20 z-50 flex h-[min(560px,70dvh)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[380px]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p id={titleId} className="font-display text-sm font-semibold text-foreground">
                Win Win Assistant
              </p>
              <p id={descriptionId} className="text-[11px] text-muted-foreground">
                Rates, directions, orders & doubts — Hindi/English
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to="/assistant"
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary underline-offset-4 hover:bg-secondary hover:underline"
              >
                Full page
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close assistant"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <AssistantChat mode="business" />
          </div>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Close assistant" : "Open assistant — ask about rates, orders or directions"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="fixed right-5 bottom-5 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-primary p-3.5 text-primary-foreground shadow-lg transition-transform hover:scale-105 motion-reduce:transition-none"
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" />}
      </button>
    </>
  );
}
