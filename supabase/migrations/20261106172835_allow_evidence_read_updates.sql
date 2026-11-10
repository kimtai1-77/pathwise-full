grant update on public.evidence_reads to authenticated;

create policy "MSP members can update their own evidence reads"
on public.evidence_reads
for update
to authenticated
using (
	user_id = (select auth.uid())
	and exists (
		select 1
		from public.evidence evidence
		where evidence.id = evidence_reads.evidence_id
			and evidence.msp_id = (select public.my_msp_id())
	)
)
with check (
	user_id = (select auth.uid())
	and exists (
		select 1
		from public.evidence evidence
		where evidence.id = evidence_reads.evidence_id
			and evidence.msp_id = (select public.my_msp_id())
	)
);
