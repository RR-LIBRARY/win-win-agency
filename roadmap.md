# Win Win Digital Agency — Roadmap

## Done
- [x] Parallel + Perplexity connected in the current workspace (re-done after each workspace move)
- [x] Supabase "Win Win Agency" (user's own project) linked; schema, RLS, seed templates applied
- [x] Research (Parallel + Perplexity): Gumroad/Fiverr marketplace UX, Notion template pricing, EdTech-for-coaching features
- [x] Service lines v2: Websites, Apps, Educational Projects, Notion Templates, Software Consulting, PDF Storage
- [x] Notion template store (Gumroad-style), auth, user panel, admin panel, bookings, contact inbox, coupons

## In progress — Software store v3 (deep research + Razorpay)
- [x] Workspace moved (03:37 UTC): Parallel, Perplexity and GitHub reconnected; Supabase `Win Win Agency` verified still linked (REST + service role OK)
- [x] Workspace moved again (03:51 UTC): Parallel + Perplexity reconnected
- [x] Supabase `Win Win Agency` re-verified (REST 200, bucket `product-files` present); GitHub re-linked (03:53 UTC)
- [x] Workspace moved again (04:06 UTC): Parallel, Perplexity, GitHub reconnected; Supabase verified (REST 200)
- [x] Workspace moved again (04:17 UTC): Parallel, Perplexity, GitHub reconnected
- [x] Supabase `Win Win Agency` relinked by user 06:08 UTC; REST 200, `product-files` bucket present, service role live; `db/applied/20260925_external_products.sql` applied via migration tool 06:10 UTC
- [x] 04:41 GitHub: Lovable git-sync had stopped at 01:48 UTC (workspace moves). Pushed commit 31a14be to RR-LIBRARY/win-win-agency main via GitHub API (`scripts/github-sync.py`, 58 files). Verified 0 diff. Re-run the script after every milestone.
- [x] Workspace moved again (04:38 UTC): Parallel, Perplexity, GitHub reconnected; Supabase still unlinked (user action pending)
- [x] Workspace moved again (05:27 UTC): Parallel + Perplexity reconnected
- [x] Workspace moved again (05:40 UTC, user request): Parallel + Perplexity reconnected (05:44 UTC)
- [x] Workspace moved again (06:07 UTC, user request): Parallel + Perplexity reconnected (06:09)
- [ ] GitHub: re-link connector, then dry-run + push (scripts/github-sync.py)
- [x] 06:08 UTC user request: Supabase `Win Win Agency` connected + verified; external-products migration applied; live guest purchase e2e passes (order → private order page → no leak without key); e2e cleans its test orders
- [x] Checkout hardening found by live e2e: hidden `product` field keeps the buyer on checkout if the form submits before the page is interactive; `html[data-hydrated]` + `form[data-ready]` readiness flags
- [x] Research (Parallel + Perplexity): software store page anatomy, checkout conversion (UPI-first, single page, trust near CTA), Razorpay Orders/Checkout/Webhook guidance, license delivery, GST invoicing
- [x] Schema: products (software fields, tiers, changelog), orders (Razorpay ids, tier, invoice no., access token), payment_events (idempotent webhook log), license_keys — applied 03:32 UTC
- [x] Razorpay: server-side order creation, signature verification, webhook (HMAC, idempotent), reconcile-with-Razorpay fallback, graceful manual fallback when keys are missing (code done; live keys still needed)
- [x] Auto-delivery on payment: Notion link / download / license key; guest order page via secure access link; invoice number + printable receipt
- [x] Store UI v3: /store + /store/$slug (tiers, changelog, tech stack, demo), single-page checkout, order success page, account + admin updates, /templates redirects
- [x] Seed 4 software products with covers
- [x] Customer-safe error middleware (global): infrastructure errors (missing keys, DB, network) never reach customers — calm message + STORE-* reference code, real error logged server-side
- [x] Legal/compliance pages (research-driven, Razorpay activation + Consumer Protection E-Commerce Rules + DPDP): /terms, /privacy, /refund-policy, /delivery-policy, grievance officer + business identity in footer/settings, policy consent line on checkout
- [x] Tests: vitest unit — 9 files / 125 tests (signatures, webhook idempotency, pricing, licence format + atomic activation, fulfilment concurrency, external platforms, settings/catalog, customer-safe errors); Playwright e2e — 32 pass on desktop + mobile (public pages + Axe a11y, store/checkout, security headers/endpoints); 2 flows gated behind E2E_FULL=1 (need backend + Razorpay test keys)
- [x] Security fix: atomic (compare-and-swap) licence activation counter in /api/public/license/verify
- [ ] Audits: senior-architect review, red-team pass on payment/webhook/IDOR, Supabase linter
- [x] Backup tarball to Files (win-win-agency-backup/…-0445.tar.gz); memory notes
- [ ] Request RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET from user (after Supabase relink)

## In progress — AI assistant & agents (user request 04:10 UTC)
- [x] Business AI assistant (site-wide widget + /assistant page): answers address/directions (map link), service fee structure, product rates, delivery & refund policy, contact/hours — grounded in live catalog + settings via tools (verified end-to-end 05:10 UTC: tool call → live products → answer)
- [x] Personal agent mode for signed-in users: my orders / payment status / download & licence help / bookings (auth-scoped tools, RLS)
- [x] Doubt assistant mode (students/coaching): step-by-step doubt solving in Hindi/English
- [x] Rule enforced in tools + copy: digital products never delivered before payment; paid orders unlock instantly (already the fulfilment design)
- [x] Address on map: business address + map embed/directions link on contact page + assistant answers (shows once admin saves address/map URL in settings)
- [x] GitHub: automatic sync is NOT reliable after workspace moves — use `python3 scripts/github-sync.py` (dry-run first) after each milestone; connector re-linked after each move

## In progress — user request 04:25 UTC
- [ ] Fix login ("Jkao am chal rha hai" — screenshot uploaded): reproduce sign-in flow, fix root cause
- [ ] External digital products: admin can paste a link (Gumroad, Amazon book, Fiverr gig, Udemy, Play Store, etc.) → product card in the store that opens the external page ("Buy on Gumroad"), no checkout/delivery inside the site; platform auto-detected from URL; badge + icon; also allow more link types (YouTube course, blog, GitHub)

## In progress — Premium "expert consultant" UX/UI + accessibility (user request 05:33 UTC)
- [x] Accessibility review (Axe, WCAG 2.1 AA + best-practice) on 23 pages → 0 violations: AA-contrast primary blue + muted text, underlined inline links, visible focus rings, reduced-motion, rating role=img, store products heading + live count, product spec/checkout <dl> markup, assistant widget = real dialog (labelled, Escape closes, focus in → composer, focus back to launcher)
- [ ] Premium/human-friendly polish: consultant-style home (clear promise, proof, process, trust), warmer copy, consistent spacing/typography rhythm, refined cards/CTAs, calm motion, empty/loading/error states
- [ ] Verify with screenshots (desktop + mobile) and re-run unit + e2e tests after the polish

## Ready (next)
- [ ] User adds Razorpay keys (test first, then live) and sets the webhook URL in the Razorpay dashboard
- [ ] Email/WhatsApp notifications on paid order + delivery (needs an email provider connection)
- [ ] Replace placeholder prices, contact details, GSTIN, portfolio screenshots and copy with real data
- [ ] Optional: Supabase linter WARN "Signed-in users can execute SECURITY DEFINER function" (pre-existing, has_role scoped to auth.uid())
