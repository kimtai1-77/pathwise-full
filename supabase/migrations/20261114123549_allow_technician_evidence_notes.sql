drop policy if exists "MSP owners and admins can add evidence notes"
on public.evidence_notes;

create policy "MSP members can add evidence notes"
on public.evidence_notes
for insert
to authenticated
with check (
	created_by = (select auth.uid())
	and msp_id = (select public.my_msp_id())
	and exists (
		select 1
		from public.profiles profile
		where profile.id = (select auth.uid())
			and profile.msp_id = evidence_notes.msp_id
			and profile.role in ('owner', 'msp_admin', 'technician')
	)
);
