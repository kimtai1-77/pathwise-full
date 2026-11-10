alter table public.evidence_notes
	add column subject text not null default '' check (char_length(subject) <= 120);

create table public.evidence_reads (
	evidence_id uuid not null references public.evidence(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	read_at timestamptz not null default now(),
	primary key (evidence_id, user_id)
);

create index evidence_reads_user_evidence_idx
	on public.evidence_reads (user_id, evidence_id);

alter table public.evidence_reads enable row level security;
grant select, insert on public.evidence_reads to authenticated;

create policy "MSP members can read their own evidence reads"
on public.evidence_reads
for select
to authenticated
using (
	user_id = (select auth.uid())
	and exists (
		select 1
		from public.evidence evidence
		where evidence.id = evidence_reads.evidence_id
			and evidence.msp_id = (select public.my_msp_id())
	)
);

create policy "MSP members can mark their evidence as read"
on public.evidence_reads
for insert
to authenticated
with check (
	user_id = (select auth.uid())
	and exists (
		select 1
		from public.evidence evidence
		where evidence.id = evidence_reads.evidence_id
			and evidence.msp_id = (select public.my_msp_id())
	)
);

create table public.evidence_note_reads (
	note_id uuid not null references public.evidence_notes(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	read_at timestamptz not null default now(),
	primary key (note_id, user_id)
);

create index evidence_note_reads_user_note_idx
	on public.evidence_note_reads (user_id, note_id);

alter table public.evidence_note_reads enable row level security;
grant select, insert on public.evidence_note_reads to authenticated;

create policy "MSP members can read their own evidence note reads"
on public.evidence_note_reads
for select
to authenticated
using (
	user_id = (select auth.uid())
	and exists (
		select 1
		from public.evidence_notes note
		where note.id = evidence_note_reads.note_id
			and note.msp_id = (select public.my_msp_id())
	)
);

create policy "MSP members can mark their evidence notes as read"
on public.evidence_note_reads
for insert
to authenticated
with check (
	user_id = (select auth.uid())
	and exists (
		select 1
		from public.evidence_notes note
		where note.id = evidence_note_reads.note_id
			and note.msp_id = (select public.my_msp_id())
	)
);
