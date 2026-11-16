create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

alter table public.evidence
	add column validity_days integer not null default 30
	check (validity_days > 0);

create table public.evidence_expiration_events (
	id uuid primary key default gen_random_uuid(),
	evidence_id uuid not null references public.evidence(id) on delete restrict,
	event_type text not null check (event_type in ('initial', 'renewal')),
	expires_at timestamptz not null,
	period_days integer not null check (period_days > 0),
	created_by uuid,
	created_at timestamptz not null default now()
);

create function public.set_evidence_expiration_event_timestamps()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
	new.created_at := now();
	new.expires_at := new.created_at + make_interval(days => new.period_days);
	return new;
end;
$$;

create trigger evidence_expiration_events_set_timestamps
before insert on public.evidence_expiration_events
for each row execute function public.set_evidence_expiration_event_timestamps();

insert into public.evidence_expiration_events (
	evidence_id,
	event_type,
	expires_at,
	period_days,
	created_by,
	created_at
)
select
	e.id,
	'initial',
	now() + interval '30 days',
	30,
	e.uploaded_by,
	now()
from public.evidence e;

create index evidence_expiration_events_latest_idx
	on public.evidence_expiration_events (evidence_id, created_at desc, id desc);

alter table public.evidence_expiration_events enable row level security;
grant select, insert on public.evidence_expiration_events to authenticated;

create policy "MSP members can read evidence expiration history"
on public.evidence_expiration_events
for select
to authenticated
using (
	exists (
		select 1
		from public.evidence e
		where e.id = evidence_expiration_events.evidence_id
			and e.msp_id = (select public.my_msp_id())
	)
);

create policy "MSP members can record evidence expiration events"
on public.evidence_expiration_events
for insert
to authenticated
with check (
	created_by = (select auth.uid())
	and exists (
		select 1
		from public.evidence e
		where e.id = evidence_expiration_events.evidence_id
			and e.msp_id = (select public.my_msp_id())
	)
);

create function public.prevent_evidence_expiration_event_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
	raise exception 'Evidence expiration history is append-only';
end;
$$;

create trigger evidence_expiration_events_append_only
before update or delete on public.evidence_expiration_events
for each row execute function public.prevent_evidence_expiration_event_mutation();

create function public.add_initial_evidence_expiration()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
	insert into public.evidence_expiration_events (
		evidence_id,
		event_type,
		expires_at,
		period_days,
		created_by,
		created_at
	)
	values (
		new.id,
		'initial',
		new.created_at + make_interval(days => new.validity_days),
		new.validity_days,
		new.uploaded_by,
		new.created_at
	);

	return new;
end;
$$;

create trigger evidence_add_initial_expiration
after insert on public.evidence
for each row execute function public.add_initial_evidence_expiration();

create function public.prevent_satisfying_control_with_expired_evidence()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
	should_check_expiration boolean;
begin
	if tg_op = 'INSERT' then
		should_check_expiration := new.status = 'satisfied';
	else
		should_check_expiration := new.status = 'satisfied'
			and old.status is distinct from 'satisfied';
	end if;

	if should_check_expiration and exists (
			select 1
			from public.evidence e
			cross join lateral (
				select expiration.expires_at
				from public.evidence_expiration_events expiration
				where expiration.evidence_id = e.id
				order by expiration.created_at desc, expiration.id desc
				limit 1
			) latest_expiration
			where e.tenant_id = new.tenant_id
				and e.control_id = new.control_id
				and not exists (
					select 1
					from public.evidence successor
					where successor.supersedes_evidence_id = e.id
				)
				and latest_expiration.expires_at <= now()
		)
	then
		raise exception 'Control cannot be satisfied with one or more expired evidence files'
			using errcode = '23514', constraint = 'tenant_control_expired_evidence';
	end if;

	return new;
end;
$$;

create trigger tenant_controls_prevent_expired_evidence_satisfaction
before insert or update on public.tenant_controls
for each row execute function public.prevent_satisfying_control_with_expired_evidence();

create function public.unsatisfy_controls_with_expired_evidence()
returns void
language sql
set search_path = public, pg_temp
as $$
	update public.tenant_controls control
	set status = 'unsatisfied',
			satisfied_by = null,
			satisfied_on = null
	where control.status = 'satisfied'
		and exists (
			select 1
			from public.evidence e
			cross join lateral (
				select expiration.expires_at
				from public.evidence_expiration_events expiration
				where expiration.evidence_id = e.id
				order by expiration.created_at desc, expiration.id desc
				limit 1
			) latest_expiration
			where e.tenant_id = control.tenant_id
				and e.control_id = control.control_id
				and not exists (
					select 1
					from public.evidence successor
					where successor.supersedes_evidence_id = e.id
				)
				and latest_expiration.expires_at <= now()
		);
$$;

revoke all on function public.unsatisfy_controls_with_expired_evidence() from public, anon, authenticated;

select cron.schedule(
	'unsatisfy-controls-with-expired-evidence',
	'*/15 * * * *',
	$job$ select public.unsatisfy_controls_with_expired_evidence(); $job$
)
where not exists (
	select 1 from cron.job where jobname = 'unsatisfy-controls-with-expired-evidence'
);
