create or replace function public.is_msp_member(target_msp_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role in ('owner', 'msp_admin')
      and profile.msp_id = target_msp_id
  );
$$;

revoke all on function public.is_msp_member(uuid) from public;
grant execute on function public.is_msp_member(uuid) to authenticated;

drop policy if exists "MSP owners and admins can read profiles in their MSP" on public.profiles;

create policy "MSP owners and admins can read profiles in their MSP"
on public.profiles
for select
to authenticated
using (public.is_msp_member(profiles.msp_id));

grant select on public.profiles to authenticated;
