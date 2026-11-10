drop policy if exists "MSP members can insert their evidence" on public.evidence;

create policy "MSP members can insert their evidence"
on public.evidence
for insert
to authenticated
with check (
	uploaded_by = (select auth.uid())
	and msp_id = (select public.my_msp_id())
	and exists (
		select 1
		from public.tenants tenant
		where tenant.id = evidence.tenant_id
			and tenant.msp_id = evidence.msp_id
	)
);

update storage.buckets
set file_size_limit = 52428800
where id = 'compliance_evidence';
