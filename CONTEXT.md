# Lonestar Tech Summit demo app

A conference-app demo (React/TypeScript SPA) that can run as either of two live "conferences" — Austin and Tysons Corner — sharing one codebase and one live backend. The Tysons Corner conference is built for a specific in-person presentation where the audience self-registers via QR code.

## Language

**Conference**:
A named event with its own venue, dates, attendee roster, and off-site events. There are exactly two: Austin (`lts-2026`, the original demo) and Tysons Corner (the live-audience demo). Both run against the live Supabase backend — neither falls back to static fixtures.
_Avoid_: City, event (ambiguous with `OffsiteEvent`), summit (used informally, but "Conference" is the type name).

**Active conference**:
The one conference currently selected for the whole app to display — drives the map's venue, the attendee roster, session-matching, and the "Location" card in More. Switched from a control in More, near "Exit event." Changing it does not change which `OffsiteEvent`s the Schedule/Exhibitors/Home tabs show (those are conference-agnostic, static content) — it only changes the off-site networking subsystem (map, roster, RSVPs).
_Avoid_: Selected city, current event.

**Check-in**:
The act of a real attendee submitting their first name, last name, and department on the Welcome screen. A check-in creates a real `Attendee` row (live, in Supabase, scoped to the active conference) and makes that browser's viewer that attendee, going forward. Distinct from picking a persona (see Persona switcher) — a check-in is the attendee's actual identity, not a preview of someone else's.
_Avoid_: Registration, sign-up, sign-in (there is no auth — a check-in is just a name and a department).

**Welcome screen**:
The onboarding screen a QR code lands on, shown once per browser before the normal app. Collects the check-in. Skipped on subsequent loads once a check-in exists for that browser (same sticky-in-localStorage pattern as persona/viewer-id).

**Mock personnel**:
Fictional attendees seeded into a conference's roster so the room feels populated, distinct from the real people who check in live. For Tysons Corner, modeled as employees of the event company (mirrors how the Austin roster models Cvent staff).

**Viewer**:
The attendee identity the current browser is displaying the app as — either a real check-in or (for admins only, see Persona switcher) a mock persona being previewed.

**Conference default viewer**:
The per-conference fallback identity shown when the stored viewer does not belong to the active conference. It is resolved only when read and never replaces the stored viewer, so switching back restores the browser's prior check-in or persona.

**Persona switcher**:
The "Viewing as" control in More that lets the current browser preview the app as a different attendee. For a live conference with real check-ins, this is admin-only — a regular attendee is locked into their own check-in identity.

**Admin allowlist**:
A hardcoded list of first+last name pairs, scoped to the Tysons Corner conference only. Checking in with a matching name automatically grants Organizer mode for that session — there is no manual toggle to turn it on or off. Austin is unaffected: it keeps `adminMode.ts`'s original manual, self-serve toggle, open to every viewer, exactly as today.
_Avoid_: Admin flag, feature flag (the codebase already uses "Organizer mode" as the user-facing name for this capability).

**Venue catalogue**:
A hardcoded, pre-geocoded set of real venues offered on the hosting form for a given conference. Austin has its downtown set; Tysons Corner has a McLean-area set. Looked up by conference id (`venuesForConference`) — an unknown id yields an empty catalogue, never a silent fallback to another conference. Adding a venue is a one-line fixture edit. No geocoding API, autocomplete token, or network call is involved.
_Avoid_: Venue list, Mapbox search, free-text venue.
