grant update on public.profiles to authenticated;

drop policy if exists "MSP owners can update profiles in their MSP" on public.profiles;

create policy "MSP owners can update profiles in their MSP"
on public.profiles
for update
to authenticated
using (public.is_msp_owner(profiles.msp_id))
with check (public.is_msp_owner(profiles.msp_id));
