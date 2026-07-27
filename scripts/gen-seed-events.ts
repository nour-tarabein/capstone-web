/**
 * Regenerates supabase/schema.sql (DDL + full seed) and supabase/seed-events.sql
 * from the TypeScript fixtures. Run: npx tsx scripts/gen-seed-events.ts
 */
import { writeFileSync } from 'node:fs'
import { attendees } from '../src/offsite/fixtures/attendees'
import { conference } from '../src/offsite/fixtures/conference'
import { events, pendingSubmissions, rejectedCandidates } from '../src/offsite/fixtures/events'
import { rsvps } from '../src/offsite/fixtures/rsvps'

function esc(s: string) {
  return s.replace(/'/g, "''")
}
function arr(a: string[]) {
  return `ARRAY[${a.map((t) => `'${esc(t)}'`).join(',')}]::text[]`
}
function nul(n: number | undefined | null) {
  return n == null ? 'NULL' : String(n)
}
function ts(iso: string) {
  return `'${iso}'::timestamptz`
}
function tsOrNull(iso: string | null) {
  return iso ? ts(iso) : 'NULL'
}

const allEvents = [...events, ...pendingSubmissions, ...rejectedCandidates]

const eventRows = allEvents
  .map((e) => {
    return `  ('${esc(e.id)}', '${esc(e.conferenceId)}', '${esc(e.source)}', '${esc(e.sourceEventId)}', '${esc(e.sourceUrl)}', '${esc(e.title)}', '${esc(e.description)}', ${ts(e.startsAt)}, ${tsOrNull(e.endsAt)}, '${esc(e.venueName)}', ${e.lat}, ${e.lng}, ${arr(e.tags)}, ${nul(e.externalGoingCount)}, ${e.isOfficial}, '${e.curationStatus}', '${esc(e.curationRationale)}', ${e.submittedByAttendeeId ? `'${e.submittedByAttendeeId}'` : 'NULL'})`
  })
  .join(',\n')

const byEvent = new Map<string, { id: string; anon: boolean }[]>()
for (const r of rsvps) {
  const list = byEvent.get(r.eventId) ?? []
  list.push({ id: r.attendeeId, anon: r.anonymous })
  byEvent.set(r.eventId, list)
}
const rsvpRows = [...byEvent.entries()]
  .map(([eventId, people]) => {
    const vals = people.map((p) => `('${esc(eventId)}', '${p.id}', ${p.anon})`).join(', ')
    return `  ${vals}`
  })
  .join(',\n')

const attendeeRows = attendees
  .map(
    (a) =>
      `  ('${esc(a.id)}', '${esc(a.conferenceId)}', '${esc(a.name)}', '${esc(a.title)}', '${esc(a.company)}', '${esc(a.photoUrl)}', ${arr(a.interests)}, ${arr(a.sessionIds)}, ${a.directoryOptIn})`,
  )
  .join(',\n')

const conferenceRow = `  ('${esc(conference.id)}', '${esc(conference.name)}', '${esc(conference.city)}', '${esc(conference.venueName)}', ${conference.venueLat}, ${conference.venueLng}, ${arr(conference.nights)}, ${arr(conference.topicTags)})`

const eventsInsert = `insert into events (id, conference_id, source, source_event_id, source_url, title, description, starts_at, ends_at, venue_name, lat, lng, tags, external_going_count, is_official, curation_status, curation_rationale, submitted_by) values
${eventRows};`

const rsvpsInsert = `insert into rsvps (event_id, attendee_id, anonymous) values
${rsvpRows};`

const seedEventsSql = `-- Generated to match src/offsite/fixtures.
-- Safe to re-run: clears the lts-2026 events slate first, then reinserts.
-- Thursday is one approved event per source; Friday stays denser.

-- RSVPs reference events, so clear those first.
delete from rsvps
where event_id in (select id from events where conference_id = 'lts-2026');

delete from events where conference_id = 'lts-2026';

update conferences
set nights = array['2026-07-30','2026-07-31']::text[]
where id = 'lts-2026';

${eventsInsert}

${rsvpsInsert}
`

const ddl = `-- Lonestar Tech Summit 2026 — off-site networking backend (Supabase / Postgres).
--
-- Paste this whole file into the Supabase SQL editor and run it. It is
-- re-runnable: it drops and recreates everything, so it doubles as a "reset the
-- demo to a clean slate" button.
--
-- The security model IS the product here (DESIGN.md #9). The anon key ships in
-- the browser, so nothing may be enforced in the client. Concretely:
--   • anon can read the conference, the OPTED-IN roster, and APPROVED events;
--   • anon can NEVER read the rsvps table — not filtered, not at all;
--   • counts, the reciprocity-gated attending list, RSVP writes, event
--     submissions, and organizer reviews all go through SECURITY DEFINER
--     functions that run as the table owner and enforce the rules in Postgres.
-- That is what makes "you can't see who's going until you RSVP" a real gate
-- rather than a client-side suggestion an audience member could bypass.
--
-- Seed data is generated from src/offsite/fixtures via scripts/gen-seed-events.ts.
-- Thursday is one approved event per source; Friday stays denser.

-- ============================================================
-- RESET
-- ============================================================
drop table if exists rsvps cascade;
drop table if exists events cascade;
drop table if exists attendees cascade;
drop table if exists conferences cascade;

-- Dropping the tables does NOT drop the functions, and \`create or replace\`
-- refuses some changes (arg defaults, return types). Drop every overload by
-- name first so a re-run against an older deployment never fails partway.
do $$
declare
  fn record;
begin
  for fn in
    select oid::regprocedure as sig
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'going_counts', 'attending_list', 'rsvp_create', 'rsvp_cancel',
        'event_submit', 'pending_events', 'event_review'
      )
  loop
    execute format('drop function if exists %s cascade', fn.sig);
  end loop;
end
$$;

-- ============================================================
-- TABLES
-- ============================================================
create table conferences (
  id          text primary key,
  name        text not null,
  city        text not null,
  venue_name  text not null,
  venue_lat   double precision not null,
  venue_lng   double precision not null,
  nights      text[] not null,               -- 'YYYY-MM-DD', drives the night selector
  topic_tags  text[] not null default '{}'
);

create table attendees (
  id               text primary key,
  conference_id    text not null references conferences(id) on delete cascade,
  name             text not null,
  title            text not null default '',
  company          text not null default '',
  photo_url        text not null default '',
  interests        text[] not null default '{}',
  session_ids      text[] not null default '{}',
  -- Inherited from the Attendee Hub directory opt-in (DESIGN.md #3): a false
  -- attendee is counted but NEVER named anywhere.
  directory_opt_in boolean not null default true
);

create table events (
  id                 text primary key,
  conference_id      text not null references conferences(id) on delete cascade,
  source             text not null,          -- official | eventbrite | luma | partiful | shotgun | attendee
  source_event_id    text not null default '',
  source_url         text not null default '',
  title              text not null,
  description        text not null default '',
  starts_at          timestamptz not null,
  ends_at            timestamptz,
  venue_name         text not null default '',
  lat                double precision not null,
  lng                double precision not null,
  tags               text[] not null default '{}',
  -- How many non-summit people the source platform advertises. Static metadata,
  -- not an aggregate over rsvps, and it names nobody - so it rides on the
  -- ordinary events_read policy and needs none of the SECURITY DEFINER
  -- machinery below. NULL = no public audience (official / attendee-hosted).
  external_going_count integer,
  is_official        boolean not null default false,
  curation_status    text not null default 'candidate'
                       check (curation_status in ('candidate','approved','rejected')),
  curation_rationale text not null default '',
  submitted_by       text references attendees(id) on delete set null
);

create table rsvps (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null references events(id) on delete cascade,
  attendee_id  text not null references attendees(id) on delete cascade,
  anonymous    boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (event_id, attendee_id)             -- one RSVP per person per event
);

create index events_night_idx on events (curation_status, starts_at);
create index rsvps_event_idx  on rsvps (event_id);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
alter table conferences enable row level security;
alter table attendees   enable row level security;
alter table events      enable row level security;
alter table rsvps       enable row level security;

-- Public reads: the conference, the opted-in roster, and approved events only.
-- Everything the organizer hasn't approved stays invisible to the map — that is
-- the approval gate (DESIGN.md #5), enforced here and not in the client.
create policy conferences_read on conferences for select to anon, authenticated using (true);
create policy attendees_read   on attendees   for select to anon, authenticated using (directory_opt_in = true);
create policy events_read      on events      for select to anon, authenticated using (curation_status = 'approved');

-- No policy on rsvps = no access. Belt-and-suspenders: revoke the table grants
-- too, so anon can never read the reverse lookup ("which events is Abhinav at")
-- even by accident. All rsvp access is through the functions below.
revoke all on rsvps from anon, authenticated;

-- ============================================================
-- FUNCTIONS  (SECURITY DEFINER: run as owner, bypass RLS — the only path to rsvps)
-- ============================================================

-- Aggregate pin badges. Deliberately separate from attending_list so the map
-- can show "14 going" without any identity crossing the boundary.
create or replace function going_counts(p_event_ids text[])
returns table (event_id text, going_count bigint)
language sql security definer set search_path = public
as $$
  select event_id, count(*)::bigint
  from rsvps
  where event_id = any(p_event_ids)
  group by event_id;
$$;

-- The reciprocity gate. Returns a count-only payload unless the viewer has
-- RSVP'd to this event themselves; only then are names returned, and only for
-- people who are non-anonymous, not the viewer, and directory-opted-in.
create or replace function attending_list(p_event_id text, p_viewer_id text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_going_count int;
  v_viewer_going boolean;
  v_people json;
  v_nameable int;
begin
  select count(*) into v_going_count from rsvps where event_id = p_event_id;

  select exists (
    select 1 from rsvps where event_id = p_event_id and attendee_id = p_viewer_id
  ) into v_viewer_going;

  if not v_viewer_going then
    return json_build_object('gated', true, 'going_count', v_going_count);
  end if;

  select coalesce(json_agg(to_jsonb(a.*)), '[]'::json), count(*)
  into v_people, v_nameable
  from rsvps r
  join attendees a on a.id = r.attendee_id
  where r.event_id = p_event_id
    and r.anonymous = false
    and r.attendee_id <> p_viewer_id
    and a.directory_opt_in = true;

  -- goingCount - nameable - 1 (the viewer): everyone counted but not shown.
  return json_build_object(
    'gated', false,
    'going_count', v_going_count,
    'anonymous_count', v_going_count - v_nameable - 1,
    'people', v_people
  );
end;
$$;

-- Writes go through RPC, never the table: returning the written row would need
-- SELECT on rsvps, and granting that reopens the reverse lookup (DESIGN.md #9).
create or replace function rsvp_create(p_event_id text, p_attendee_id text, p_anonymous boolean)
returns void
language sql security definer set search_path = public
as $$
  insert into rsvps (event_id, attendee_id, anonymous)
  values (p_event_id, p_attendee_id, coalesce(p_anonymous, false))
  on conflict (event_id, attendee_id) do nothing;
$$;

create or replace function rsvp_cancel(p_event_id text, p_attendee_id text)
returns void
language sql security definer set search_path = public
as $$
  delete from rsvps where event_id = p_event_id and attendee_id = p_attendee_id;
$$;

-- An attendee proposes an event. Everything the organizer controls — id, source,
-- curation status — is assigned here, so the client cannot submit something
-- pre-approved. It lands as a candidate, invisible to the map until reviewed.
create or replace function event_submit(
  p_title text, p_description text, p_starts_at timestamptz,
  p_venue_name text, p_lat double precision, p_lng double precision,
  p_attendee_id text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_conf text;
begin
  select conference_id into v_conf from attendees where id = p_attendee_id;
  insert into events (
    id, conference_id, source, source_event_id, source_url,
    title, description, starts_at, ends_at, venue_name, lat, lng,
    tags, is_official, curation_status, curation_rationale, submitted_by
  ) values (
    'attendee:' || replace(gen_random_uuid()::text, '-', ''),
    v_conf, 'attendee', '', '',
    trim(p_title), coalesce(p_description, ''), p_starts_at, null,
    coalesce(nullif(trim(p_venue_name), ''), 'Location shared on approval'),
    p_lat, p_lng, '{}', false, 'candidate', 'Submitted by an attendee', p_attendee_id
  );
end;
$$;

-- The organizer review queue cannot be a plain SELECT: the rows it needs are
-- exactly the ones events_read hides. SECURITY DEFINER, joined to the submitter
-- so the queue can name the host without a second round trip.
create or replace function pending_events()
returns setof jsonb
language sql security definer set search_path = public
as $$
  select to_jsonb(e.*)
         || jsonb_build_object(
              'submitted_by_name', a.name,
              'submitted_by_company', a.company
            )
  from events e
  left join attendees a on a.id = e.submitted_by
  where e.curation_status = 'candidate'
  order by e.starts_at;
$$;

-- Approve or reject a candidate. Approving is what puts it on the map.
create or replace function event_review(p_event_id text, p_status text)
returns void
language sql security definer set search_path = public
as $$
  update events set curation_status = p_status
  where id = p_event_id and p_status in ('approved','rejected');
$$;

-- anon drives the whole app through these.
grant execute on function going_counts(text[])                                                          to anon, authenticated;
grant execute on function attending_list(text, text)                                                    to anon, authenticated;
grant execute on function rsvp_create(text, text, boolean)                                              to anon, authenticated;
grant execute on function rsvp_cancel(text, text)                                                       to anon, authenticated;
grant execute on function event_submit(text, text, timestamptz, text, double precision, double precision, text) to anon, authenticated;
grant execute on function pending_events()                                                              to anon, authenticated;
grant execute on function event_review(text, text)                                                      to anon, authenticated;

-- ============================================================
-- SEED DATA  (generated from src/offsite/fixtures — do not edit by hand)
-- ============================================================

insert into conferences (id, name, city, venue_name, venue_lat, venue_lng, nights, topic_tags) values
${conferenceRow};

insert into attendees (id, conference_id, name, title, company, photo_url, interests, session_ids, directory_opt_in) values
${attendeeRows};

${eventsInsert}

${rsvpsInsert}
`

writeFileSync(new URL('../supabase/seed-events.sql', import.meta.url), seedEventsSql)
writeFileSync(new URL('../supabase/schema.sql', import.meta.url), ddl)

const thu = events.filter((e) => e.startsAt.startsWith('2026-07-30'))
const bySrc: Record<string, string[]> = {}
for (const e of thu) {
  ;(bySrc[e.source] ??= []).push(e.title)
}
console.log('Thu approved by source:', bySrc)
console.log('Wrote supabase/seed-events.sql and supabase/schema.sql')
console.log('attendees', attendees.length, 'events seeded', allEvents.length)
