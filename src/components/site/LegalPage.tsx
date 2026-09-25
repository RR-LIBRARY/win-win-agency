import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { grievanceContact, type SiteSettings } from "@/lib/settings.functions";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

export const LEGAL_PAGES = [
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/refund-policy", label: "Refund & Cancellation" },
  { to: "/delivery-policy", label: "Shipping & Delivery" },
  { to: "/review-policy", label: "Review Guidelines" },
] as const;

export const LEGAL_LAST_UPDATED = "25 September 2026";

/**
 * Shared frame for the policy pages Razorpay and the Consumer Protection
 * (E-Commerce) Rules expect: business identity block, in-page contents,
 * numbered sections and the grievance officer on every page.
 */
export function LegalPage({
  eyebrow,
  title,
  subtitle,
  settings,
  sections,
  current,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  settings: SiteSettings;
  sections: LegalSection[];
  current: (typeof LEGAL_PAGES)[number]["to"];
}) {
  const grievance = grievanceContact(settings);

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle}>
        <p className="text-xs text-muted-foreground">Last updated {LEGAL_LAST_UPDATED}</p>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[240px_1fr] md:py-20">
        <aside className="md:sticky md:top-24 md:self-start">
          <p className="font-display text-xs font-semibold tracking-wider text-foreground uppercase">Policies</p>
          <nav aria-label="Policy pages" className="mt-3 flex flex-col gap-1.5 text-sm">
            {LEGAL_PAGES.map((page) => (
              <Link
                key={page.to}
                to={page.to}
                className={
                  page.to === current
                    ? "rounded-lg bg-primary/10 px-3 py-1.5 font-medium text-primary"
                    : "rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }
              >
                {page.label}
              </Link>
            ))}
          </nav>

          <p className="mt-8 font-display text-xs font-semibold tracking-wider text-foreground uppercase">On this page</p>
          <nav aria-label="Sections" className="mt-3 flex flex-col gap-1.5 text-sm">
            {sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`} className="text-muted-foreground hover:text-foreground">
                {index + 1}. {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-display font-semibold text-foreground">{settings.business_legal_name}</p>
                <p className="mt-1 text-muted-foreground">
                  {settings.business_address || "Registered address is shared on request and printed on every invoice."}
                </p>
                {settings.business_gstin ? <p className="mt-1 text-muted-foreground">GSTIN {settings.business_gstin}</p> : null}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <a href={`mailto:${settings.contact_email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Mail className="h-3.5 w-3.5" /> {settings.contact_email}
                  </a>
                  <a
                    href={`https://wa.me/${settings.contact_whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                  <span>{settings.business_hours}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  <span className="mr-2 text-primary">{index + 1}.</span>
                  {section.title}
                </h2>
                <div className="prose-legal mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-foreground">
                  {section.body}
                </div>
              </section>
            ))}
          </div>

          <section id="grievance-officer" className="mt-14 scroll-mt-28 rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <h2 className="font-display text-lg font-semibold text-foreground">Grievance officer</h2>
                <p className="mt-2 text-muted-foreground">
                  Under the Consumer Protection (E-Commerce) Rules, 2020 and the Information Technology Act, 2000 you can
                  escalate any complaint about an order, a refund, or your personal data to our grievance officer. We
                  acknowledge every complaint within <strong>48 hours</strong> and resolve it within <strong>30 days</strong>.
                  Quote your order reference (for example WWT-XXXXX) so we can find it quickly.
                </p>
                <dl className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-foreground uppercase">Name</dt>
                    <dd className="mt-0.5 text-muted-foreground">{grievance.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-foreground uppercase">Email</dt>
                    <dd className="mt-0.5">
                      <a href={`mailto:${grievance.email}`} className="text-primary hover:underline">
                        {grievance.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-foreground uppercase">Phone / WhatsApp</dt>
                    <dd className="mt-0.5 text-muted-foreground">
                      {grievance.phone || `+${settings.contact_whatsapp}`}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <p className="mt-8 text-xs text-muted-foreground">
            Questions about any policy? <Link to="/contact" className="text-primary hover:underline">Contact us</Link> — we reply
            within one working day.
          </p>
        </article>
      </div>
    </>
  );
}
