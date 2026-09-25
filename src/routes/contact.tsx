import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, MessageCircle, Clock, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/site/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { siteSettingsQuery } from "@/lib/settings.functions";
import { useServerFn } from "@tanstack/react-start";
import { sendContactMessage } from "@/lib/inbox.functions";

export const Route = createFileRoute("/contact")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  head: () => ({
    meta: [
      { title: "Contact Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Ask a question about a website, app, Notion template or coaching-centre platform. We reply within one working day, Monday to Saturday.",
      },
      { property: "og:title", content: "Contact Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Email, WhatsApp or send a message — we reply within one working day.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = useServerFn(sendContactMessage);
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Ask us anything before you book."
        subtitle="Not sure which package fits, or whether your idea is even worth building? Send it over."
      />

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          {sent ? (
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Message noted, thank you.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                We reply within one working day. If it is urgent, WhatsApp is faster.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-6 text-sm font-medium text-primary hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setBusy(true);
                try {
                  await send({
                    data: {
                      name: String(form.get("name") ?? ""),
                      email: String(form.get("email") ?? ""),
                      phone: String(form.get("phone") ?? ""),
                      message: String(form.get("message") ?? ""),
                    },
                  });
                  setSent(true);
                  toast.success("Message sent", { description: "We reply within one working day." });
                } catch (error) {
                  toast.error("Could not send", { description: error instanceof Error ? error.message : "Please try again." });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Your name</Label>
                  <Input id="c-name" name="name" required placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" name="email" type="email" required placeholder="you@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-phone">Phone or WhatsApp</Label>
                <Input id="c-phone" name="phone" required placeholder="+91" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-message">What do you need?</Label>
                <Textarea
                  id="c-message"
                  name="message"
                  required
                  rows={6}
                  placeholder="Tell us about your business and what you want built."
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex rounded-full disabled:opacity-60 bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {busy ? "Sending" : "Send message"}
              </button>
              <p className="text-xs text-muted-foreground">
                Ready to start instead?{" "}
                <Link to="/book" className="text-primary hover:underline">
                  Book your work with a price
                </Link>
                .
              </p>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-secondary/60 p-6">
            <h2 className="font-display text-base font-semibold text-foreground">Direct lines</h2>
            <div className="mt-4 space-y-3 text-sm">
              <a
                href={`mailto:${settings.contact_email}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Mail className="h-4 w-4 text-primary" /> {settings.contact_email}
              </a>
              <a
                href={`https://wa.me/${settings.contact_whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4 text-primary" /> WhatsApp
              </a>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" /> {settings.business_hours}
              </p>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              These details are editable from the admin panel under Site settings.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-base font-semibold text-foreground">Response time</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Replies within one working day. Bookings get a kickoff call slot within 48 hours.
            </p>
          </div>
        </aside>
      </div>

      {(settings.business_address || settings.business_map_embed_url) && (
        <div className="mx-auto max-w-6xl px-5 pb-16 md:pb-24">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid md:grid-cols-[1fr_1.4fr]">
              <div className="p-6 md:p-8">
                <h2 className="font-display text-xl font-semibold text-foreground">Find us on the map</h2>
                {settings.business_address && (
                  <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {settings.business_address}
                      {settings.business_landmark ? (
                        <span className="mt-1 block text-xs">Landmark: {settings.business_landmark}</span>
                      ) : null}
                    </span>
                  </p>
                )}
                {settings.business_map_url && (
                  <a
                    href={settings.business_map_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Navigation className="h-4 w-4" /> Get directions
                  </a>
                )}
              </div>
              {settings.business_map_embed_url && (
                <iframe
                  title="Win Win Digital Agency on the map"
                  src={settings.business_map_embed_url}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-72 w-full border-0 md:h-full md:min-h-[320px]"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
