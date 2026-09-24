import { Link } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="font-display text-lg font-semibold text-foreground">Win Win Digital</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A small studio building websites, apps, stores and learning platforms for founders,
              shops and institutes.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <Link to="/services" className="text-muted-foreground hover:text-foreground">
              Services
            </Link>
            <Link to="/portfolio" className="text-muted-foreground hover:text-foreground">
              Work
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link to="/book" className="text-muted-foreground hover:text-foreground">
              Book your work
            </Link>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <a
              href="mailto:hello@winwindigital.example"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-4 w-4" /> hello@winwindigital.example
            </a>
            <a
              href="https://wa.me/910000000000"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp us
            </a>
            <p className="text-muted-foreground">Mon-Sat, 10am - 7pm IST</p>
          </div>
        </div>

        <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Win Win Digital Agency. Sample contact details — replace with
          your own.
        </p>
      </div>
    </footer>
  );
}
