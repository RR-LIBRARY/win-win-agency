import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle } from "lucide-react";
import { SETTING_DEFAULTS, grievanceContact, siteSettingsQuery } from "@/lib/settings.functions";
import { LEGAL_PAGES } from "@/components/site/LegalPage";

export function Footer() {
  const { data } = useQuery(siteSettingsQuery);
  const settings = data ?? SETTING_DEFAULTS;
  const grievance = grievanceContact(settings);

  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
          <div className="max-w-sm">
            <p className="font-display text-lg font-semibold text-foreground">Win Win Digital</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Websites, apps, EdTech systems for coaching centres, Notion templates, software consulting
              and secure PDF storage — priced in packages, delivered on dates we keep.
            </p>
            {settings.business_address ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {settings.business_legal_name} · {settings.business_address}
                {settings.business_gstin ? ` · GSTIN ${settings.business_gstin}` : ""}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="font-display text-xs font-semibold tracking-wider text-foreground uppercase">Agency</p>
            <Link to="/services" className="text-muted-foreground hover:text-foreground">Services</Link>
            <Link to="/portfolio" className="text-muted-foreground hover:text-foreground">Work</Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link to="/book" className="text-muted-foreground hover:text-foreground">Book your work</Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="font-display text-xs font-semibold tracking-wider text-foreground uppercase">Store</p>
            <Link to="/store" className="text-muted-foreground hover:text-foreground">Software store</Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/account" className="text-muted-foreground hover:text-foreground">My orders</Link>
            <Link to="/assistant" className="text-muted-foreground hover:text-foreground">AI assistant</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="font-display text-xs font-semibold tracking-wider text-foreground uppercase">Legal</p>
            {LEGAL_PAGES.map((page) => (
              <Link key={page.to} to={page.to} className="text-muted-foreground hover:text-foreground">
                {page.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="font-display text-xs font-semibold tracking-wider text-foreground uppercase">Reach us</p>
            <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Mail className="h-4 w-4" /> {settings.contact_email}
            </a>
            <a href={`https://wa.me/${settings.contact_whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <MessageCircle className="h-4 w-4" /> WhatsApp us
            </a>
            <p className="text-muted-foreground">{settings.business_hours}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Grievance officer: {grievance.name} ·{" "}
              <a href={`mailto:${grievance.email}`} className="hover:text-foreground">{grievance.email}</a>
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.business_legal_name}. All prices in INR
            {settings.business_gstin ? ", inclusive of GST." : "; no GST charged."}
          </p>
          <p>Payments secured by Razorpay · Digital delivery only · Refund within 7 days if not as described</p>
        </div>
      </div>
    </footer>
  );
}
