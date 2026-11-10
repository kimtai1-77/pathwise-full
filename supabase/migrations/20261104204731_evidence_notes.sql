create table public.evidence_notes (
	id uuid primary key default gen_random_uuid(),
	evidence_id uuid not null,
	tenant_id uuid not null,
	control_id uuid not null,
	msp_id uuid not null,
	note text not null check (length(btrim(note)) > 0),
	created_by uuid not null references public.profiles(id) on delete restrict,
	created_at timestamptz not null default now(),
	constraint evidence_notes_evidence_scope_fkey
		foreign key (evidence_id, tenant_id, control_id, msp_id)
		references public.evidence (id, tenant_id, control_id, msp_id)
		on delete cascade
);

create index evidence_notes_evidence_created_at_idx
	on public.evidence_notes (evidence_id, created_at desc);

alter table public.evidence_notes enable row level security;

grant select, insert on public.evidence_notes to authenticated;

create policy "MSP members can read evidence notes"
on public.evidence_notes
for select
to authenticated
using (msp_id = (select public.my_msp_id()));

create policy "MSP owners and admins can add evidence notes"
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
			and profile.role in ('owner', 'msp_admin')
	)
);
