create or replace function public.is_msp_owner(target_msp_id uuid)
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
      and profile.role = 'owner'
      and profile.msp_id = target_msp_id
  );
$$;

revoke all on function public.is_msp_owner(uuid) from public;
grant execute on function public.is_msp_owner(uuid) to authenticated;

drop policy if exists "MSP owners can delete other profiles" on public.profiles;

create policy "MSP owners can delete other profiles"
on public.profiles
for delete
to authenticated
using (
  id <> (select auth.uid())
  and public.is_msp_owner(profiles.msp_id)
);
