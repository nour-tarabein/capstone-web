-- Lonestar Tech Summit 2026 — off-site networking backend (Supabase / Postgres).
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

-- ============================================================
-- RESET
-- ============================================================
drop table if exists rsvps cascade;
drop table if exists events cascade;
drop table if exists attendees cascade;
drop table if exists conferences cascade;

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
-- too, so anon can never read the reverse lookup ("which events is Maya at")
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
  ('lts-2026', 'Lonestar Tech Summit 2026', 'Austin, TX', 'Austin Convention Center', 30.2637, -97.7397, ARRAY['2026-09-15','2026-09-16','2026-09-17']::text[], ARRAY['AI','FinTech','DevTools','Design','Climate']::text[]);

insert into attendees (id, conference_id, name, title, company, photo_url, interests, session_ids, directory_opt_in) values
  ('a1', 'lts-2026', 'Maya Okonkwo', 'Staff Engineer', 'Northwind', '', ARRAY['AI','DevTools']::text[], ARRAY['s1','s3']::text[], true),
  ('a2', 'lts-2026', 'Dev Raman', 'Product Lead', 'Kestrel', '', ARRAY['AI','FinTech']::text[], ARRAY['s1','s4']::text[], true),
  ('a3', 'lts-2026', 'Priya Nair', 'Design Director', 'Loomis', '', ARRAY['Design']::text[], ARRAY['s7','s8']::text[], true),
  ('a4', 'lts-2026', 'Tomas Vega', 'Founder', 'Cadence', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a5', 'lts-2026', 'Ana Belova', 'ML Engineer', 'Northwind', '', ARRAY['AI']::text[], ARRAY['s3','s9']::text[], true),
  ('a6', 'lts-2026', 'Jules Marchetti', 'CTO', 'Fernweh', '', ARRAY['DevTools','AI']::text[], ARRAY['s3','s5']::text[], true),
  ('a7', 'lts-2026', 'Sam Adeyemi', 'Data Scientist', 'Kestrel', '', ARRAY['AI','Climate']::text[], ARRAY['s9']::text[], true),
  ('a8', 'lts-2026', 'Rin Takahashi', 'Design Engineer', 'Loomis', '', ARRAY['Design','DevTools']::text[], ARRAY['s2','s7']::text[], true),
  ('a9', 'lts-2026', 'Noor Hassan', 'VP Engineering', 'Sable', '', ARRAY['DevTools']::text[], ARRAY['s5']::text[], false),
  ('a10', 'lts-2026', 'Eli Brandt', 'Growth Lead', 'Cadence', '', ARRAY['FinTech']::text[], ARRAY['s4','s6']::text[], true),
  ('a11', 'lts-2026', 'Kofi Mensah', 'Platform Engineer', 'Fernweh', '', ARRAY['DevTools']::text[], ARRAY['s5','s10']::text[], true),
  ('a12', 'lts-2026', 'Sasha Petrova', 'Researcher', 'Verdant', '', ARRAY['Climate','AI']::text[], ARRAY['s6','s9']::text[], true),
  ('a13', 'lts-2026', 'Marco Silva', 'Solutions Architect', 'Sable', '', ARRAY['FinTech','DevTools']::text[], ARRAY['s4','s10']::text[], true),
  ('a14', 'lts-2026', 'Yuki Sato', 'Head of Design', 'Verdant', '', ARRAY['Design','Climate']::text[], ARRAY['s2','s6']::text[], false),
  ('a15', 'lts-2026', 'Amara Diallo', 'Engineering Manager', 'Northwind', '', ARRAY['Design']::text[], ARRAY['s2','s8']::text[], true),
  ('a16', 'lts-2026', 'Ben Kowalski', 'Developer Advocate', 'Kestrel', '', ARRAY['DevTools']::text[], ARRAY['s10']::text[], true),
  ('a17', 'lts-2026', 'Lucia Ferrari', 'Principal PM', 'Loomis', '', ARRAY['Design','AI']::text[], ARRAY['s2','s7']::text[], true),
  ('a18', 'lts-2026', 'Omar Farouk', 'Security Lead', 'Sable', '', ARRAY['FinTech']::text[], ARRAY['s10']::text[], true),
  ('a19', 'lts-2026', 'Hana Kim', 'Climate Analyst', 'Verdant', '', ARRAY['Climate']::text[], ARRAY['s6']::text[], true),
  ('a20', 'lts-2026', 'Theo Lindqvist', 'Staff Designer', 'Fernweh', '', ARRAY['Design']::text[], ARRAY['s2','s7']::text[], true);

insert into events (id, conference_id, source, source_event_id, source_url, title, description, starts_at, ends_at, venue_name, lat, lng, tags, is_official, curation_status, curation_rationale, submitted_by) values
  ('official:lts-opening-reception', 'lts-2026', 'official', 'lts-opening-reception', '#', 'Summit Opening Reception', 'Drinks and small plates on the terrace. Badge required.', '2026-09-15T18:00:00-05:00'::timestamptz, '2026-09-15T21:00:00-05:00'::timestamptz, 'Austin Convention Center — Terrace', 30.2637, -97.7397, ARRAY['AI','FinTech','DevTools','Design','Climate']::text[], true, 'approved', 'matches AI, FinTech, DevTools, Design, Climate · 0.0 mi from venue', NULL),
  ('official:lts-sponsor-hh', 'lts-2026', 'official', 'lts-sponsor-hh', '#', 'Sponsor Happy Hour', 'Hosted by our platinum sponsors. Open to all badge holders.', '2026-09-16T17:00:00-05:00'::timestamptz, '2026-09-16T19:30:00-05:00'::timestamptz, 'Speakeasy', 30.2673, -97.7423, ARRAY['FinTech','DevTools']::text[], true, 'approved', 'matches FinTech, DevTools · 0.3 mi from venue', NULL),
  ('official:lts-closing-party', 'lts-2026', 'official', 'lts-closing-party', '#', 'Closing Party', 'Rainey Street. Live music, tacos, and the last chance to swap numbers.', '2026-09-17T20:00:00-05:00'::timestamptz, '2026-09-17T23:59:00-05:00'::timestamptz, 'Banger''s', 30.2551, -97.7379, ARRAY['AI','FinTech','DevTools','Design','Climate']::text[], true, 'approved', 'matches AI, FinTech, DevTools, Design, Climate · 0.6 mi from venue', NULL),
  ('eventbrite:eb-startup-crawl', 'lts-2026', 'eventbrite', 'eb-startup-crawl', 'https://www.eventbrite.com/e/austin-startup-crawl', 'Austin Startup Crawl', 'Forty companies, one warehouse, free beer. The classic Austin scramble.', '2026-09-15T18:30:00-05:00'::timestamptz, '2026-09-15T22:00:00-05:00'::timestamptz, 'Native Hostel', 30.2688, -97.7263, ARRAY['DevTools','AI']::text[], false, 'approved', 'matches DevTools, AI · 0.9 mi from venue', NULL),
  ('eventbrite:eb-stubbs-live', 'lts-2026', 'eventbrite', 'eb-stubbs-live', 'https://www.eventbrite.com/e/stubbs-live', 'Live at Stubb''s', 'Outdoor amphitheatre show, doors at 7. Ticketed.', '2026-09-16T19:00:00-05:00'::timestamptz, '2026-09-16T23:00:00-05:00'::timestamptz, 'Stubb''s Bar-B-Q', 30.2686, -97.7364, ARRAY[]::text[], false, 'approved', 'no tag match · 0.4 mi from venue', NULL),
  ('eventbrite:eb-barton-springs', 'lts-2026', 'eventbrite', 'eb-barton-springs', 'https://www.eventbrite.com/e/barton-springs-sunset', 'Barton Springs Sunset Swim', 'Sixty-eight degrees year round. Bring a towel.', '2026-09-17T18:30:00-05:00'::timestamptz, '2026-09-17T20:00:00-05:00'::timestamptz, 'Barton Springs Pool', 30.264, -97.7713, ARRAY['Climate']::text[], false, 'approved', 'matches Climate · 1.9 mi from venue', NULL),
  ('partiful:ptf-ai-founders-dinner', 'lts-2026', 'partiful', 'ptf-ai-founders-dinner', 'https://partiful.com/e/ai-founders-dinner', 'AI Founders Dinner', 'Long table, no name tags, no pitches. 20 seats, first come.', '2026-09-15T19:00:00-05:00'::timestamptz, '2026-09-15T22:00:00-05:00'::timestamptz, 'Emmer & Rye', 30.2597, -97.7395, ARRAY['AI']::text[], false, 'approved', 'matches AI · 0.3 mi from venue', NULL),
  ('luma:luma-devtools-hh', 'lts-2026', 'luma', 'luma-devtools-hh', 'https://lu.ma/devtools-austin', 'DevTools Happy Hour', 'Open bar for the first hour. Hosted by the Austin DevTools collective.', '2026-09-15T17:30:00-05:00'::timestamptz, '2026-09-15T20:00:00-05:00'::timestamptz, 'Capital Factory', 30.2686, -97.7409, ARRAY['DevTools']::text[], false, 'approved', 'matches DevTools · 0.3 mi from venue', NULL),
  ('partiful:ptf-design-systems-dinner', 'lts-2026', 'partiful', 'ptf-design-systems-dinner', 'https://partiful.com/e/design-systems-dinner', 'Design Systems Dinner', 'Small dinner for people who argue about tokens for a living.', '2026-09-16T19:30:00-05:00'::timestamptz, '2026-09-16T22:30:00-05:00'::timestamptz, 'Comedor', 30.267, -97.7462, ARRAY['Design']::text[], false, 'approved', 'matches Design · 0.4 mi from venue', NULL),
  ('luma:luma-fintech-after-hours', 'lts-2026', 'luma', 'luma-fintech-after-hours', 'https://lu.ma/fintech-after-hours', 'FinTech After Hours', 'Rainey Street patio takeover. Payments, ledgers, and frozen margaritas.', '2026-09-16T18:00:00-05:00'::timestamptz, '2026-09-16T21:00:00-05:00'::timestamptz, 'Half Step', 30.2549, -97.7383, ARRAY['FinTech']::text[], false, 'approved', 'matches FinTech · 0.6 mi from venue', NULL),
  ('partiful:ptf-climate-nightcap', 'lts-2026', 'partiful', 'ptf-climate-nightcap', 'https://partiful.com/e/climate-nightcap', 'Climate Tech Nightcap', 'Last-night drinks for the climate crowd. Bring someone you just met.', '2026-09-17T21:00:00-05:00'::timestamptz, '2026-09-17T23:59:00-05:00'::timestamptz, 'Kitty Cohen''s', 30.2649, -97.7213, ARRAY['Climate']::text[], false, 'approved', 'matches Climate · 1.1 mi from venue', NULL),
  ('luma:luma-ai-infra-meetup', 'lts-2026', 'luma', 'luma-ai-infra-meetup', 'https://lu.ma/ai-infra-atx', 'AI Infra Meetup', 'Three lightning talks on inference cost, then everyone goes to the patio.', '2026-09-17T18:00:00-05:00'::timestamptz, '2026-09-17T20:30:00-05:00'::timestamptz, 'Capital Factory', 30.2686, -97.7409, ARRAY['AI','DevTools']::text[], false, 'approved', 'matches AI, DevTools · 0.3 mi from venue', NULL),
  ('shotgun:sg-warehouse-set', 'lts-2026', 'shotgun', 'sg-warehouse-set', 'https://shotgun.live/events/east-austin-warehouse', 'East Side Warehouse Set', 'Local selectors, concrete floor, doors at 10. The late option.', '2026-09-16T22:00:00-05:00'::timestamptz, '2026-09-17T02:00:00-05:00'::timestamptz, 'Concrete Cowboy Warehouse', 30.2635, -97.7205, ARRAY[]::text[], false, 'approved', 'no tag match · 1.1 mi from venue', NULL),
  ('shotgun:sg-rooftop-social', 'lts-2026', 'shotgun', 'sg-rooftop-social', 'https://shotgun.live/events/rainey-rooftop-social', 'Rainey Rooftop Social', 'Rooftop, skyline view, no cover before 9. Easy first stop.', '2026-09-15T20:00:00-05:00'::timestamptz, '2026-09-15T23:30:00-05:00'::timestamptz, 'The Bungalow Rooftop', 30.2557, -97.7392, ARRAY['Design']::text[], false, 'approved', 'matches Design · 0.6 mi from venue', NULL),
  ('attendee:sub-boardgames', 'lts-2026', 'attendee', 'sub-boardgames', '', 'Board games + beer', 'Grabbing the back room at Emerald Tavern. Bringing Wingspan and Azul, all welcome.', '2026-09-16T20:00:00-05:00'::timestamptz, '2026-09-16T23:00:00-05:00'::timestamptz, 'Emerald Tavern Games & Cafe', 30.2711, -97.7437, ARRAY['DevTools']::text[], false, 'candidate', 'Submitted by an attendee', 'a6'),
  ('attendee:sub-morningrun', 'lts-2026', 'attendee', 'sub-morningrun', '', 'Sunrise run along the trail', 'Easy 3 miles before the keynote. Meeting at the boardwalk entrance.', '2026-09-17T06:30:00-05:00'::timestamptz, '2026-09-17T07:30:00-05:00'::timestamptz, 'Ann and Roy Butler Trail', 30.2523, -97.7411, ARRAY[]::text[], false, 'candidate', 'Submitted by an attendee', 'a17'),
  ('eventbrite:eb-5k', 'lts-2026', 'eventbrite', 'eb-5k', 'https://www.eventbrite.com/e/lady-bird-5k', 'Lady Bird Lake 5K', 'Charity fun run around the trail.', '2026-09-16T07:00:00-05:00'::timestamptz, '2026-09-16T09:00:00-05:00'::timestamptz, 'Auditorium Shores', 30.2622, -97.7515, ARRAY[]::text[], false, 'rejected', 'no tag match · morning slot · not a networking context', NULL);

insert into rsvps (event_id, attendee_id, anonymous) values
  ('official:lts-opening-reception', 'a2', false),
  ('official:lts-opening-reception', 'a3', false),
  ('official:lts-opening-reception', 'a5', false),
  ('official:lts-opening-reception', 'a6', false),
  ('official:lts-opening-reception', 'a7', false),
  ('official:lts-opening-reception', 'a8', false),
  ('official:lts-opening-reception', 'a10', false),
  ('official:lts-opening-reception', 'a11', false),
  ('official:lts-opening-reception', 'a15', false),
  ('official:lts-opening-reception', 'a16', false),
  ('official:lts-opening-reception', 'a17', false),
  ('official:lts-opening-reception', 'a20', false),
  ('official:lts-opening-reception', 'a9', true),
  ('official:lts-sponsor-hh', 'a4', false),
  ('official:lts-sponsor-hh', 'a10', false),
  ('official:lts-sponsor-hh', 'a13', false),
  ('official:lts-sponsor-hh', 'a18', false),
  ('official:lts-sponsor-hh', 'a2', false),
  ('official:lts-sponsor-hh', 'a11', false),
  ('official:lts-sponsor-hh', 'a16', false),
  ('official:lts-sponsor-hh', 'a14', true),
  ('official:lts-closing-party', 'a2', false),
  ('official:lts-closing-party', 'a3', false),
  ('official:lts-closing-party', 'a5', false),
  ('official:lts-closing-party', 'a6', false),
  ('official:lts-closing-party', 'a8', false),
  ('official:lts-closing-party', 'a12', false),
  ('official:lts-closing-party', 'a15', false),
  ('official:lts-closing-party', 'a17', false),
  ('official:lts-closing-party', 'a19', false),
  ('official:lts-closing-party', 'a20', false),
  ('official:lts-closing-party', 'a9', true),
  ('official:lts-closing-party', 'a14', true),
  ('partiful:ptf-ai-founders-dinner', 'a2', false),
  ('partiful:ptf-ai-founders-dinner', 'a5', false),
  ('partiful:ptf-ai-founders-dinner', 'a6', false),
  ('partiful:ptf-ai-founders-dinner', 'a7', false),
  ('partiful:ptf-ai-founders-dinner', 'a12', false),
  ('partiful:ptf-ai-founders-dinner', 'a15', false),
  ('partiful:ptf-ai-founders-dinner', 'a9', true),
  ('luma:luma-devtools-hh', 'a6', false),
  ('luma:luma-devtools-hh', 'a8', false),
  ('luma:luma-devtools-hh', 'a11', false),
  ('luma:luma-devtools-hh', 'a16', false),
  ('luma:luma-devtools-hh', 'a18', false),
  ('partiful:ptf-design-systems-dinner', 'a3', false),
  ('partiful:ptf-design-systems-dinner', 'a8', false),
  ('partiful:ptf-design-systems-dinner', 'a17', false),
  ('partiful:ptf-design-systems-dinner', 'a20', false),
  ('luma:luma-fintech-after-hours', 'a4', false),
  ('luma:luma-fintech-after-hours', 'a10', false),
  ('luma:luma-fintech-after-hours', 'a13', false),
  ('luma:luma-fintech-after-hours', 'a18', false),
  ('luma:luma-ai-infra-meetup', 'a5', false),
  ('luma:luma-ai-infra-meetup', 'a6', false),
  ('luma:luma-ai-infra-meetup', 'a7', false),
  ('luma:luma-ai-infra-meetup', 'a11', false),
  ('luma:luma-ai-infra-meetup', 'a12', false),
  ('partiful:ptf-climate-nightcap', 'a12', false),
  ('partiful:ptf-climate-nightcap', 'a19', false),
  ('eventbrite:eb-startup-crawl', 'a11', false),
  ('eventbrite:eb-startup-crawl', 'a16', false),
  ('eventbrite:eb-startup-crawl', 'a2', false),
  ('eventbrite:eb-stubbs-live', 'a10', false),
  ('eventbrite:eb-stubbs-live', 'a20', false),
  ('eventbrite:eb-barton-springs', 'a19', false);
