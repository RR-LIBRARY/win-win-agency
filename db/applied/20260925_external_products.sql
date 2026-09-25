-- APPLIED 2026-09-25 06:10 UTC to Supabase `Win Win Agency` (cgygrzuacnbuilqyqemk) via the Lovable migration tool. Kept for reference only.
-- ============ EXTERNAL PRODUCTS (Gumroad, Amazon, Fiverr, Udemy, Play Store, ...) ============
alter table public.templates
  add column if not exists external_url text,
  add column if not exists external_platform text not null default '';

create or replace function public.validate_product_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_type not in (
    'notion_template','software','source_code','saas_tool','mobile_app','plugin',
    'ebook','course','service_gig','digital_asset','other'
  ) then
    raise exception 'Invalid product_type: %', new.product_type;
  end if;
  if new.delivery_type not in ('link','download','license','access','external') then
    raise exception 'Invalid delivery_type: %', new.delivery_type;
  end if;
  if new.delivery_type = 'external' then
    if new.external_url is null or new.external_url !~* '^https://' then
      raise exception 'External products need an https:// link';
    end if;
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

create or replace function public.block_orders_for_external_products()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_delivery text;
begin
  select delivery_type into v_delivery from public.templates where id = new.template_id;
  if v_delivery = 'external' then
    raise exception 'This product is sold on an external platform';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_block_external on public.orders;
create trigger orders_block_external
before insert on public.orders
for each row execute function public.block_orders_for_external_products();
