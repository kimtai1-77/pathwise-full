create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  msp_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

alter table public.tenants enable row level security;

create unique index if not exists tenants_msp_id_name_key
  on public.tenants (msp_id, name);

drop policy if exists "MSP owners can read their tenants" on public.tenants;
drop policy if exists "MSP owners can add their tenants" on public.tenants;

create policy "MSP owners can read their tenants"
on public.tenants
for select
to authenticated
using ((select auth.uid()) = msp_id);

create policy "MSP owners can add their tenants"
on public.tenants
for insert
to authenticated
with check ((select auth.uid()) = msp_id);

grant select, insert on public.tenants to authenticated;
