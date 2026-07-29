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
--
-- Every function additionally takes a conference id and scopes its query to
-- it, so a client-supplied conference id can never read or write across
-- conferences (issue #3).
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

-- Dropping the tables does NOT drop the functions, and `create or replace`
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
        'event_submit', 'pending_events', 'event_review', 'attendee_checkin'
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
-- can show "14 going" without any identity crossing the boundary. Joined to
-- events so a p_conference_id from one conference can never count RSVPs that
-- belong to another (issue #3).
create or replace function going_counts(p_conference_id text, p_event_ids text[])
returns table (event_id text, going_count bigint)
language sql security definer set search_path = public
as $$
  select r.event_id, count(*)::bigint
  from rsvps r
  join events e on e.id = r.event_id
  where r.event_id = any(p_event_ids) and e.conference_id = p_conference_id
  group by r.event_id;
$$;

-- The reciprocity gate. Returns a count-only payload unless the viewer has
-- RSVP'd to this event themselves; only then are names returned, and only for
-- people who are non-anonymous, not the viewer, and directory-opted-in. Every
-- query is joined to events on p_conference_id, so an event id from a
-- different conference is invisible here too.
create or replace function attending_list(p_conference_id text, p_event_id text, p_viewer_id text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_going_count int;
  v_viewer_going boolean;
  v_people json;
  v_nameable int;
begin
  select count(*) into v_going_count
  from rsvps r
  join events e on e.id = r.event_id
  where r.event_id = p_event_id and e.conference_id = p_conference_id;

  select exists (
    select 1
    from rsvps r
    join events e on e.id = r.event_id
    where r.event_id = p_event_id and e.conference_id = p_conference_id and r.attendee_id = p_viewer_id
  ) into v_viewer_going;

  if not v_viewer_going then
    return json_build_object('gated', true, 'going_count', v_going_count);
  end if;

  select coalesce(json_agg(to_jsonb(a.*)), '[]'::json), count(*)
  into v_people, v_nameable
  from rsvps r
  join events e on e.id = r.event_id
  join attendees a on a.id = r.attendee_id
  where r.event_id = p_event_id
    and e.conference_id = p_conference_id
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
-- A no-op if the event does not belong to p_conference_id — the client cannot
-- RSVP into a conference it did not ask for.
create or replace function rsvp_create(p_conference_id text, p_event_id text, p_attendee_id text, p_anonymous boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from events where id = p_event_id and conference_id = p_conference_id) then
    return;
  end if;
  insert into rsvps (event_id, attendee_id, anonymous)
  values (p_event_id, p_attendee_id, coalesce(p_anonymous, false))
  on conflict (event_id, attendee_id) do nothing;
end;
$$;

create or replace function rsvp_cancel(p_conference_id text, p_event_id text, p_attendee_id text)
returns void
language sql security definer set search_path = public
as $$
  delete from rsvps
  where event_id = p_event_id
    and attendee_id = p_attendee_id
    and event_id in (select id from events where conference_id = p_conference_id);
$$;

-- An attendee proposes an event. Everything the organizer controls — id, source,
-- curation status — is assigned here, so the client cannot submit something
-- pre-approved. It lands as a candidate, invisible to the map until reviewed.
-- p_conference_id must match the attendee's own conference — an attendee from
-- one conference cannot submit an event into another.
create or replace function event_submit(
  p_conference_id text,
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
  if v_conf is null or v_conf <> p_conference_id then
    raise exception 'attendee % does not belong to conference %', p_attendee_id, p_conference_id;
  end if;
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

-- Manufactures a brand-new attendee for a browser that has no identity yet —
-- the Tysons Corner welcome/check-in screen (issue #5). anon has no INSERT on
-- attendees (no policy grants it), so this has to run SECURITY DEFINER, same
-- as event_submit. Returns the inserted row so the client can adopt its id as
-- the viewer persona without a second round trip.
create or replace function attendee_checkin(p_conference_id text, p_name text, p_company text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_row attendees;
begin
  insert into attendees (id, conference_id, name, title, company, photo_url, interests, session_ids, directory_opt_in)
  values (
    'checkin:' || replace(gen_random_uuid()::text, '-', ''),
    p_conference_id, trim(p_name), '', coalesce(p_company, ''), '', '{}', '{}', true
  )
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

-- The organizer review queue cannot be a plain SELECT: the rows it needs are
-- exactly the ones events_read hides. SECURITY DEFINER, joined to the submitter
-- so the queue can name the host without a second round trip. Scoped to one
-- conference so an organizer viewing one conference never reviews another's.
create or replace function pending_events(p_conference_id text)
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
  where e.curation_status = 'candidate' and e.conference_id = p_conference_id
  order by e.starts_at;
$$;

-- Approve or reject a candidate. Approving is what puts it on the map.
create or replace function event_review(p_conference_id text, p_event_id text, p_status text)
returns void
language sql security definer set search_path = public
as $$
  update events set curation_status = p_status
  where id = p_event_id and conference_id = p_conference_id and p_status in ('approved','rejected');
$$;

-- anon drives the whole app through these.
grant execute on function going_counts(text, text[])                                                          to anon, authenticated;
grant execute on function attending_list(text, text, text)                                                    to anon, authenticated;
grant execute on function rsvp_create(text, text, text, boolean)                                               to anon, authenticated;
grant execute on function rsvp_cancel(text, text, text)                                                        to anon, authenticated;
grant execute on function event_submit(text, text, text, timestamptz, text, double precision, double precision, text) to anon, authenticated;
grant execute on function pending_events(text)                                                                 to anon, authenticated;
grant execute on function event_review(text, text, text)                                                       to anon, authenticated;
grant execute on function attendee_checkin(text, text, text)                                                   to anon, authenticated;

-- ============================================================
-- SEED DATA  (generated from src/offsite/fixtures — do not edit by hand)
-- ============================================================

insert into conferences (id, name, city, venue_name, venue_lat, venue_lng, nights, topic_tags) values
  ('lts-2026', 'Lonestar Tech Summit 2026', 'Austin, TX', 'Austin Convention Center', 30.2637, -97.7397, ARRAY['2026-07-30','2026-07-31']::text[], ARRAY['AI','FinTech','DevTools','Design','Climate']::text[]),
  ('lts-tysons-2026', 'Lonestar Tech Summit 2026', 'McLean, VA', '1765 Greensboro Station Pl, 7th Floor', 38.9196, -77.2264, ARRAY['2026-07-30']::text[], ARRAY['AI','FinTech','DevTools','Design','Climate']::text[]);

insert into attendees (id, conference_id, name, title, company, photo_url, interests, session_ids, directory_opt_in) values
  ('a1', 'lts-2026', 'Reggie Aggarwal', 'CEO', 'Finance', '', ARRAY['FinTech','AI']::text[], ARRAY['s1','s4']::text[], true),
  ('a2', 'lts-2026', 'David Quattrone', 'Chief Technology Officer', 'Technology', '', ARRAY['AI','DevTools']::text[], ARRAY['s1','s3']::text[], true),
  ('a3', 'lts-2026', 'Amy Lucia', 'SVP and Chief Marketing Officer', 'Marketing', '', ARRAY['Design']::text[], ARRAY['s2','s7']::text[], true),
  ('a4', 'lts-2026', 'Andreas Heckmann', 'Chief Customer Officer', 'Client Services', '', ARRAY['Design','FinTech']::text[], ARRAY['s2','s8']::text[], true),
  ('a5', 'lts-2026', 'Kathy Wagner', 'Senior Vice President, Chief Financial Officer', 'Finance', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a6', 'lts-2026', 'Pradeep Mannakkara', 'Senior Vice President and Chief Information Officer', 'Information Technology', '', ARRAY['DevTools','AI']::text[], ARRAY['s5','s10']::text[], true),
  ('a7', 'lts-2026', 'Ben Mayrides', 'Vice President and Chief Information Security Officer', 'Information Technology', '', ARRAY['DevTools']::text[], ARRAY['s10']::text[], true),
  ('a8', 'lts-2026', 'Chuck Ghoorah', 'President of Worldwide Sales and Marketing', 'Sales', '', ARRAY['FinTech','Design']::text[], ARRAY['s4','s6']::text[], true),
  ('a9', 'lts-2026', 'Alexa Norris', 'Client Services Intern', 'Client Services', '', ARRAY['Design']::text[], ARRAY['s8']::text[], true),
  ('a10', 'lts-2026', 'Danielle Faerberg', 'Client Services Intern', 'Client Services', '', ARRAY['Design']::text[], ARRAY['s2']::text[], true),
  ('a11', 'lts-2026', 'Erin Earley', 'Client Services Intern', 'Client Services', '', ARRAY['Design','FinTech']::text[], ARRAY['s8']::text[], true),
  ('a12', 'lts-2026', 'Giselle Harvey', 'Client Services Intern', 'Client Services', '', ARRAY['Design']::text[], ARRAY['s2','s8']::text[], true),
  ('a13', 'lts-2026', 'Kat Willey', 'Client Services Intern', 'Client Services', '', ARRAY['Design']::text[], ARRAY['s7']::text[], true),
  ('a14', 'lts-2026', 'Nathan Quattrone', 'Corporate Development Intern', 'Finance', '', ARRAY['FinTech']::text[], ARRAY['s4','s6']::text[], true),
  ('a15', 'lts-2026', 'Ismael Anwarzai', 'Sales Engineering Intern', 'Information Technology', '', ARRAY['DevTools','FinTech']::text[], ARRAY['s5','s10']::text[], true),
  ('a16', 'lts-2026', 'Nour Tarbin', 'Cloud Infrastructure Intern', 'Information Technology', '', ARRAY['DevTools','AI']::text[], ARRAY['s5','s3']::text[], true),
  ('a17', 'lts-2026', 'Praveen Babu', 'IT Financials Systems Intern', 'Information Technology', '', ARRAY['DevTools','FinTech']::text[], ARRAY['s10','s4']::text[], true),
  ('a18', 'lts-2026', 'Tala Shihadeh', 'Security Risk & Compliance Intern', 'Information Technology', '', ARRAY['DevTools']::text[], ARRAY['s10']::text[], true),
  ('a19', 'lts-2026', 'Kaylen Ko', 'Meetings and Events Intern', 'Marketing', '', ARRAY['Design']::text[], ARRAY['s2','s6']::text[], true),
  ('a20', 'lts-2026', 'Abby Jones', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a21', 'lts-2026', 'Braden Fitzpatrick', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a22', 'lts-2026', 'Carlix Lee', 'Sales Intern', 'Sales', '', ARRAY['FinTech','Design']::text[], ARRAY['s4']::text[], true),
  ('a23', 'lts-2026', 'Charlotte Rizzi', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4','s6']::text[], true),
  ('a24', 'lts-2026', 'Clara Fernandez', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a25', 'lts-2026', 'Eddie Largent', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a26', 'lts-2026', 'Ellee Groves', 'Sales Intern', 'Sales', '', ARRAY['FinTech','Design']::text[], ARRAY['s6']::text[], true),
  ('a27', 'lts-2026', 'Fidel Small', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a28', 'lts-2026', 'Grace Lintz', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a29', 'lts-2026', 'Graciela Dominguez', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a30', 'lts-2026', 'Jenna Corcoran', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a31', 'lts-2026', 'Julianna Schray', 'Sales Intern', 'Sales', '', ARRAY['FinTech','Design']::text[], ARRAY['s4']::text[], true),
  ('a32', 'lts-2026', 'Kyle Ables', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a33', 'lts-2026', 'Liam O’Driscoll', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a34', 'lts-2026', 'Luca Marques', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a35', 'lts-2026', 'Morgan Doyle', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a36', 'lts-2026', 'Nate Murphy', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a37', 'lts-2026', 'Nick Apostolou', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a38', 'lts-2026', 'Nickawn Pouryoussefi', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a39', 'lts-2026', 'Rohan Agarwal', 'Sales Intern', 'Sales', '', ARRAY['FinTech','AI']::text[], ARRAY['s1','s4']::text[], true),
  ('a40', 'lts-2026', 'Ryann Harrington', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a41', 'lts-2026', 'Salem Eshete', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a42', 'lts-2026', 'Taylor Chase', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a43', 'lts-2026', 'Tyler Rogers', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('a44', 'lts-2026', 'Wyatt King', 'Sales Intern', 'Sales', '', ARRAY['FinTech']::text[], ARRAY['s6']::text[], true),
  ('a45', 'lts-2026', 'Aarnav Kapoor', 'Software Engineer Intern', 'Technology', '', ARRAY['AI','DevTools']::text[], ARRAY['s1','s3']::text[], true),
  ('a46', 'lts-2026', 'Aaron Perrotta', 'Software Engineer Intern', 'Technology', '', ARRAY['DevTools']::text[], ARRAY['s3','s5']::text[], true),
  ('a47', 'lts-2026', 'Abhinav Pappu', 'Software Engineer Intern', 'Technology', '', ARRAY['AI','DevTools']::text[], ARRAY['s1','s5']::text[], true),
  ('a48', 'lts-2026', 'Andrea Valladares', 'Technology Operations Intern', 'Technology', '', ARRAY['DevTools']::text[], ARRAY['s5','s10']::text[], true),
  ('a49', 'lts-2026', 'Areeb Khan', 'SDET Intern', 'Technology', '', ARRAY['DevTools']::text[], ARRAY['s5']::text[], true),
  ('a50', 'lts-2026', 'Brio Schwinden', 'Software Engineer Intern', 'Technology', '', ARRAY['AI','DevTools']::text[], ARRAY['s3','s9']::text[], true),
  ('a51', 'lts-2026', 'Evan Cantwell', 'Software Engineer Intern', 'Technology', '', ARRAY['DevTools']::text[], ARRAY['s3','s5']::text[], true),
  ('a52', 'lts-2026', 'Issa Kabore', 'Software Engineer Intern', 'Technology', '', ARRAY['AI']::text[], ARRAY['s1','s9']::text[], true),
  ('a53', 'lts-2026', 'Jack Johnson', 'Software Engineer Intern', 'Technology', '', ARRAY['DevTools','AI']::text[], ARRAY['s3','s10']::text[], true),
  ('a54', 'lts-2026', 'Jake Keller', 'Data Science Intern', 'Technology', '', ARRAY['AI']::text[], ARRAY['s3','s9']::text[], true),
  ('a55', 'lts-2026', 'Joshua Johnson', 'Software Engineer Intern', 'Technology', '', ARRAY['DevTools']::text[], ARRAY['s5']::text[], true),
  ('a56', 'lts-2026', 'Mahnoor Najeeb', 'Scrum Master Intern', 'Technology', '', ARRAY['DevTools','Design']::text[], ARRAY['s5','s2']::text[], true),
  ('a57', 'lts-2026', 'Paige Reeves', 'Product Design Intern', 'Technology', '', ARRAY['Design']::text[], ARRAY['s2','s7']::text[], true),
  ('a58', 'lts-2026', 'Pranav Elavarthi', 'Software Engineering Intern', 'Technology', '', ARRAY['AI','DevTools']::text[], ARRAY['s1','s3']::text[], true),
  ('a59', 'lts-2026', 'Pratik Shrestha', 'Software Engineering Intern', 'Technology', '', ARRAY['DevTools']::text[], ARRAY['s5','s10']::text[], true),
  ('a60', 'lts-2026', 'Quinn Savitt', 'Software Engineer Intern', 'Technology', '', ARRAY['AI','DevTools']::text[], ARRAY['s3','s9']::text[], true),
  ('a61', 'lts-2026', 'Sherry Chen', 'Product Design Intern', 'Technology', '', ARRAY['Design']::text[], ARRAY['s2','s7']::text[], true),
  ('a62', 'lts-2026', 'Shritan Goki', 'Software Engineering Intern', 'Technology', '', ARRAY['DevTools','AI']::text[], ARRAY['s1','s5']::text[], true),
  ('a63', 'lts-2026', 'Zaylie Tamashiro', 'Software Engineering Intern', 'Technology', '', ARRAY['DevTools']::text[], ARRAY['s3','s5']::text[], true),
  ('t1', 'lts-tysons-2026', 'Placeholder Attendee One', 'Organizer', 'Operations', '', ARRAY['AI','FinTech']::text[], ARRAY['s1']::text[], true),
  ('t2', 'lts-tysons-2026', 'Placeholder Attendee Two', 'Engineer', 'Technology', '', ARRAY['DevTools','AI']::text[], ARRAY['s3']::text[], true),
  ('t3', 'lts-tysons-2026', 'Placeholder Attendee Three', 'Designer', 'Design', '', ARRAY['Design']::text[], ARRAY['s2']::text[], true),
  ('t4', 'lts-tysons-2026', 'Placeholder Attendee Four', 'Analyst', 'Finance', '', ARRAY['FinTech']::text[], ARRAY['s4']::text[], true),
  ('t5', 'lts-tysons-2026', 'Placeholder Attendee Five', 'Engineer', 'Technology', '', ARRAY['DevTools']::text[], ARRAY['s3']::text[], true),
  ('t6', 'lts-tysons-2026', 'Placeholder Attendee Six', 'Coordinator', 'Marketing', '', ARRAY['Design','Climate']::text[], ARRAY['s6']::text[], true);

insert into events (id, conference_id, source, source_event_id, source_url, title, description, starts_at, ends_at, venue_name, lat, lng, tags, external_going_count, is_official, curation_status, curation_rationale, submitted_by) values
  ('official:lts-opening-reception', 'lts-2026', 'official', 'lts-opening-reception', '#', 'Summit Opening Reception', 'Drinks and small plates on the terrace. Badge required.', '2026-07-30T18:00:00-05:00'::timestamptz, '2026-07-30T21:00:00-05:00'::timestamptz, 'Austin Convention Center - Terrace', 30.2637, -97.7397, ARRAY['AI','FinTech','DevTools','Design','Climate']::text[], NULL, true, 'approved', 'matches AI, FinTech, DevTools, Design, Climate · 0.0 mi from venue', NULL),
  ('official:lts-closing-party', 'lts-2026', 'official', 'lts-closing-party', '#', 'Closing Party', 'Rainey Street. Live music, tacos, and the last chance to swap numbers.', '2026-07-31T20:00:00-05:00'::timestamptz, '2026-07-31T23:59:00-05:00'::timestamptz, 'Banger''s', 30.2551, -97.7379, ARRAY['AI','FinTech','DevTools','Design','Climate']::text[], NULL, true, 'approved', 'matches AI, FinTech, DevTools, Design, Climate · 0.6 mi from venue', NULL),
  ('eventbrite:eb-startup-crawl', 'lts-2026', 'eventbrite', 'eb-startup-crawl', 'https://www.eventbrite.com/e/austin-startup-crawl', 'Austin Startup Crawl', 'Forty companies, one warehouse, free beer. The classic Austin scramble.', '2026-07-30T18:30:00-05:00'::timestamptz, '2026-07-30T22:00:00-05:00'::timestamptz, 'Native Hostel', 30.2688, -97.7263, ARRAY['DevTools','AI']::text[], 900, false, 'approved', 'matches DevTools, AI · 0.9 mi from venue', NULL),
  ('eventbrite:eb-barton-springs', 'lts-2026', 'eventbrite', 'eb-barton-springs', 'https://www.eventbrite.com/e/barton-springs-sunset', 'Barton Springs Sunset Swim', 'Sixty-eight degrees year round. Bring a towel.', '2026-07-31T18:30:00-05:00'::timestamptz, '2026-07-31T20:00:00-05:00'::timestamptz, 'Barton Springs Pool', 30.264, -97.7713, ARRAY['Climate']::text[], 180, false, 'approved', 'matches Climate · 1.9 mi from venue', NULL),
  ('eventbrite:eb-two-step-lessons', 'lts-2026', 'eventbrite', 'eb-two-step-lessons', 'https://www.eventbrite.com/e/white-horse-two-step', 'Two-Step Lessons at the White Horse', 'Free lesson at 7, band at 8, no experience and no partner needed.', '2026-07-31T19:00:00-05:00'::timestamptz, '2026-07-31T23:00:00-05:00'::timestamptz, 'The White Horse', 30.2637, -97.7169, ARRAY[]::text[], 260, false, 'approved', 'no tag match · 1.4 mi from venue', NULL),
  ('partiful:ptf-design-systems-dinner', 'lts-2026', 'partiful', 'ptf-design-systems-dinner', 'https://partiful.com/e/design-systems-dinner', 'Design Systems Dinner', 'Small dinner for people who argue about tokens for a living.', '2026-07-30T19:30:00-05:00'::timestamptz, '2026-07-30T22:30:00-05:00'::timestamptz, 'Comedor', 30.267, -97.7462, ARRAY['Design']::text[], 22, false, 'approved', 'matches Design · 0.4 mi from venue', NULL),
  ('luma:luma-fintech-after-hours', 'lts-2026', 'luma', 'luma-fintech-after-hours', 'https://lu.ma/fintech-after-hours', 'FinTech After Hours', 'Rainey Street patio takeover. Payments, ledgers, and frozen margaritas.', '2026-07-30T18:00:00-05:00'::timestamptz, '2026-07-30T21:00:00-05:00'::timestamptz, 'Half Step', 30.2549, -97.7383, ARRAY['FinTech']::text[], 95, false, 'approved', 'matches FinTech · 0.6 mi from venue', NULL),
  ('shotgun:sg-sunset-boat-party', 'lts-2026', 'shotgun', 'sg-sunset-boat-party', 'https://shotgun.live/events/lady-bird-sunset-boat-party', 'Lady Bird Sunset Boat Party', 'Two hours on the water with a house set. Boards at 6 sharp, capped at 120.', '2026-07-30T18:00:00-05:00'::timestamptz, '2026-07-30T21:00:00-05:00'::timestamptz, 'Hyatt Boat Dock', 30.2604, -97.7513, ARRAY[]::text[], 410, false, 'approved', 'no tag match · 0.7 mi from venue', NULL),
  ('partiful:ptf-ai-founders-dinner', 'lts-2026', 'partiful', 'ptf-ai-founders-dinner', 'https://partiful.com/e/ai-founders-dinner', 'AI Founders Dinner', 'Long table, no name tags, no pitches. 20 seats, first come.', '2026-07-31T19:00:00-05:00'::timestamptz, '2026-07-31T22:00:00-05:00'::timestamptz, 'Emmer & Rye', 30.2597, -97.7395, ARRAY['AI']::text[], 14, false, 'approved', 'matches AI · 0.3 mi from venue', NULL),
  ('luma:luma-devtools-hh', 'lts-2026', 'luma', 'luma-devtools-hh', 'https://lu.ma/devtools-austin', 'DevTools Happy Hour', 'Open bar for the first hour. Hosted by the Austin DevTools collective.', '2026-07-31T17:30:00-05:00'::timestamptz, '2026-07-31T20:00:00-05:00'::timestamptz, 'Capital Factory', 30.2686, -97.7409, ARRAY['DevTools']::text[], 120, false, 'approved', 'matches DevTools · 0.3 mi from venue', NULL),
  ('partiful:ptf-climate-nightcap', 'lts-2026', 'partiful', 'ptf-climate-nightcap', 'https://partiful.com/e/climate-nightcap', 'Climate Tech Nightcap', 'Last-night drinks for the climate crowd. Bring someone you just met.', '2026-07-31T21:00:00-05:00'::timestamptz, '2026-07-31T23:59:00-05:00'::timestamptz, 'Kitty Cohen''s', 30.2649, -97.7213, ARRAY['Climate']::text[], 38, false, 'approved', 'matches Climate · 1.1 mi from venue', NULL),
  ('luma:luma-ai-infra-meetup', 'lts-2026', 'luma', 'luma-ai-infra-meetup', 'https://lu.ma/ai-infra-atx', 'AI Infra Meetup', 'Three lightning talks on inference cost, then everyone goes to the patio.', '2026-07-31T18:00:00-05:00'::timestamptz, '2026-07-31T20:30:00-05:00'::timestamptz, 'Capital Factory', 30.2686, -97.7409, ARRAY['AI','DevTools']::text[], 160, false, 'approved', 'matches AI, DevTools · 0.3 mi from venue', NULL),
  ('shotgun:sg-rooftop-social', 'lts-2026', 'shotgun', 'sg-rooftop-social', 'https://shotgun.live/events/rainey-rooftop-social', 'Rainey Rooftop Social', 'Rooftop, skyline view, no cover before 9. Easy first stop.', '2026-07-31T20:00:00-05:00'::timestamptz, '2026-07-31T23:30:00-05:00'::timestamptz, 'The Bungalow Rooftop', 30.2557, -97.7392, ARRAY['Design']::text[], 430, false, 'approved', 'matches Design · 0.6 mi from venue', NULL),
  ('shotgun:sg-summit-rooftop-dj', 'lts-2026', 'shotgun', 'sg-summit-rooftop-dj', 'https://shotgun.live/events/summit-rooftop-dj-set', 'Rooftop DJ Set - Closing Night', 'Open-air decks over Congress. Sunset slot, then house until 1.', '2026-07-31T21:00:00-05:00'::timestamptz, '2026-08-01T01:00:00-05:00'::timestamptz, 'Upstairs at Caroline', 30.2668, -97.7423, ARRAY[]::text[], 630, false, 'approved', 'no tag match · 0.3 mi from venue', NULL),
  ('shotgun:sg-barbarella-throwback', 'lts-2026', 'shotgun', 'sg-barbarella-throwback', 'https://shotgun.live/events/barbarella-throwback', 'Barbarella Throwback Friday', 'Nothing after 2009. Two rooms, no cover with a summit badge before 11.', '2026-07-31T22:00:00-05:00'::timestamptz, '2026-08-01T02:00:00-05:00'::timestamptz, 'Barbarella', 30.2676, -97.7357, ARRAY[]::text[], 520, false, 'approved', 'no tag match · 0.4 mi from venue', NULL),
  ('shotgun:sg-open-air-block-party', 'lts-2026', 'shotgun', 'sg-open-air-block-party', 'https://shotgun.live/events/east-austin-open-air', 'Open Air: East Austin Block Party', 'Outdoor stage, food trucks, all-local lineup. Runs straight through.', '2026-07-31T20:00:00-05:00'::timestamptz, '2026-08-01T01:00:00-05:00'::timestamptz, 'Springdale Yard', 30.264, -97.716, ARRAY[]::text[], 1180, false, 'approved', 'no tag match · 1.4 mi from venue', NULL),
  ('partiful:ptf-wine-on-second', 'lts-2026', 'partiful', 'ptf-wine-on-second', 'https://partiful.com/e/wine-on-second', 'Wine on Second', 'Low-key patio wine, no pitching. Bring one person you met today.', '2026-07-31T18:00:00-05:00'::timestamptz, '2026-07-31T21:00:00-05:00'::timestamptz, 'June''s All Day', 30.2503, -97.7511, ARRAY[]::text[], 19, false, 'approved', 'no tag match · 1.1 mi from venue', NULL),
  ('partiful:ptf-zilker-picnic', 'lts-2026', 'partiful', 'ptf-zilker-picnic', 'https://partiful.com/e/zilker-sunset-picnic', 'Zilker Sunset Picnic', 'Blankets on the great lawn. Bring something to share, leave nothing behind.', '2026-07-31T19:00:00-05:00'::timestamptz, '2026-07-31T21:00:00-05:00'::timestamptz, 'Zilker Park', 30.2669, -97.7729, ARRAY['Climate']::text[], 41, false, 'approved', 'matches Climate · 2.0 mi from venue', NULL),
  ('partiful:ptf-late-night-pizza', 'lts-2026', 'partiful', 'ptf-late-night-pizza', 'https://partiful.com/e/late-night-pizza-council', 'Late Night Pizza Council', 'The last stop, every year. Slices on the sidewalk until they kick us out.', '2026-07-31T23:00:00-05:00'::timestamptz, '2026-08-01T01:30:00-05:00'::timestamptz, 'Home Slice Pizza', 30.25, -97.743, ARRAY[]::text[], 60, false, 'approved', 'no tag match · 1.0 mi from venue', NULL),
  ('luma:luma-stripe-payments-eng', 'lts-2026', 'luma', 'luma-stripe-payments-eng', 'https://lu.ma/payments-engineering-atx', 'Payments Engineering w/ Stripe', 'Idempotency, ledgers, and the failure modes nobody writes blog posts about.', '2026-07-31T17:30:00-05:00'::timestamptz, '2026-07-31T20:00:00-05:00'::timestamptz, 'Stripe Austin', 30.2648, -97.7476, ARRAY['FinTech','DevTools']::text[], 130, false, 'approved', 'matches FinTech, DevTools · 0.5 mi from venue', NULL),
  ('luma:luma-nvidia-inference', 'lts-2026', 'luma', 'luma-nvidia-inference', 'https://lu.ma/inference-at-scale-atx', 'Inference at Scale - NVIDIA', 'Batching, quantisation, and what actually moves cost per token.', '2026-07-31T17:00:00-05:00'::timestamptz, '2026-07-31T19:30:00-05:00'::timestamptz, 'Capital Factory', 30.2686, -97.7409, ARRAY['AI']::text[], 185, false, 'approved', 'matches AI · 0.3 mi from venue', NULL),
  ('luma:luma-datadog-observability', 'lts-2026', 'luma', 'luma-datadog-observability', 'https://lu.ma/observability-night-atx', 'Observability Night - Datadog', 'Traces over dashboards. War stories from three on-call rotations.', '2026-07-31T18:00:00-05:00'::timestamptz, '2026-07-31T20:30:00-05:00'::timestamptz, 'Austin Central Library', 30.2668, -97.75, ARRAY['DevTools']::text[], 88, false, 'approved', 'matches DevTools · 0.7 mi from venue', NULL),
  ('luma:luma-github-open-source', 'lts-2026', 'luma', 'luma-github-open-source', 'https://lu.ma/open-source-night-atx', 'Open Source Night - GitHub', 'Maintainers on burnout, funding, and saying no. Then a patio.', '2026-07-31T18:30:00-05:00'::timestamptz, '2026-07-31T21:00:00-05:00'::timestamptz, 'Central Machine Works', 30.2652, -97.7152, ARRAY['DevTools']::text[], 150, false, 'approved', 'matches DevTools · 1.5 mi from venue', NULL),
  ('attendee:host-cto-fireside', 'lts-2026', 'attendee', 'host-cto-fireside', '', 'CTO Fireside: Shipping AI in Production', 'Off the record, no slides. What actually broke when we put models in front of customers — and what we would do differently. Thirty seats.', '2026-07-30T18:00:00-05:00'::timestamptz, '2026-07-30T20:30:00-05:00'::timestamptz, 'The Roosevelt Room', 30.2683, -97.7477, ARRAY['AI','DevTools']::text[], NULL, false, 'approved', 'Hosted by an attendee · approved by the organizer', 'a2'),
  ('attendee:host-tech-meetup-hh', 'lts-2026', 'attendee', 'host-tech-meetup-hh', '', 'Tech Meetup Happy Hour', 'The engineering side of the summit, on a patio, before the parties start. Interns very much included.', '2026-07-31T17:30:00-05:00'::timestamptz, '2026-07-31T20:00:00-05:00'::timestamptz, 'Easy Tiger', 30.2679, -97.7392, ARRAY['DevTools','AI']::text[], NULL, false, 'approved', 'Hosted by an attendee · approved by the organizer', 'a6'),
  ('attendee:sub-boardgames', 'lts-2026', 'attendee', 'sub-boardgames', '', 'Board games + beer', 'Grabbing the back room at Emerald Tavern. Bringing Wingspan and Azul, all welcome.', '2026-07-30T20:00:00-05:00'::timestamptz, '2026-07-30T23:00:00-05:00'::timestamptz, 'Emerald Tavern Games & Cafe', 30.2711, -97.7437, ARRAY['DevTools']::text[], NULL, false, 'candidate', 'Submitted by an attendee', 'a2'),
  ('attendee:sub-morningrun', 'lts-2026', 'attendee', 'sub-morningrun', '', 'Sunrise run along the trail', 'Easy 3 miles before the keynote. Meeting at the boardwalk entrance.', '2026-07-31T06:30:00-05:00'::timestamptz, '2026-07-31T07:30:00-05:00'::timestamptz, 'Ann and Roy Butler Trail', 30.2523, -97.7411, ARRAY[]::text[], NULL, false, 'candidate', 'Submitted by an attendee', 'a47'),
  ('eventbrite:eb-5k', 'lts-2026', 'eventbrite', 'eb-5k', 'https://www.eventbrite.com/e/lady-bird-5k', 'Lady Bird Lake 5K', 'Charity fun run around the trail.', '2026-07-30T07:00:00-05:00'::timestamptz, '2026-07-30T09:00:00-05:00'::timestamptz, 'Auditorium Shores', 30.2622, -97.7515, ARRAY[]::text[], 340, false, 'rejected', 'no tag match · morning slot · not a networking context', NULL),
  ('official:tys-opening-reception', 'lts-tysons-2026', 'official', 'tys-opening-reception', '#', 'Tysons Opening Reception', 'Placeholder opening reception for the Tysons Corner conference.', '2026-07-30T18:00:00-04:00'::timestamptz, '2026-07-30T21:00:00-04:00'::timestamptz, '1765 Greensboro Station Pl - Lobby', 38.9196, -77.2264, ARRAY['AI','FinTech','DevTools','Design','Climate']::text[], NULL, true, 'approved', 'matches AI, FinTech, DevTools, Design, Climate · 0.0 mi from venue', NULL),
  ('eventbrite:tys-eb-placeholder-mixer', 'lts-tysons-2026', 'eventbrite', 'tys-eb-placeholder-mixer', 'https://www.eventbrite.com/e/placeholder-tysons-mixer', 'Placeholder Tysons Mixer', 'Placeholder third-party event for the Tysons Corner fixture.', '2026-07-30T18:30:00-04:00'::timestamptz, '2026-07-30T21:00:00-04:00'::timestamptz, 'Placeholder Venue A', 38.9204, -77.2277, ARRAY['DevTools']::text[], 40, false, 'approved', 'matches DevTools · 0.1 mi from venue', NULL),
  ('attendee:tys-host-placeholder-meetup', 'lts-tysons-2026', 'attendee', 'tys-host-placeholder-meetup', '', 'Placeholder Hosted Meetup', 'Placeholder attendee-hosted event for the Tysons Corner fixture.', '2026-07-30T19:00:00-04:00'::timestamptz, '2026-07-30T21:00:00-04:00'::timestamptz, 'Placeholder Venue B', 38.919, -77.2255, ARRAY['AI']::text[], NULL, false, 'approved', 'Hosted by an attendee · approved by the organizer', 't2'),
  ('attendee:tys-sub-placeholder-walk', 'lts-tysons-2026', 'attendee', 'tys-sub-placeholder-walk', '', 'Placeholder Sunrise Walk', 'Placeholder attendee submission awaiting review.', '2026-07-30T07:00:00-04:00'::timestamptz, '2026-07-30T08:00:00-04:00'::timestamptz, 'Placeholder Trailhead', 38.9182, -77.2249, ARRAY[]::text[], NULL, false, 'candidate', 'Submitted by an attendee', 't4'),
  ('eventbrite:tys-eb-rejected-placeholder', 'lts-tysons-2026', 'eventbrite', 'tys-eb-rejected-placeholder', 'https://www.eventbrite.com/e/placeholder-rejected', 'Placeholder Rejected Run', 'Placeholder rejected candidate for the Tysons Corner fixture.', '2026-07-30T07:30:00-04:00'::timestamptz, '2026-07-30T08:30:00-04:00'::timestamptz, 'Placeholder Trail', 38.9161, -77.2231, ARRAY[]::text[], 12, false, 'rejected', 'no tag match · morning slot · not a networking context', NULL);

insert into rsvps (event_id, attendee_id, anonymous) values
  ('official:lts-opening-reception', 'a2', false), ('official:lts-opening-reception', 'a3', false), ('official:lts-opening-reception', 'a4', false), ('official:lts-opening-reception', 'a5', false), ('official:lts-opening-reception', 'a6', false), ('official:lts-opening-reception', 'a8', false), ('official:lts-opening-reception', 'a14', false), ('official:lts-opening-reception', 'a16', false), ('official:lts-opening-reception', 'a20', false), ('official:lts-opening-reception', 'a39', false), ('official:lts-opening-reception', 'a45', false), ('official:lts-opening-reception', 'a54', false), ('official:lts-opening-reception', 'a57', false), ('official:lts-opening-reception', 'a61', false), ('official:lts-opening-reception', 'a9', true),
  ('official:lts-closing-party', 'a2', false), ('official:lts-closing-party', 'a3', false), ('official:lts-closing-party', 'a4', false), ('official:lts-closing-party', 'a6', false), ('official:lts-closing-party', 'a8', false), ('official:lts-closing-party', 'a12', false), ('official:lts-closing-party', 'a19', false), ('official:lts-closing-party', 'a39', false), ('official:lts-closing-party', 'a45', false), ('official:lts-closing-party', 'a57', false), ('official:lts-closing-party', 'a61', false), ('official:lts-closing-party', 'a63', false), ('official:lts-closing-party', 'a9', true), ('official:lts-closing-party', 'a13', true),
  ('eventbrite:eb-startup-crawl', 'a2', false), ('eventbrite:eb-startup-crawl', 'a39', false), ('eventbrite:eb-startup-crawl', 'a15', false),
  ('partiful:ptf-design-systems-dinner', 'a3', false), ('partiful:ptf-design-systems-dinner', 'a19', false), ('partiful:ptf-design-systems-dinner', 'a57', false), ('partiful:ptf-design-systems-dinner', 'a61', false), ('partiful:ptf-design-systems-dinner', 'a12', false),
  ('luma:luma-fintech-after-hours', 'a5', false), ('luma:luma-fintech-after-hours', 'a8', false), ('luma:luma-fintech-after-hours', 'a14', false), ('luma:luma-fintech-after-hours', 'a20', false), ('luma:luma-fintech-after-hours', 'a23', false), ('luma:luma-fintech-after-hours', 'a39', false),
  ('shotgun:sg-sunset-boat-party', 'a3', false), ('shotgun:sg-sunset-boat-party', 'a19', false), ('shotgun:sg-sunset-boat-party', 'a22', false), ('shotgun:sg-sunset-boat-party', 'a26', false), ('shotgun:sg-sunset-boat-party', 'a31', false), ('shotgun:sg-sunset-boat-party', 'a57', false), ('shotgun:sg-sunset-boat-party', 'a61', false), ('shotgun:sg-sunset-boat-party', 'a56', false), ('shotgun:sg-sunset-boat-party', 'a12', false), ('shotgun:sg-sunset-boat-party', 'a10', false), ('shotgun:sg-sunset-boat-party', 'a24', false), ('shotgun:sg-sunset-boat-party', 'a30', false), ('shotgun:sg-sunset-boat-party', 'a42', false), ('shotgun:sg-sunset-boat-party', 'a44', false), ('shotgun:sg-sunset-boat-party', 'a11', true),
  ('attendee:host-cto-fireside', 'a2', false), ('attendee:host-cto-fireside', 'a6', false), ('attendee:host-cto-fireside', 'a16', false), ('attendee:host-cto-fireside', 'a45', false), ('attendee:host-cto-fireside', 'a46', false), ('attendee:host-cto-fireside', 'a50', false), ('attendee:host-cto-fireside', 'a51', false), ('attendee:host-cto-fireside', 'a52', false), ('attendee:host-cto-fireside', 'a53', false), ('attendee:host-cto-fireside', 'a54', false), ('attendee:host-cto-fireside', 'a58', false), ('attendee:host-cto-fireside', 'a60', false), ('attendee:host-cto-fireside', 'a62', false), ('attendee:host-cto-fireside', 'a63', false), ('attendee:host-cto-fireside', 'a48', false), ('attendee:host-cto-fireside', 'a49', false), ('attendee:host-cto-fireside', 'a55', false), ('attendee:host-cto-fireside', 'a59', false), ('attendee:host-cto-fireside', 'a39', false), ('attendee:host-cto-fireside', 'a1', false), ('attendee:host-cto-fireside', 'a18', true),
  ('partiful:ptf-ai-founders-dinner', 'a2', false), ('partiful:ptf-ai-founders-dinner', 'a45', false), ('partiful:ptf-ai-founders-dinner', 'a50', false), ('partiful:ptf-ai-founders-dinner', 'a52', false), ('partiful:ptf-ai-founders-dinner', 'a54', false), ('partiful:ptf-ai-founders-dinner', 'a58', false), ('partiful:ptf-ai-founders-dinner', 'a16', true),
  ('luma:luma-devtools-hh', 'a2', false), ('luma:luma-devtools-hh', 'a6', false), ('luma:luma-devtools-hh', 'a15', false), ('luma:luma-devtools-hh', 'a16', false), ('luma:luma-devtools-hh', 'a46', false), ('luma:luma-devtools-hh', 'a59', false),
  ('luma:luma-ai-infra-meetup', 'a2', false), ('luma:luma-ai-infra-meetup', 'a45', false), ('luma:luma-ai-infra-meetup', 'a50', false), ('luma:luma-ai-infra-meetup', 'a54', false), ('luma:luma-ai-infra-meetup', 'a60', false),
  ('partiful:ptf-climate-nightcap', 'a19', false), ('partiful:ptf-climate-nightcap', 'a8', false),
  ('eventbrite:eb-barton-springs', 'a19', false), ('eventbrite:eb-barton-springs', 'a61', false),
  ('eventbrite:eb-two-step-lessons', 'a19', false), ('eventbrite:eb-two-step-lessons', 'a21', false), ('eventbrite:eb-two-step-lessons', 'a25', false), ('eventbrite:eb-two-step-lessons', 'a29', false), ('eventbrite:eb-two-step-lessons', 'a33', false), ('eventbrite:eb-two-step-lessons', 'a35', false), ('eventbrite:eb-two-step-lessons', 'a41', false), ('eventbrite:eb-two-step-lessons', 'a43', false), ('eventbrite:eb-two-step-lessons', 'a13', false), ('eventbrite:eb-two-step-lessons', 'a22', false),
  ('attendee:host-tech-meetup-hh', 'a6', false), ('attendee:host-tech-meetup-hh', 'a2', false), ('attendee:host-tech-meetup-hh', 'a7', false), ('attendee:host-tech-meetup-hh', 'a15', false), ('attendee:host-tech-meetup-hh', 'a16', false), ('attendee:host-tech-meetup-hh', 'a17', false), ('attendee:host-tech-meetup-hh', 'a18', false), ('attendee:host-tech-meetup-hh', 'a45', false), ('attendee:host-tech-meetup-hh', 'a46', false), ('attendee:host-tech-meetup-hh', 'a48', false), ('attendee:host-tech-meetup-hh', 'a49', false), ('attendee:host-tech-meetup-hh', 'a50', false), ('attendee:host-tech-meetup-hh', 'a51', false), ('attendee:host-tech-meetup-hh', 'a52', false), ('attendee:host-tech-meetup-hh', 'a53', false), ('attendee:host-tech-meetup-hh', 'a54', false), ('attendee:host-tech-meetup-hh', 'a55', false), ('attendee:host-tech-meetup-hh', 'a56', false), ('attendee:host-tech-meetup-hh', 'a58', false), ('attendee:host-tech-meetup-hh', 'a59', false), ('attendee:host-tech-meetup-hh', 'a60', false), ('attendee:host-tech-meetup-hh', 'a62', false), ('attendee:host-tech-meetup-hh', 'a63', false), ('attendee:host-tech-meetup-hh', 'a9', true),
  ('shotgun:sg-summit-rooftop-dj', 'a3', false), ('shotgun:sg-summit-rooftop-dj', 'a4', false), ('shotgun:sg-summit-rooftop-dj', 'a12', false), ('shotgun:sg-summit-rooftop-dj', 'a19', false), ('shotgun:sg-summit-rooftop-dj', 'a26', false), ('shotgun:sg-summit-rooftop-dj', 'a31', false), ('shotgun:sg-summit-rooftop-dj', 'a56', false), ('shotgun:sg-summit-rooftop-dj', 'a57', false), ('shotgun:sg-summit-rooftop-dj', 'a61', false), ('shotgun:sg-summit-rooftop-dj', 'a45', false), ('shotgun:sg-summit-rooftop-dj', 'a50', false), ('shotgun:sg-summit-rooftop-dj', 'a60', false), ('shotgun:sg-summit-rooftop-dj', 'a63', false), ('shotgun:sg-summit-rooftop-dj', 'a28', false), ('shotgun:sg-summit-rooftop-dj', 'a34', false), ('shotgun:sg-summit-rooftop-dj', 'a40', false), ('shotgun:sg-summit-rooftop-dj', 'a42', false), ('shotgun:sg-summit-rooftop-dj', 'a13', true),
  ('shotgun:sg-rooftop-social', 'a3', false), ('shotgun:sg-rooftop-social', 'a12', false), ('shotgun:sg-rooftop-social', 'a19', false), ('shotgun:sg-rooftop-social', 'a57', false), ('shotgun:sg-rooftop-social', 'a61', false), ('shotgun:sg-rooftop-social', 'a56', false),
  ('shotgun:sg-barbarella-throwback', 'a21', false), ('shotgun:sg-barbarella-throwback', 'a24', false), ('shotgun:sg-barbarella-throwback', 'a28', false), ('shotgun:sg-barbarella-throwback', 'a30', false), ('shotgun:sg-barbarella-throwback', 'a32', false), ('shotgun:sg-barbarella-throwback', 'a36', false), ('shotgun:sg-barbarella-throwback', 'a38', false), ('shotgun:sg-barbarella-throwback', 'a40', false), ('shotgun:sg-barbarella-throwback', 'a44', false), ('shotgun:sg-barbarella-throwback', 'a49', false), ('shotgun:sg-barbarella-throwback', 'a51', false), ('shotgun:sg-barbarella-throwback', 'a55', false),
  ('shotgun:sg-open-air-block-party', 'a2', false), ('shotgun:sg-open-air-block-party', 'a6', false), ('shotgun:sg-open-air-block-party', 'a16', false), ('shotgun:sg-open-air-block-party', 'a45', false), ('shotgun:sg-open-air-block-party', 'a46', false), ('shotgun:sg-open-air-block-party', 'a48', false), ('shotgun:sg-open-air-block-party', 'a50', false), ('shotgun:sg-open-air-block-party', 'a51', false), ('shotgun:sg-open-air-block-party', 'a53', false), ('shotgun:sg-open-air-block-party', 'a55', false), ('shotgun:sg-open-air-block-party', 'a58', false), ('shotgun:sg-open-air-block-party', 'a59', false), ('shotgun:sg-open-air-block-party', 'a60', false), ('shotgun:sg-open-air-block-party', 'a62', false), ('shotgun:sg-open-air-block-party', 'a63', false), ('shotgun:sg-open-air-block-party', 'a19', false), ('shotgun:sg-open-air-block-party', 'a22', false), ('shotgun:sg-open-air-block-party', 'a26', false), ('shotgun:sg-open-air-block-party', 'a31', false), ('shotgun:sg-open-air-block-party', 'a34', false), ('shotgun:sg-open-air-block-party', 'a36', false), ('shotgun:sg-open-air-block-party', 'a42', false), ('shotgun:sg-open-air-block-party', 'a9', true),
  ('partiful:ptf-wine-on-second', 'a3', false), ('partiful:ptf-wine-on-second', 'a4', false), ('partiful:ptf-wine-on-second', 'a5', false), ('partiful:ptf-wine-on-second', 'a8', false), ('partiful:ptf-wine-on-second', 'a11', false), ('partiful:ptf-wine-on-second', 'a14', false), ('partiful:ptf-wine-on-second', 'a57', false), ('partiful:ptf-wine-on-second', 'a61', false),
  ('partiful:ptf-zilker-picnic', 'a19', false), ('partiful:ptf-zilker-picnic', 'a8', false), ('partiful:ptf-zilker-picnic', 'a12', false), ('partiful:ptf-zilker-picnic', 'a26', false), ('partiful:ptf-zilker-picnic', 'a56', false), ('partiful:ptf-zilker-picnic', 'a61', false), ('partiful:ptf-zilker-picnic', 'a48', false), ('partiful:ptf-zilker-picnic', 'a63', false),
  ('partiful:ptf-late-night-pizza', 'a45', false), ('partiful:ptf-late-night-pizza', 'a50', false), ('partiful:ptf-late-night-pizza', 'a52', false), ('partiful:ptf-late-night-pizza', 'a55', false), ('partiful:ptf-late-night-pizza', 'a58', false), ('partiful:ptf-late-night-pizza', 'a60', false), ('partiful:ptf-late-night-pizza', 'a62', false), ('partiful:ptf-late-night-pizza', 'a63', false), ('partiful:ptf-late-night-pizza', 'a21', false), ('partiful:ptf-late-night-pizza', 'a32', false), ('partiful:ptf-late-night-pizza', 'a38', false), ('partiful:ptf-late-night-pizza', 'a13', false), ('partiful:ptf-late-night-pizza', 'a9', true),
  ('luma:luma-stripe-payments-eng', 'a1', false), ('luma:luma-stripe-payments-eng', 'a5', false), ('luma:luma-stripe-payments-eng', 'a8', false), ('luma:luma-stripe-payments-eng', 'a14', false), ('luma:luma-stripe-payments-eng', 'a15', false), ('luma:luma-stripe-payments-eng', 'a17', false), ('luma:luma-stripe-payments-eng', 'a20', false), ('luma:luma-stripe-payments-eng', 'a23', false), ('luma:luma-stripe-payments-eng', 'a39', false), ('luma:luma-stripe-payments-eng', 'a11', false),
  ('luma:luma-nvidia-inference', 'a2', false), ('luma:luma-nvidia-inference', 'a45', false), ('luma:luma-nvidia-inference', 'a50', false), ('luma:luma-nvidia-inference', 'a52', false), ('luma:luma-nvidia-inference', 'a54', false), ('luma:luma-nvidia-inference', 'a58', false), ('luma:luma-nvidia-inference', 'a60', false), ('luma:luma-nvidia-inference', 'a62', false), ('luma:luma-nvidia-inference', 'a16', false), ('luma:luma-nvidia-inference', 'a53', false),
  ('luma:luma-datadog-observability', 'a6', false), ('luma:luma-datadog-observability', 'a7', false), ('luma:luma-datadog-observability', 'a18', false), ('luma:luma-datadog-observability', 'a46', false), ('luma:luma-datadog-observability', 'a48', false), ('luma:luma-datadog-observability', 'a49', false), ('luma:luma-datadog-observability', 'a51', false), ('luma:luma-datadog-observability', 'a55', false), ('luma:luma-datadog-observability', 'a59', false),
  ('luma:luma-github-open-source', 'a2', false), ('luma:luma-github-open-source', 'a45', false), ('luma:luma-github-open-source', 'a46', false), ('luma:luma-github-open-source', 'a50', false), ('luma:luma-github-open-source', 'a51', false), ('luma:luma-github-open-source', 'a53', false), ('luma:luma-github-open-source', 'a58', false), ('luma:luma-github-open-source', 'a60', false), ('luma:luma-github-open-source', 'a62', false), ('luma:luma-github-open-source', 'a63', false), ('luma:luma-github-open-source', 'a55', false),
  ('official:tys-opening-reception', 't1', false), ('official:tys-opening-reception', 't2', false), ('official:tys-opening-reception', 't3', false), ('official:tys-opening-reception', 't5', true),
  ('eventbrite:tys-eb-placeholder-mixer', 't2', false), ('eventbrite:tys-eb-placeholder-mixer', 't4', false),
  ('attendee:tys-host-placeholder-meetup', 't1', false), ('attendee:tys-host-placeholder-meetup', 't2', false), ('attendee:tys-host-placeholder-meetup', 't6', false);
