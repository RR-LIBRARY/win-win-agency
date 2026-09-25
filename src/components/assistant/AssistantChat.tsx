import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Loader2, RotateCcw, SendHorizonal, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AssistantMarkdown } from "@/components/assistant/AssistantMarkdown";
import { supabase } from "@/integrations/supabase/client";
import {
  ASSISTANT_STORAGE_PREFIX,
  getMode,
  TOOL_LABELS,
  type AssistantModeId,
} from "@/lib/assistant/modes";

function loadStored(mode: AssistantModeId): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ASSISTANT_STORAGE_PREFIX + mode);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UIMessage[];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

function storeMessages(mode: AssistantModeId, messages: UIMessage[]) {
  try {
    window.localStorage.setItem(ASSISTANT_STORAGE_PREFIX + mode, JSON.stringify(messages.slice(-40)));
  } catch {
    // storage full or unavailable — ignore
  }
}

function toolLabel(partType: string) {
  const name = partType.replace(/^tool-/, "");
  return TOOL_LABELS[name] ?? "Checking details";
}

export function AssistantChat({ mode, page }: { mode: AssistantModeId; page?: string }) {
  const modeDef = getMode(mode);
  const [input, setInput] = useState("");
  const [initialMessages] = useState<UIMessage[]>(() => loadStored(mode));
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/public/assistant",
        body: { mode, page: page ?? (typeof window !== "undefined" ? window.location.pathname : undefined) },
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [mode, page],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `assistant-${mode}`,
    messages: initialMessages,
    transport,
    onError: (error) => {
      toast.error("Assistant error", { description: error.message || "Please try again." });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    storeMessages(mode, messages);
  }, [mode, messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    await sendMessage({ text: trimmed });
  };

  const showSuggestions = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5 text-sm text-secondary-foreground">
            <AssistantMarkdown text={modeDef.welcome} />
          </div>
        </div>

        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pl-9">
            {modeDef.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void submit(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => {
          if (m.role === "user") {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                  {text}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="max-w-[85%] space-y-2">
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <div key={i} className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5 text-secondary-foreground">
                        <AssistantMarkdown text={part.text} />
                      </div>
                    );
                  }
                  if (part.type === "reasoning") {
                    return (
                      <p key={i} className="rounded-lg border border-border/60 bg-muted/50 px-3 py-1.5 text-xs italic text-muted-foreground">
                        {part.text.length > 220 ? `${part.text.slice(0, 220)}…` : part.text}
                      </p>
                    );
                  }
                  if (part.type.startsWith("tool-")) {
                    const state = "state" in part ? String(part.state) : "";
                    const done = state === "output-available";
                    return (
                      <p key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {done ? null : <Loader2 className="h-3 w-3 animate-spin" />}
                        {toolLabel(part.type)}
                        {done ? " ✓" : "…"}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex items-center gap-2 pl-9 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(input);
              }
            }}
            rows={1}
            placeholder="Apna sawaal likhiye…"
            className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">Answers use live prices & policies. Payments always via the site.</p>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> New chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
