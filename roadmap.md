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
- [ ] BLOCKED (user action): Supabase link dropped in the 04:17 move — service-role env missing; user must reconnect `Win Win Agency` (ref cgygrzuacnbuilqyqemk) in Project Settings → Connectors → Supabase. Then re-verify REST + `product-files` bucket and apply `db/pending/20260925_external_products.sql` via the migration tool.
- [ ] User request 04:41: verify this session's changes are committed/pushed to GitHub (RR-LIBRARY/win-win-agency main), audit how much work is done, report
- [x] Workspace moved again (04:38 UTC): Parallel, Perplexity, GitHub reconnected; Supabase still unlinked (user action pending)
- [x] Research (Parallel + Perplexity): software store page anatomy, checkout conversion (UPI-first, single page, trust near CTA), Razorpay Orders/Checkout/Webhook guidance, license delivery, GST invoicing
- [ ] Schema: products (software fields, tiers, changelog), orders (Razorpay ids, tier, invoice no., access token), payment_events (idempotent webhook log), license_keys
- [ ] Razorpay: server-side order creation, signature verification, webhook (HMAC, idempotent), reconcile-with-Razorpay fallback, graceful manual fallback when keys are missing
- [ ] Auto-delivery on payment: Notion link / download / license key; guest order page via secure access link; invoice number + printable receipt
- [ ] Store UI v3: /store + /store/$slug (tiers, changelog, tech stack, demo), single-page checkout, order success page, account + admin updates, /templates redirects
- [ ] Seed 4 software products with covers
- [ ] Tests: vitest unit (signatures, webhook idempotency, pricing, license format) + Playwright e2e (browse → product → checkout → order → account/admin)
- [ ] Audits: senior-architect review, red-team pass on payment/webhook/IDOR, Supabase linter
- [ ] Backup tarball to Files; memory notes; request RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET from user

## In progress — AI assistant & agents (user request 04:10 UTC)
- [ ] Business AI assistant (site-wide widget + /assistant page): answers address/directions (map link), service fee structure, product rates, delivery & refund policy, contact/hours — grounded in live catalog + settings via tools
- [ ] Personal agent mode for signed-in users: my orders / payment status / download & licence help / bookings (auth-scoped tools, RLS)
- [ ] Doubt assistant mode (students/coaching): step-by-step doubt solving in Hindi/English
- [ ] Rule enforced in tools + copy: digital products never delivered before payment; paid orders unlock instantly (already the fulfilment design)
- [ ] Address on map: business address + map embed/directions link on contact page + assistant answers
- [x] GitHub: Lovable two-way sync pushes every change automatically to RR-LIBRARY/win-win-agency (no manual commits needed); connector re-linked after each move

## In progress — user request 04:25 UTC
- [ ] Fix login ("Jkao am chal rha hai" — screenshot uploaded): reproduce sign-in flow, fix root cause
- [ ] External digital products: admin can paste a link (Gumroad, Amazon book, Fiverr gig, Udemy, Play Store, etc.) → product card in the store that opens the external page ("Buy on Gumroad"), no checkout/delivery inside the site; platform auto-detected from URL; badge + icon; also allow more link types (YouTube course, blog, GitHub)

## Ready (next)
- [ ] User adds Razorpay keys (test first, then live) and sets the webhook URL in the Razorpay dashboard
- [ ] Email/WhatsApp notifications on paid order + delivery (needs an email provider connection)
- [ ] Replace placeholder prices, contact details, GSTIN, portfolio screenshots and copy with real data
- [ ] Optional: Supabase linter WARN "Signed-in users can execute SECURITY DEFINER function" (pre-existing, has_role scoped to auth.uid())
