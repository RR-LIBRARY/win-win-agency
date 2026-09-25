-- ============ REVIEWS, LINK-ONLY VIDEOS, LINK-ONLY PRODUCT DOCS ============
-- Apply in Supabase SQL editor (project "Win Win Agency") — then move this file to db/applied/.
-- Free-tier friendly: no storage buckets; review stats denormalised on templates
-- so store listings need no extra query.

-- ---------- templates: denormalised review stats ----------
alter table public.templates
  add column if not exists review_count integer not null default 0,
  add column if not exists review_avg numeric(2,1) not null default 0;

-- ---------- product_reviews ----------
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  verified_purchase boolean not null default true,
  accepted_terms boolean not null default false,
  admin_reply text not null default '',
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.product_reviews to anon;
grant select, insert, update, delete on public.product_reviews to authenticated;
grant all on public.product_reviews to service_role;

alter table public.product_reviews enable row level security;

drop policy if exists "Anyone reads approved reviews" on public.product_reviews;
create policy "Anyone reads approved reviews"
on public.product_reviews for select to anon, authenticated
using (status = 'approved');

drop policy if exists "Users read own reviews" on public.product_reviews;
create policy "Users read own reviews"
on public.product_reviews for select to authenticated
using (user_id = auth.uid());

-- Signed-in buyers may review an order they own once it is paid/delivered.
-- Guest buyers (access-key links) are handled by the server with the service role.
drop policy if exists "Buyers review own paid orders" on public.product_reviews;
create policy "Buyers review own paid orders"
on public.product_reviews for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and accepted_terms = true
  and exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
      and o.template_id = product_reviews.template_id
      and o.status in ('paid','delivered')
  )
);

drop policy if exists "Admins read all reviews" on public.product_reviews;
create policy "Admins read all reviews"
on public.product_reviews for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins moderate reviews" on public.product_reviews;
create policy "Admins moderate reviews"
on public.product_reviews for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete reviews" on public.product_reviews;
create policy "Admins delete reviews"
on public.product_reviews for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

create index if not exists product_reviews_template_idx on public.product_reviews (template_id, status, created_at desc);
create index if not exists product_reviews_user_idx on public.product_reviews (user_id);
create index if not exists product_reviews_status_idx on public.product_reviews (status, created_at desc);

drop trigger if exists product_reviews_set_updated_at on public.product_reviews;
create trigger product_reviews_set_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

-- Keep templates.review_count / review_avg in sync (approved reviews only).
create or replace function public.refresh_template_review_stats(_template_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.templates t
  set review_count = s.cnt,
      review_avg = s.avg
  from (
    select count(*)::int as cnt,
           coalesce(round(avg(rating)::numeric, 1), 0) as avg
    from public.product_reviews
    where template_id = _template_id and status = 'approved'
  ) s
  where t.id = _template_id;
$$;

revoke all on function public.refresh_template_review_stats(uuid) from public;
revoke all on function public.refresh_template_review_stats(uuid) from anon;
revoke all on function public.refresh_template_review_stats(uuid) from authenticated;

create or replace function public.product_reviews_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_template_review_stats(old.template_id);
    return old;
  end if;
  perform public.refresh_template_review_stats(new.template_id);
  if tg_op = 'UPDATE' and old.template_id <> new.template_id then
    perform public.refresh_template_review_stats(old.template_id);
  end if;
  return new;
end;
$$;

drop trigger if exists product_reviews_stats on public.product_reviews;
create trigger product_reviews_stats
after insert or update or delete on public.product_reviews
for each row execute function public.product_reviews_stats_trigger();

-- ---------- site_videos (links only: YouTube / Vimeo) ----------
create table if not exists public.site_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null default '',
  provider text not null check (provider in ('youtube','vimeo')),
  video_id text not null,
  url text not null,
  transcript text not null default '',
  placement text not null default 'home' check (placement in ('home','about','services','store')),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.site_videos to anon;
grant select, insert, update, delete on public.site_videos to authenticated;
grant all on public.site_videos to service_role;

alter table public.site_videos enable row level security;

drop policy if exists "Anyone reads published videos" on public.site_videos;
create policy "Anyone reads published videos"
on public.site_videos for select to anon, authenticated
using (is_published = true);

drop policy if exists "Admins manage videos" on public.site_videos;
create policy "Admins manage videos"
on public.site_videos for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create index if not exists site_videos_placement_idx on public.site_videos (placement, is_published, sort_order);

drop trigger if exists site_videos_set_updated_at on public.site_videos;
create trigger site_videos_set_updated_at
before update on public.site_videos
for each row execute function public.set_updated_at();

-- ---------- product_docs (links or inline Markdown; no file uploads) ----------
create table if not exists public.product_docs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  title text not null,
  kind text not null default 'link' check (kind in ('link','markdown')),
  url text not null default '',
  provider text not null default '',
  content_md text not null default '',
  visibility text not null default 'public' check (visibility in ('public','buyers')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.product_docs to anon;
grant select, insert, update, delete on public.product_docs to authenticated;
grant all on public.product_docs to service_role;

alter table public.product_docs enable row level security;

drop policy if exists "Anyone reads public docs of published products" on public.product_docs;
create policy "Anyone reads public docs of published products"
on public.product_docs for select to anon, authenticated
using (
  visibility = 'public'
  and exists (select 1 from public.templates t where t.id = template_id and t.is_published = true)
);

drop policy if exists "Buyers read buyer docs" on public.product_docs;
create policy "Buyers read buyer docs"
on public.product_docs for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.template_id = product_docs.template_id
      and o.user_id = auth.uid()
      and o.status in ('paid','delivered')
  )
);

drop policy if exists "Admins manage docs" on public.product_docs;
create policy "Admins manage docs"
on public.product_docs for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create index if not exists product_docs_template_idx on public.product_docs (template_id, visibility, sort_order);

drop trigger if exists product_docs_set_updated_at on public.product_docs;
create trigger product_docs_set_updated_at
before update on public.product_docs
for each row execute function public.set_updated_at();
