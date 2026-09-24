import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/site/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Ask a question about a website, app, store or learning platform. We reply within one working day, Monday to Saturday.",
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
              onSubmit={(event) => {
                event.preventDefault();
                setSent(true);
                toast.success("Message sent", { description: "We reply within one working day." });
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Your name</Label>
                  <Input id="c-name" required placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" required placeholder="you@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-phone">Phone or WhatsApp</Label>
                <Input id="c-phone" required placeholder="+91" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-message">What do you need?</Label>
                <Textarea
                  id="c-message"
                  required
                  rows={6}
                  placeholder="Tell us about your business and what you want built."
                />
              </div>
              <button
                type="submit"
                className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Send message
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
                href="mailto:hello@winwindigital.example"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Mail className="h-4 w-4 text-primary" /> hello@winwindigital.example
              </a>
              <a
                href="https://wa.me/910000000000"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4 text-primary" /> WhatsApp
              </a>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" /> Mon-Sat, 10am - 7pm IST
              </p>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Sample contact details — send us your real email and number and we will put them in.
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
    </>
  );
}
