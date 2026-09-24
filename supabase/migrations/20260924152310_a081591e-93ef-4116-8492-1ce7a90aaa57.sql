-- ========= helpers =========
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========= roles =========
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users read own roles"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());
create policy "Admins read all roles"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins grant roles"
  on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins revoke roles"
  on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') and user_id <> auth.uid());

-- ========= profiles =========
create table public.profiles (
  id uuid primary key,
  email text not null default '',
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "Admins read all profiles"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- new user -> profile + 'user' role; the very first account becomes admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========= site settings =========
create table public.site_settings (
  key text primary key,
  value text not null default '',
  label text not null default '',
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon;
grant select, insert, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;

create policy "Anyone reads settings"
  on public.site_settings for select to anon, authenticated
  using (true);
create policy "Admins insert settings"
  on public.site_settings for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update settings"
  on public.site_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

insert into public.site_settings (key, value, label) values
  ('edutech_demo_url', 'https://jsrcoaching.vercel.app/', 'EdTech live demo link'),
  ('edutech_demo_label', 'JSR Coaching — live demo', 'EdTech demo button text'),
  ('contact_email', 'hello@winwindigital.example', 'Contact email'),
  ('contact_whatsapp', '910000000000', 'WhatsApp number (with country code, digits only)'),
  ('business_hours', 'Mon–Sat, 10am–7pm IST', 'Business hours'),
  ('store_announcement', '', 'Store announcement bar (leave empty to hide)');

-- ========= templates (Notion products) =========
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  tagline text not null default '',
  description text not null default '',
  category text not null default 'productivity',
  price integer not null default 0,
  compare_at_price integer,
  cover_image_url text,
  gallery_urls text[] not null default '{}',
  includes text[] not null default '{}',
  highlights text[] not null default '{}',
  preview_url text,
  faq jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  rating numeric(2,1) not null default 5.0,
  sales_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.templates to anon;
grant select, insert, update, delete on public.templates to authenticated;
grant all on public.templates to service_role;
alter table public.templates enable row level security;

create policy "Anyone reads published templates"
  on public.templates for select to anon, authenticated
  using (is_published = true);
create policy "Admins read all templates"
  on public.templates for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert templates"
  on public.templates for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update templates"
  on public.templates for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete templates"
  on public.templates for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index templates_published_idx on public.templates (is_published, sort_order);
create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- private delivery details (duplicate link) — only admins and paid buyers
create table public.template_deliverables (
  template_id uuid primary key references public.templates(id) on delete cascade,
  duplicate_url text not null default '',
  guide_url text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.template_deliverables to authenticated;
grant all on public.template_deliverables to service_role;
alter table public.template_deliverables enable row level security;

create trigger template_deliverables_set_updated_at
  before update on public.template_deliverables
  for each row execute function public.set_updated_at();

-- ========= orders (template purchases) =========
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid,
  template_id uuid not null references public.templates(id),
  template_title text not null,
  amount integer not null default 0,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null default '',
  note text not null default '',
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'delivered', 'cancelled')),
  payment_reference text not null default '',
  admin_note text not null default '',
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant insert on public.orders to anon;
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;

create policy "Guests place orders"
  on public.orders for insert to anon
  with check (user_id is null and status = 'pending_payment');
create policy "Users place own orders"
  on public.orders for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending_payment');
create policy "Users read own orders"
  on public.orders for select to authenticated
  using (user_id = auth.uid());
create policy "Admins read all orders"
  on public.orders for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update orders"
  on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- deliverables policies (need orders to exist first)
create policy "Admins manage deliverables"
  on public.template_deliverables for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Buyers read delivered templates"
  on public.template_deliverables for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.template_id = template_deliverables.template_id
      and o.user_id = auth.uid()
      and o.status = 'delivered'
  ));

-- ========= bookings (project requests) =========
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid,
  service_slug text not null,
  service_name text not null,
  package_id text not null,
  package_name text not null,
  add_on_ids text[] not null default '{}',
  package_price integer not null default 0,
  add_ons_total integer not null default 0,
  setup_fee integer not null default 0,
  total integer not null default 0,
  name text not null,
  email text not null,
  phone text not null,
  company text not null default '',
  deadline text not null default '',
  details text not null default '',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'in_progress', 'completed', 'cancelled')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant insert on public.bookings to anon;
grant select, insert, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;

create policy "Guests create bookings"
  on public.bookings for insert to anon
  with check (user_id is null and status = 'new');
create policy "Users create own bookings"
  on public.bookings for insert to authenticated
  with check (user_id = auth.uid() and status = 'new');
create policy "Users read own bookings"
  on public.bookings for select to authenticated
  using (user_id = auth.uid());
create policy "Admins read all bookings"
  on public.bookings for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update bookings"
  on public.bookings for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index bookings_user_idx on public.bookings (user_id, created_at desc);
create index bookings_status_idx on public.bookings (status, created_at desc);
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ========= seed: six Notion templates =========
insert into public.templates
  (slug, title, tagline, description, category, price, compare_at_price, includes, highlights, preview_url, faq, is_published, is_featured, sort_order, rating, sales_count)
values
(
  'second-brain-os',
  'Second Brain OS',
  'Notes, tasks, projects and goals — one calm dashboard.',
  'A complete personal operating system for Notion. Capture anything in seconds, link it to projects and goals, and run a weekly review that actually sticks. Built for students, founders and freelancers who are tired of scattered notes.',
  'productivity', 999, 1499,
  array['Master dashboard with today / this week views', '6 linked databases (Inbox, Notes, Tasks, Projects, Areas, Goals)', 'Weekly review + monthly reset templates', '15-minute setup video (Hindi + English)', 'Lifetime updates'],
  array['PARA + GTD workflow, simplified', 'Works on mobile and desktop', 'No paid Notion plan needed'],
  'https://www.notion.so/templates',
  '[{"q":"Do I need Notion Plus?","a":"No — it works on the free plan."},{"q":"Can I customise it?","a":"Yes, every database and view is editable. The guide shows how without breaking links."}]'::jsonb,
  true, true, 1, 4.9, 212
),
(
  'freelancer-crm',
  'Freelancer CRM & Client Tracker',
  'Leads, proposals, invoices and follow-ups in one place.',
  'Replace a ₹2,000/month CRM with one Notion system. Track every lead from first message to paid invoice, log calls, set follow-up reminders and see your monthly pipeline at a glance.',
  'business', 1499, 2499,
  array['Pipeline board (Lead → Proposal → Won → Delivered)', 'Client, project and invoice databases', 'Follow-up reminder view', 'Proposal + invoice page templates', 'Revenue dashboard by month'],
  array['Built for agencies and solo consultants', 'Invoice numbering built in', 'Export-friendly for your CA'],
  'https://www.notion.so/templates',
  '[{"q":"Is it a one-time payment?","a":"Yes — pay once, use forever, free updates."},{"q":"Can my team use it?","a":"Yes, share the page with your team in Notion."}]'::jsonb,
  true, true, 2, 4.8, 148
),
(
  'content-calendar-studio',
  'Content Calendar Studio',
  'Plan, script and publish across Instagram, YouTube and LinkedIn.',
  'A creator-first content system: idea bank, scripting pages, a publish calendar with platform tags, and a performance log so you know what to make more of.',
  'creators', 799, 1299,
  array['Calendar + kanban + list views', 'Idea bank with hooks library', 'Script & caption templates', 'Platform checklist (IG, YT, LinkedIn, X)', 'Monthly analytics log'],
  array['Batch a month of content in one sitting', 'Repurposing tracker included', 'Mobile friendly'],
  'https://www.notion.so/templates',
  '[{"q":"Does it post automatically?","a":"No — Notion cannot post for you. It keeps your planning and scripts organised."}]'::jsonb,
  true, false, 3, 4.8, 96
),
(
  'money-tracker-india',
  'Money Tracker India',
  'Budgets, EMIs, SIPs and expenses — in rupees, by design.',
  'A personal finance dashboard made for Indian households: monthly budget vs actual, EMI schedule, SIP and FD tracker, and a net-worth page that updates itself.',
  'finance', 699, 999,
  array['Monthly budget with category rollups', 'Expense log with quick-add button', 'EMI & loan tracker', 'SIP / FD / gold investment tracker', 'Net worth dashboard'],
  array['₹ formatting throughout', 'Festival & annual expense planner', 'Works on the free plan'],
  'https://www.notion.so/templates',
  '[{"q":"Does it connect to my bank?","a":"No — entries are manual, which keeps your data private."}]'::jsonb,
  true, false, 4, 4.7, 173
),
(
  'student-study-planner',
  'Student Study Planner',
  'Syllabus tracker, revision cycles and exam countdowns.',
  'Built for board, JEE/NEET, SSC and college exams. Break each subject into chapters, track first read → revision → test, and let the dashboard tell you what to study today.',
  'education', 499, 799,
  array['Subject & chapter tracker with progress bars', 'Spaced-revision schedule (1-7-30 day)', 'Exam countdown dashboard', 'Daily timetable + Pomodoro log', 'Mistake notebook'],
  array['Hindi + English guide', 'Used by coaching students', 'Free plan friendly'],
  'https://www.notion.so/templates',
  '[{"q":"Can a coaching institute buy it for students?","a":"Yes — contact us for a bulk licence at a lower per-student price."}]'::jsonb,
  true, false, 5, 4.9, 264
),
(
  'coaching-institute-manager',
  'Coaching Institute Manager',
  'Batches, fees, attendance and tests for small tuition centres.',
  'Run a small coaching centre from Notion before you need a full app. Track students by batch, record attendance, log fee payments and dues, schedule tests and store study material links — all in one workspace.',
  'education', 1299, 1999,
  array['Student, batch and teacher databases', 'Attendance register (daily view)', 'Fee ledger with pending-dues view', 'Test schedule + marks entry', 'Study material & notice board'],
  array['Perfect step before a custom app', 'Fee reminder list for WhatsApp', 'Setup call available as add-on'],
  'https://www.notion.so/templates',
  '[{"q":"Can it send fee reminders?","a":"It gives you a ready pending-dues list; you send reminders on WhatsApp. For automated reminders, book our EdTech app service."},{"q":"How many students can it handle?","a":"Comfortably a few hundred. Beyond that we recommend a custom app."}]'::jsonb,
  true, true, 6, 4.9, 58
);