import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { ASSISTANT_MODE_IDS } from "@/lib/assistant/modes";
import { buildKnowledgePack, buildSystemPrompt, buildTools, type AssistantContext } from "@/lib/assistant/knowledge.server";
import { createClientForToken } from "@/lib/supabase-public.server";

const MAX_MESSAGES = 40;
const MAX_TEXT = 6000;

const partSchema = z
  .object({ type: z.string(), text: z.string().max(MAX_TEXT).optional() })
  .passthrough();

const bodySchema = z.object({
  mode: z.enum(ASSISTANT_MODE_IDS).default("business"),
  page: z.string().max(200).optional(),
  messages: z
    .array(z.object({ id: z.string().max(80), role: z.enum(["user", "assistant", "system"]), parts: z.array(partSchema).max(40) }).passthrough())
    .min(1)
    .max(MAX_MESSAGES),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Keep only text parts and drop stale tool/reasoning parts so history stays small and valid. */
function sanitize(messages: z.infer<typeof bodySchema>["messages"]): UIMessage[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: m.parts
        .filter((p) => p.type === "text" && typeof p.text === "string" && p.text.trim().length > 0)
        .map((p) => ({ type: "text" as const, text: p.text as string })),
    }))
    .filter((m) => m.parts.length > 0);
}

export const Route = createFileRoute("/api/public/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(503, { error: "The assistant is not configured yet." });

        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json(400, { error: "Invalid request." });
        }

        const messages = sanitize(parsed.messages);
        const last = messages[messages.length - 1];
        if (!last || last.role !== "user") return json(400, { error: "Send a message first." });

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        const { supabase, userId } = await createClientForToken(token);

        const url = new URL(request.url);
        const forwardedProto = request.headers.get("x-forwarded-proto");
        const origin = `${forwardedProto ?? url.protocol.replace(":", "")}://${request.headers.get("x-forwarded-host") ?? url.host}`;

        const ctx: AssistantContext = { mode: parsed.mode, origin, page: parsed.page ?? null, userId, userSupabase: supabase };

        let userLabel: string | null = null;
        if (userId) {
          const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
          userLabel = profile?.full_name || profile?.email || "a customer";
        }

        const { knowledge } = await buildKnowledgePack(ctx);
        const system = buildSystemPrompt(ctx, knowledge, userLabel);

        const openai = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey, // satisfies the SDK; the gateway authenticates on the header below
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });

        const result = streamText({
          model: openai.responses("openai/gpt-6-astra"),
          system,
          messages: await convertToModelMessages(messages),
          tools: buildTools(ctx),
          stopWhen: stepCountIs(6),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false, // required: tool steps resend prior items
              include: ["reasoning.encrypted_content"],
            },
          },
          abortSignal: request.signal,
          onError: ({ error }) => {
            console.error("[assistant] stream error", error instanceof Error ? error.message : error);
          },
        });

        return result.toUIMessageStreamResponse({
          sendReasoning: false,
          onError: (error) => {
            const msg = error instanceof Error ? error.message : String(error);
            if (/402|payment required|credits/i.test(msg)) return "The assistant is paused because the AI credit balance is empty. Please WhatsApp us instead.";
            if (/429|rate limit/i.test(msg)) return "Too many requests right now — please try again in a few seconds.";
            return "Sorry, I hit a problem answering that. Please try again or WhatsApp us.";
          },
        });
      },
    },
  },
});
