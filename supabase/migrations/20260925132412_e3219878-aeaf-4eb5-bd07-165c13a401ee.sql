create table public.security_scans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null default 'manual',
  raw_input text not null default '',
  ai_guidance text,
  ai_generated_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.security_scans to authenticated;
grant all on public.security_scans to service_role;
alter table public.security_scans enable row level security;
create policy "Admins manage security scans" on public.security_scans for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.security_findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.security_scans(id) on delete cascade,
  title text not null,
  severity text not null default 'medium',
  category text not null default 'general',
  description text not null default '',
  remediation text not null default '',
  status text not null default 'open',
  verification text not null default 'unverified',
  verification_note text not null default '',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index security_findings_scan_idx on public.security_findings(scan_id);
grant select, insert, update, delete on public.security_findings to authenticated;
grant all on public.security_findings to service_role;
alter table public.security_findings enable row level security;
create policy "Admins manage security findings" on public.security_findings for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.validate_security_finding()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.severity not in ('critical','high','medium','low','info') then raise exception 'Invalid severity'; end if;
  if new.status not in ('open','in_progress','fixed','wont_fix') then raise exception 'Invalid status'; end if;
  if new.verification not in ('unverified','verified','failed') then raise exception 'Invalid verification'; end if;
  if new.verification = 'verified' and new.status <> 'fixed' then raise exception 'Only fixed findings can be verified'; end if;
  return new;
end; $$;
create trigger security_findings_validate before insert or update on public.security_findings
  for each row execute function public.validate_security_finding();
create trigger security_findings_set_updated_at before update on public.security_findings
  for each row execute function public.set_updated_at();
create trigger security_scans_set_updated_at before update on public.security_scans
  for each row execute function public.set_updated_at();