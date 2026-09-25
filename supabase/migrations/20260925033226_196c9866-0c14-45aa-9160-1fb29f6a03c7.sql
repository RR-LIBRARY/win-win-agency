-- ============ PRODUCTS ============
alter table public.templates
  add column if not exists product_type text not null default 'notion_template',
  add column if not exists delivery_type text not null default 'link',
  add column if not exists version text not null default '',
  add column if not exists platforms text[] not null default '{}',
  add column if not exists tech_stack text[] not null default '{}',
  add column if not exists requirements text[] not null default '{}',
  add column if not exists demo_url text,
  add column if not exists video_url text,
  add column if not exists docs_url text,
  add column if not exists changelog jsonb not null default '[]'::jsonb,
  add column if not exists tiers jsonb not null default '[]'::jsonb,
  add column if not exists license_terms text not null default '',
  add column if not exists file_size text not null default '';

create or replace function public.validate_product_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_type not in ('notion_template','software','source_code','saas_tool','mobile_app','plugin') then
    raise exception 'Invalid product_type: %', new.product_type;
  end if;
  if new.delivery_type not in ('link','download','license','access') then
    raise exception 'Invalid delivery_type: %', new.delivery_type;
  end if;
  if new.price < 0 then
    raise exception 'Price cannot be negative';
  end if;
  return new;
end;
$$;

drop trigger if exists templates_validate on public.templates;
create trigger templates_validate
before insert or update on public.templates
for each row execute function public.validate_product_row();

-- ============ DELIVERABLES ============
alter table public.template_deliverables
  add column if not exists download_url text not null default '',
  add column if not exists download_path text not null default '',
  add column if not exists access_url text not null default '',
  add column if not exists issue_license boolean not null default false,
  add column if not exists license_max_activations integer not null default 3;

-- ============ ORDERS ============
alter table public.orders
  add column if not exists currency text not null default 'INR',
  add column if not exists tier_id text not null default '',
  add column if not exists tier_name text not null default '',
  add column if not exists payment_provider text not null default 'manual',
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists payment_method text not null default '',
  add column if not exists amount_paid integer not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_id text,
  add column if not exists failure_reason text not null default '',
  add column if not exists invoice_number text,
  add column if not exists access_token uuid not null default gen_random_uuid(),
  add column if not exists buyer_company text not null default '',
  add column if not exists buyer_gstin text not null default '';

create unique index if not exists orders_razorpay_order_id_key on public.orders (razorpay_order_id) where razorpay_order_id is not null;
create unique index if not exists orders_razorpay_payment_id_key on public.orders (razorpay_payment_id) where razorpay_payment_id is not null;
create unique index if not exists orders_invoice_number_key on public.orders (invoice_number) where invoice_number is not null;
create unique index if not exists orders_reference_unique_idx on public.orders (reference);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_template_id_idx on public.orders (template_id);
create index if not exists orders_status_idx on public.orders (status);

create or replace function public.validate_order_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status not in ('pending_payment','paid','delivered','cancelled','refunded') then
    raise exception 'Invalid order status: %', new.status;
  end if;
  if new.amount < 0 or new.discount < 0 or new.amount_paid < 0 then
    raise exception 'Order amounts cannot be negative';
  end if;
  if new.payment_provider not in ('manual','razorpay') then
    raise exception 'Invalid payment provider: %', new.payment_provider;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_validate on public.orders;
create trigger orders_validate
before insert or update on public.orders
for each row execute function public.validate_order_row();

-- Orders are created only by the server (service role) after server-side price
-- resolution. Remove direct insert paths for visitors and signed-in users.
drop policy if exists "Guests place orders" on public.orders;
drop policy if exists "Users place own orders" on public.orders;
revoke insert on public.orders from anon;
revoke insert on public.orders from authenticated;

-- ============ INVOICE NUMBERS (server-only) ============
create sequence if not exists public.invoice_seq start with 1001;

create or replace function public.next_invoice_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'WWD-' || to_char(now() at time zone 'Asia/Kolkata', 'YY') || '-' || lpad(nextval('public.invoice_seq')::text, 5, '0');
$$;

revoke all on function public.next_invoice_number() from public;
revoke all on function public.next_invoice_number() from anon;
revoke all on function public.next_invoice_number() from authenticated;
grant execute on function public.next_invoice_number() to service_role;

-- ============ PAYMENT EVENTS (webhook idempotency + audit) ============
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'razorpay',
  event_id text,
  event_type text not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  order_id uuid references public.orders(id) on delete set null,
  amount integer,
  status text not null default 'received',
  error text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select on public.payment_events to authenticated;
grant all on public.payment_events to service_role;

alter table public.payment_events enable row level security;

drop policy if exists "Admins read payment events" on public.payment_events;
create policy "Admins read payment events"
on public.payment_events for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create unique index if not exists payment_events_event_id_key on public.payment_events (event_id) where event_id is not null;
create index if not exists payment_events_order_idx on public.payment_events (order_id);
create index if not exists payment_events_payment_idx on public.payment_events (razorpay_payment_id);
create index if not exists payment_events_created_idx on public.payment_events (created_at desc);

-- ============ LICENSE KEYS ============
create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  buyer_email text not null,
  status text not null default 'active',
  max_activations integer not null default 3,
  activations integer not null default 0,
  last_activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, update on public.license_keys to authenticated;
grant all on public.license_keys to service_role;

alter table public.license_keys enable row level security;

drop policy if exists "Users read own licenses" on public.license_keys;
create policy "Users read own licenses"
on public.license_keys for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins read all licenses" on public.license_keys;
create policy "Admins read all licenses"
on public.license_keys for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update licenses" on public.license_keys;
create policy "Admins update licenses"
on public.license_keys for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create index if not exists license_keys_order_idx on public.license_keys (order_id);
create index if not exists license_keys_template_idx on public.license_keys (template_id);
create index if not exists license_keys_user_idx on public.license_keys (user_id);

create or replace function public.validate_license_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status not in ('active','revoked') then
    raise exception 'Invalid license status: %', new.status;
  end if;
  if new.activations < 0 or new.max_activations < 0 then
    raise exception 'Activation counts cannot be negative';
  end if;
  return new;
end;
$$;

drop trigger if exists license_keys_validate on public.license_keys;
create trigger license_keys_validate
before insert or update on public.license_keys
for each row execute function public.validate_license_row();

drop trigger if exists license_keys_set_updated_at on public.license_keys;
create trigger license_keys_set_updated_at
before update on public.license_keys
for each row execute function public.set_updated_at();

-- ============ PRIVATE PRODUCT FILES (storage policies; bucket created separately) ============
drop policy if exists "Admins manage product files" on storage.objects;
create policy "Admins manage product files"
on storage.objects for all to authenticated
using (bucket_id = 'product-files' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'product-files' and public.has_role(auth.uid(), 'admin'));

-- ============ SAMPLE SOFTWARE PRODUCTS ============
insert into public.templates (slug, title, tagline, description, category, price, compare_at_price, includes, highlights, faq, is_published, is_featured, sort_order, rating, sales_count,
  product_type, delivery_type, version, platforms, tech_stack, requirements, changelog, tiers, license_terms, file_size)
values
(
  'edupanel-coaching-erp',
  'EduPanel — Coaching Institute ERP',
  'Complete web app for coaching centres: batches, fees, attendance, tests and a parent app. Full source code.',
  E'EduPanel is the same coaching-centre system we deploy for our clients, packaged as source code you own.\n\nRun admissions, batches and timetables, collect fees with reminders, mark attendance from a phone, publish test results and share study material — all from one admin panel. Students and parents get their own login.\n\nShips with a one-click deploy guide (Vercel + Supabase), sample data, and a video walkthrough. Updates are free for life; buy once and deploy for your institute.',
  'education', 14999, 24999,
  array['Full React + TypeScript source (admin, student & parent portals)','Supabase schema, RLS policies and seed data','Fee management with UPI/Razorpay hooks','Attendance, tests, results and rank lists','Study material & PDF sharing','Deploy guide (Vercel + Supabase) and video walkthrough','12 months of priority email support'],
  array['Deploy in under an hour','Built for Indian coaching centres','Own the code forever'],
  '[{"q":"Do I need a developer to set it up?","a":"No. Follow the 20-minute deploy guide (Vercel + Supabase, both have free tiers). If you get stuck, email us and we set it up on a call."},{"q":"Can I change the branding?","a":"Yes. Logo, colours, institute name and fee heads are all configurable from the admin panel; the code is yours to modify."},{"q":"How do updates work?","a":"Every release is added to your downloads in your account. You get an email when a new version ships."},{"q":"What does the Agency licence add?","a":"It lets you deploy EduPanel for unlimited client institutes and remove our credit line."}]'::jsonb,
  true, true, 0, 4.9, 38,
  'source_code', 'license', '2.4.0',
  array['Web','Android (PWA)','iOS (PWA)'],
  array['React 19','TypeScript','Supabase','Tailwind CSS','Vite'],
  array['Free Supabase project','Free Vercel account','Node.js 20+ on your computer'],
  '[{"version":"2.4.0","date":"2026-08-12","notes":["Parent app with fee reminders on WhatsApp","Rank list export to PDF","Faster attendance screen on low-end phones"]},{"version":"2.3.0","date":"2026-05-02","notes":["Online tests with negative marking","Batch-wise timetable"]},{"version":"2.0.0","date":"2026-01-15","notes":["Rewrite on React 19 + Supabase","New admin dashboard"]}]'::jsonb,
  '[{"id":"single","name":"Single institute","price":14999,"compare_at_price":24999,"description":"Deploy for one coaching centre you run.","includes":["Full source code","Lifetime updates","12 months email support"]},{"id":"agency","name":"Agency licence","price":34999,"compare_at_price":49999,"description":"Deploy for unlimited client institutes.","includes":["Everything in Single","Unlimited client deployments","White-label (no credit line)","Priority WhatsApp support"]}]'::jsonb,
  'One licence per institute (Single) or unlimited client deployments (Agency). Redistribution or resale of the source code itself is not permitted.',
  '48 MB'
),
(
  'gstbill-invoice-app',
  'GSTBill — Invoice & Quotation App',
  'Make GST-compliant invoices, quotations and payment reminders in 30 seconds. Works offline on any laptop or phone.',
  E'A fast, no-nonsense billing app for freelancers, agencies and small shops in India.\n\nCreate GST invoices with the right HSN/SAC codes, CGST/SGST/IGST split, quotations that convert to invoices in one tap, recurring invoices, and UPI QR codes printed on every bill. Your data stays on your device with optional encrypted cloud backup.\n\nIncludes 12 invoice themes, a customer book, expense tracking and a GSTR-1 export.',
  'business', 1499, 2999,
  array['Web app + installable desktop/mobile PWA','12 invoice & quotation themes','UPI QR on every invoice','GSTR-1 CSV export','Customer & product book','Encrypted cloud backup (optional)','Free updates for 1 year'],
  array['30-second invoices','GSTR-1 export','Works offline'],
  '[{"q":"Is it a subscription?","a":"No. Pay once for a personal licence; updates are free for one year and the app keeps working after that."},{"q":"Where is my data stored?","a":"On your device. Turn on encrypted backup to sync across devices."},{"q":"Can my accountant use it?","a":"Yes, the Team licence covers 3 devices."}]'::jsonb,
  true, true, 1, 4.8, 212,
  'software', 'license', '3.1.2',
  array['Windows','macOS','Android','Web'],
  array['React','IndexedDB','PWA','PDF export'],
  array['Any modern browser (Chrome, Edge, Safari)'],
  '[{"version":"3.1.2","date":"2026-09-01","notes":["e-invoice QR support","Bug fixes for IGST rounding"]},{"version":"3.0.0","date":"2026-04-10","notes":["Quotation → invoice conversion","New themes"]}]'::jsonb,
  '[{"id":"personal","name":"Personal","price":1499,"compare_at_price":2999,"description":"1 device, 1 business profile.","includes":["All features","1 year of updates"]},{"id":"team","name":"Team","price":3499,"compare_at_price":5999,"description":"3 devices, unlimited business profiles.","includes":["Everything in Personal","3 device activations","Priority support"]}]'::jsonb,
  'Licence keys are tied to the number of device activations in your plan. Contact us to move a licence to a new device.',
  '9 MB'
),
(
  'whatsapp-lead-bot-kit',
  'WhatsApp Lead Bot Starter Kit',
  'Auto-reply, qualify and route WhatsApp enquiries to Google Sheets or your CRM. Node.js source with a setup video.',
  E'Stop losing leads that message you at midnight. This starter kit connects the official WhatsApp Cloud API to a small Node.js service that greets the lead, asks 3 qualifying questions, tags the answers and drops the row into Google Sheets, Notion or any webhook.\n\nIncludes ready flows for coaching centres, clinics, real-estate and agencies, a Hindi/English message pack, and a 25-minute setup video. Deploys free on Railway or Render.',
  'business', 2999, 4999,
  array['Node.js + TypeScript source code','Meta WhatsApp Cloud API setup guide','4 ready conversation flows','Google Sheets, Notion and webhook connectors','Hindi + English message pack','25-minute setup video'],
  array['Reply in under 2 seconds','No monthly bot fee','Works with the official API'],
  '[{"q":"Do I need a WhatsApp Business API account?","a":"Yes — the guide shows how to get one free from Meta in about 15 minutes."},{"q":"Where does it run?","a":"Anywhere Node.js runs. We show Railway and Render (both have free tiers)."}]'::jsonb,
  true, false, 2, 4.7, 96,
  'source_code', 'download', '1.6.0',
  array['Node.js','Railway','Render','Docker'],
  array['Node.js 20','TypeScript','WhatsApp Cloud API','Google Sheets API'],
  array['Meta developer account','Node.js 20+'],
  '[{"version":"1.6.0","date":"2026-07-20","notes":["Notion connector","Flow editor in YAML"]},{"version":"1.5.0","date":"2026-03-05","notes":["Hindi message pack","Docker image"]}]'::jsonb,
  '[]'::jsonb,
  'Use on unlimited numbers you own. Do not resell the kit itself.',
  '6 MB'
),
(
  'pdfvault-secure-storage',
  'PDFVault — Secure PDF Storage & Sharing',
  'Self-hosted portal to store, watermark and share PDFs with expiring links, view-only mode and download limits.',
  E'For coaching centres, publishers and consultants who share paid PDFs and want control. Upload once, share a link that expires, limit downloads, add a per-user watermark and see who opened what.\n\nRuns on Supabase Storage with signed URLs, so files are never public. Includes an admin panel, a viewer with copy/print protection and an audit log.',
  'productivity', 4999, 7999,
  array['Next-gen React admin panel + viewer','Supabase Storage with signed URLs','Per-user dynamic watermark','Expiring links & download limits','Open/download audit log','Deploy guide + video'],
  array['Files never public','Per-user watermark','Audit every open'],
  '[{"q":"How big can files be?","a":"Up to 50 MB per PDF on Supabase free tier; larger on paid tiers."},{"q":"Can I brand the viewer?","a":"Yes — logo, colours and footer text are settings."}]'::jsonb,
  true, false, 3, 4.8, 54,
  'software', 'license', '1.2.0',
  array['Web'],
  array['React','Supabase Storage','PDF.js','Tailwind CSS'],
  array['Supabase project','Vercel or Netlify account'],
  '[{"version":"1.2.0","date":"2026-06-30","notes":["Download limits per link","Bulk upload"]},{"version":"1.0.0","date":"2026-02-01","notes":["First release"]}]'::jsonb,
  '[{"id":"single","name":"Single site","price":4999,"compare_at_price":7999,"description":"One deployment for your business.","includes":["Full source","Lifetime updates"]},{"id":"agency","name":"Agency","price":11999,"compare_at_price":17999,"description":"Unlimited client deployments.","includes":["Everything in Single","White-label","Priority support"]}]'::jsonb,
  'One deployment per licence (Single). Agency allows unlimited client deployments.',
  '21 MB'
)
on conflict (slug) do nothing;

insert into public.template_deliverables (template_id, issue_license, license_max_activations, notes)
select t.id, true, case when t.slug = 'gstbill-invoice-app' then 3 else 5 end, ''
from public.templates t
where t.slug in ('edupanel-coaching-erp','gstbill-invoice-app','pdfvault-secure-storage')
on conflict (template_id) do update set issue_license = excluded.issue_license, license_max_activations = excluded.license_max_activations;