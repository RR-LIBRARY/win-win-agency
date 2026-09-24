-- Tighten who can call the security-definer helpers flagged by the linter
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;

-- has_role is only meaningful for the caller's own id; refuse other ids so it leaks nothing
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _user_id is not null
     and _user_id = auth.uid()
     and exists (
       select 1 from public.user_roles
       where user_id = _user_id and role = _role
     )
$$;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;