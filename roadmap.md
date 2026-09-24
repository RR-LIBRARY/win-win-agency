# Win Win Digital Agency — Roadmap

## Done
- [x] Parallel + Perplexity connected in the current workspace (re-done after each workspace move; last 16:16 UTC)
- [x] Supabase "Win Win Agency" (user's own project) linked; schema, RLS, seed templates applied
- [x] Research (Parallel + Perplexity): Gumroad/Fiverr marketplace UX, Notion template pricing, EdTech-for-coaching features
- [x] Service lines v2: Websites, Apps, Educational Projects (EdTech demo link editable in admin), Notion Templates, Software Consulting, PDF Storage
- [x] Notion template store (Gumroad-style): /templates, /templates/$slug, /checkout (guest or signed-in, manual payment flow)
- [x] Auth (/auth: sign in, sign up, forgot/reset) + user panel (/account: overview, orders, bookings, profile)
- [x] Admin panel (/admin: dashboard, templates CRUD + private delivery links, orders, bookings, site settings, team)
- [x] Bookings + orders persisted in Supabase; guest inserts fixed (no RETURNING under insert-only RLS)
- [x] Home/services/header/footer/contact refreshed for v2 lines; contact + EdTech demo driven by admin settings
- [x] FKs to auth.users (roles/profiles cascade, orders/bookings set null) so deleted accounts free the admin slot

## Ready (next)
- [ ] User adds real Notion duplicate links per template in Admin > Templates (until then "Delivered" shows an email fallback)
- [ ] Online payment (Razorpay/UPI) — later phase, currently order -> admin marks paid -> link unlocked
- [ ] Email/WhatsApp notifications on new order/booking and on delivery
- [ ] Contact form persistence (currently toast-only) — save to a `messages` table + admin inbox
- [ ] Coupon codes / launch discounts for templates
- [ ] Replace placeholder prices, contact details, portfolio screenshots and copy with real data from user
- [ ] Optional: Supabase linter WARN "Signed-in users can execute SECURITY DEFINER function" (pre-existing, has_role is scoped to auth.uid())
