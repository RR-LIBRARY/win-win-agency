-- Clean up rows orphaned by account deletions that happened before the FKs existed
delete from public.user_roles where user_id not in (select id from auth.users);
delete from public.profiles where id not in (select id from auth.users);
update public.orders set user_id = null
  where user_id is not null and user_id not in (select id from auth.users);
update public.bookings set user_id = null
  where user_id is not null and user_id not in (select id from auth.users);

-- Tie account-scoped tables to auth.users
alter table public.user_roles
  add constraint user_roles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.bookings
  add constraint bookings_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists user_roles_user_id_idx on public.user_roles (user_id);