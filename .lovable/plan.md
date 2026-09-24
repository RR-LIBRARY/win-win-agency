# Win Win Digital Agency — Phase 1

A clean, light, professional agency website with a project showcase, plus a simple
"register and book your work" flow with a price estimate that adds a setup charge.

## Pages

- **Home** — headline, what Win Win does, service highlights, featured projects, booking call-to-action
- **Services** — six service areas, each with what's included, starting price and a Book button:
  Software Websites · Mobile & Web Apps · Notion Templates · Ecommerce Stores ·
  Landing Pages · Educational Projects
- **Portfolio** — project showcase grid with filters by service type
- **Project detail** — one page per project: cover image, problem, what was built, result
- **Pricing** — package tiers per service with the setup charge shown clearly
- **Book / Get started** — the main conversion form
- **About** — story, approach, how projects run step by step
- **Contact** — form, email, WhatsApp, response-time promise

## Booking flow (Phase 1)

1. Visitor picks a service and a package.
2. Adds options (extra pages, rush delivery, maintenance).
3. Live estimate updates: package price + options + one-time setup charge, total shown.
4. Fills name, email, phone, project details, budget, deadline.
5. Submits — sees a confirmation with a reference number and next steps.

The **Buy** button on each package sends the visitor into this same flow with the
package pre-filled. Real online payment is not switched on in this phase; the
button collects the booking and total so you can send a payment link. Payment
checkout is listed under Later.

## Design

Clean light look: white and soft grey surfaces, deep navy text, blue accent.
Generous spacing, crisp cards, restrained motion. Distinct typeface pairing so it
does not look like a template. Works on phone and desktop.

## Content

I will write realistic placeholder copy and generate matching cover images for six
sample showcase projects. Every name, price, phone number and email in it will be
invented — send me your real services list, prices, setup charge amount, contact
details and project screenshots and I will swap them in.

## Later phases (not in this build)

- User accounts and customer panel (booking status, files, invoices)
- Admin panel (manage services, prices, projects, incoming bookings)
- Online payment checkout with the setup charge applied
- Bookings saved to a database with email notifications

## Technical notes

- TanStack Start routes: `/` (replaces the placeholder home), `/services`,
  `/portfolio`, `/portfolio/$slug`, `/pricing`, `/book`, `/about`, `/contact`.
  Each leaf route gets its own `head()` with unique title, description and OG tags.
- Shared header/footer in `src/routes/__root.tsx` around `<Outlet />`.
- Light theme tokens (white / #F4F5F7 / #1B1F3B / #3B82F6) added to `src/styles.css`
  as oklch semantic tokens; no hardcoded colour utilities in components.
- Estimate calculator is client-side pure state; pricing config in one typed module
  so prices are edited in one place.
- Booking submit goes through a `createServerFn` that validates with Zod; with no
  backend enabled yet it returns a reference number and logs server-side. Enabling
  Lovable Cloud later persists bookings and powers the panels without reworking the form.
- Fonts loaded via `<link>` in the root route head, never a CSS URL import.
