# Audit result and the remaining work

## What is done and working
- Public site: Home, Services, Portfolio, Pricing, Book, About, Contact
- Notion template store: template list, detail pages, checkout (guest or signed-in)
- Sign in and sign up, plus My Account: orders, downloads, bookings, profile
- Admin panel: dashboard, templates, orders, bookings, site settings (including the EdTech demo link) and team
- Admin account naveenbharatprism@gmail.com is working
- The site currently loads without errors

## What is still missing (to be built now)
1. **Contact form inbox:** messages sent from the Contact page get saved, and a new "Messages" page in the Admin panel shows them and lets you mark them read.
2. **Coupon codes:** the admin creates codes (percent or flat ₹ off, expiry date, usage limit). Buyers enter a code at checkout and the order stores the discounted amount.
3. **New-order alert in Admin:** the Admin menu shows a count of new orders, bookings and messages.
4. **Fresh market check:** use Perplexity and Parallel to look at current Indian Notion-template and agency pricing, then update the placeholder prices and add 2-3 trust sections (reviews, a "How it works" section, guarantees) that are clearly marked as placeholders.

## Waiting on you (cannot be done without you)
- Real Notion duplicate links for each template (Admin > Templates)
- Real contact email, WhatsApp number, prices and portfolio screenshots
- Online payment through Razorpay/UPI (needs your Razorpay account)
- Email/WhatsApp notifications (needs an email domain or WhatsApp provider)

## Technical details
- New tables `contact_messages` and `coupons`, with grants and RLS: anyone can add a message, only admins can read messages; coupons are admin-managed and checked by a server function. `orders` gets `coupon_code` and `discount` columns.
- Server functions go in `src/lib/*.functions.ts`. New admin routes: `admin/messages.tsx` and `admin/coupons.tsx`.
- Research runs as one-off Perplexity search and Parallel calls. No app runtime integration.
