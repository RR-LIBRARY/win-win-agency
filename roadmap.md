# Win Win Digital Agency — Roadmap

## Done
- [x] Site v3 live: services, store (software + Notion + external products), Razorpay-ready checkout, licences, admin panel, AI assistant, legal pages, a11y pass (Axe 0 violations)
- [x] Premium polish: Find-your-fit advisor, mobile product page + sticky buy bar, contact next-steps
- [x] Tests: vitest unit 136, Playwright e2e desktop + mobile, security spec
- [x] 2026-09-25 09:05 UTC: new workspace — Parallel + Perplexity re-linked, repo restored from GitHub main (45fd34e), preview verified against Supabase `Win Win Agency`
- [x] Research (Parallel + Perplexity): social-proof placement, verified-review UX, BIS IS 19000:2022 online-review requirements (published criteria, author consent, verified identity, no purchased reviews, moderation against published criteria)

## Workspace move (09:19 UTC) — re-link connectors
- [x] 09:21 UTC: Parallel, Perplexity and GitHub re-linked in the new workspace (new connection ids; old ones void)
- [x] 09:41 UTC: workspace move #3 — Parallel + Perplexity re-linked (GitHub: re-link before next push)
- [x] 09:30 UTC: workspace move #2 — Parallel, Perplexity, GitHub re-linked again (ids in memory)
- [x] 10:30 UTC: Supabase "Win Win Agency" connected; reviews/videos/docs tables applied via migration; SQL moved to db/applied/

## In progress — link-only media + real reviews (user request 09:02 UTC)
Constraint: Supabase free tier → no storage uploads; videos/docs are links only; minimal extra queries (denormalised review stats on templates).
- [x] Migration applied (product_reviews, site_videos, product_docs + review stats): product_reviews (verified-purchase, moderation, admin reply, stats trigger → templates.review_count/review_avg), site_videos (YouTube/Vimeo link), product_docs (link or Markdown, public/buyers)
- [x] Pure libs + unit tests: video-links (YouTube/Vimeo parsing, nocookie embed, poster), doc-links (Google Docs/Sheets/Slides/Drive/Notion/PDF/GitHub detection + preview URL), review rules (eligibility, criteria, sanitising)
- [x] Server functions: reviews (public list, featured, submit for delivered orders — signed-in or guest key, admin moderate), videos (public by placement, admin CRUD), docs (public + buyer docs, admin CRUD)
- [x] Public UI: lite privacy-enhanced video embed (click-to-load, transcript), home video section, home "What clients say" from approved reviews (hidden when none), product page Reviews + Documentation sections, real rating on cards/buy panel
- [x] Buyer UI: review form + status on order page and account orders (verified purchase, criteria consent), docs list on delivered orders
- [x] Admin: Reviews page (moderate/reply), Videos page (paste link → preview, publish, order), product editor Documentation section, nav + pending-review badge
- [x] Graceful degradation until the migration is applied (missing tables → empty sections, no errors)
- [x] Verify: build OK, unit tests, e2e + Axe, desktop + mobile screenshots
- [x] Push to GitHub main via scripts/github-sync.py

## Goal (09:29 UTC) — end-to-end order flow + premium UI + Razorpay
- [ ] Razorpay: explain keys needed (Key ID, Key Secret, Webhook Secret), open the secure form; wire secrets into existing razorpay.server.ts; webhook URL for the dashboard; test-mode verification
- [ ] Act as client: browse → product → checkout → order page (bank transfer + Razorpay test) → review link; screenshots desktop + mobile
- [ ] Act as admin: sign in as naveenbharatprism@gmail.com → orders → mark paid/delivered → licence/delivery → moderate review → reply; verify buyer sees delivery + docs
- [ ] Premium UI pass: hero, store cards, product page, checkout, order page, admin polish; motion respecting reduced-motion; AA contrast; Axe 0 serious/critical
- [x] Record blockers needing the user (Supabase link for migration, Razorpay keys, admin password/session)

## Ready (next)
- [x] Supabase linked + migration applied; checkout verified live (order row + Razorpay order created in test mode)
- [ ] User adds Razorpay keys (test first, then live) and sets the webhook URL in the Razorpay dashboard
- [ ] Email/WhatsApp notifications on paid order + delivery (needs an email provider connection)
- [x] Assistant knowledge: include product doc titles + review summary
- [ ] Replace placeholder prices, contact details, GSTIN, portfolio screenshots and copy with real data
- [x] Audits: senior-architect review, red-team pass on payment/webhook/IDOR, Supabase linter

## 2026-09-25 Razorpay + E2E status
- [x] GitHub re-linked in new workspace (std_01m3bzj96kfnzav1n8a1n5fgqh)
- [x] Razorpay secrets saved: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
- [x] Typecheck clean, 185/185 unit tests pass, build OK
- [x] Checkout UI verified: form, editions, Razorpay option render correctly
- [x] BLOCKED: live order creation fails — SUPABASE_SERVICE_ROLE_KEY missing. User must connect Supabase "Win Win Agency" (Project Settings → Connectors → Supabase). Then: run db/pending/20260925_reviews_videos_docs.sql, then full client→payment→admin delivery E2E.
- [ ] Razorpay webhook URL to configure in Razorpay dashboard after publish: /api/public/webhooks/razorpay

## 2026-09-25 11:13 UTC — live Vercel deploy verified (winwinagency.vercel.app)
- [x] Site live and healthy: store loads 5 products, product/checkout/legal pages render, no console errors
- [x] Admin locked: /admin, /admin/payments, /admin/reviews, /admin/videos, /admin/templates → redirect to /auth?redirect=… (browser-verified)
- [x] Secret files not reachable: /.env, /.env.local, /.git/config, /server/.env, /.vercel/project.json all 404
- [x] Webhook refuses unsigned/bogus-signature posts (no fulfilment path opened)
- [ ] BLOCKED (needs user, Vercel → Settings → Environment Variables + Redeploy):
  - RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing → checkout shows only "Bank transfer / UPI", no "Pay online" option
  - RAZORPAY_WEBHOOK_SECRET missing → /api/public/webhooks/razorpay returns 503 not_configured
  - LOVABLE_API_KEY missing → /api/public/assistant returns 503 "not configured yet"
- [ ] Placeholder contact data is LIVE on the site: hello@winwindigital.example + "Grievance Officer" (site_settings.contact_email default in src/lib/settings.functions.ts) — real email/grievance details needed from the user
- [ ] Razorpay dashboard webhook: https://winwinagency.vercel.app/api/public/webhooks/razorpay (after keys are added)
- [ ] CONFIRMED BROKEN ON LIVE: placing an order returns "The store is temporarily unavailable … (ref: STORE-CONFIG)" — a server env var is missing in the Vercel deployment, so no customer can order right now. Runtime vars the server reads: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, LOVABLE_API_KEY.
- [x] NOTE: `.env` is tracked in the repo (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID + non-VITE mirrors). Values are publishable/URLs only — no secret key inside, so no rotation needed — but the same three VITE_ vars should be set in Vercel so the build does not depend on the committed file.
- [ ] User chose "later" for real contact email + grievance officer details (placeholder stays live for now).

- [ ] 2026-09-25 re-check: live order still fails with STORE-CONFIG; live webhook returns 503 (Razorpay secret missing in Vercel). Waiting on user Vercel env vars + Redeploy.
- [ ] Workspace move: re-link Parallel, Perplexity, GitHub; then push assistant change
