# agents.md

Guidance for AI coding agents working in this repository. Read alongside `CLAUDE.md`.

## What this codebase is

A pitch demo for Cvent — a UI mockup of a "Tonight Nearby" feature for the Cvent Attendee Hub. There is no test suite. Correctness is verified by running the app and walking the demo script. When you make a change, run `npm run build` (type-checks + builds) and then test the affected flows in the browser.

## The demo script — don't break these flows

Any change that breaks one of these paths breaks the pitch:

1. **Home → Tonight Nearby** opens the map with event pins and a horizontal card strip.
2. **Tap a pin** → matching card scrolls into view. **Tap a card** → matching pin highlights.
3. **Tap an event card** → EventSheet opens. Tap **I'm going** → attending list unlocks, confetti fires, pin badge count increments.
4. **Viewing as** switches persona; the attending list regroups.
5. **Host** → fill in form → submit → "Sent for review" confirmation.
6. **More → Organizer mode on → Review queue** → approve a pending event → go back to map and see it appear.
7. **Search, concierge, session sheets, DM thread** all open and dismiss cleanly.

## Invariants that must not be broken

**Reciprocity gate**: `getAttendingList` must return `{ gated: true }` when the viewer has not RSVP'd. The `AttendingList` type is a discriminated union — keep it that way. Never add a code path that returns named attendees without the viewer being in the RSVP set.

**No reverse lookup**: The `Repository` interface has no method that answers "which events is person X attending." This is intentional and must stay absent. If you need a new data-fetching method, check that it cannot be used to reconstruct a person's event history.

**Candidates are invisible until approved**: `listEventsForNight` returns only approved events. Do not add a client-side filter as a substitute — the enforcement lives in the repository (and in Supabase RLS). Any new query that lists events must respect `curationStatus === 'approved'`.

**`src/offsite/` is a shared module**: everything under `src/offsite/` is ported from the companion React Native app. Domain types, fixtures, grouping logic, and the repository interface must stay in sync with that repo. If you change `domain/types.ts` or `domain/relevance.ts`, note the change so it can be mirrored.

**Theme colors are mirrored**: `src/theme.ts` mirrors `src/theme/colors.ts` in the mobile repo. Don't add colors here without adding them there.

## Safe changes vs. changes that need care

**Generally safe:**
- Adding or editing sheet content (`src/sheets/`, `src/components/`)
- Adding screens under `src/screens/` and wiring a new tab or route
- Styling changes in `src/styles.css`
- Adding new overlay kinds to `overlays.tsx` (follow the existing discriminated union pattern)
- Adding new fixture data under `src/offsite/fixtures/`

**Needs care:**
- Editing `domain/types.ts` — downstream effects in both repos
- Editing `domain/relevance.ts` — the grouping logic is the core social mechanic; test with multiple personas
- Editing `data/repository.ts` (the interface) — both mock and Supabase implementations must stay in sync
- Editing `src/offsite/data/mockRepository.ts` — this is the demo fallback; it must work without any environment variables
- Adding new `EventSource` values — requires updates to `format.ts` (colors, labels), `SourceBadge`, and fixture data
- Changing the `Sheet` animation or dismiss logic — affects every bottom sheet in the app

## How state flows

All shared state uses module-level singletons + `useSyncExternalStore`. There are no React context providers for state. To add reactive global state, follow the pattern in `src/offsite/persona.ts`: module variable, listener set, `emit()` helper, a `use*()` hook via `useSyncExternalStore`.

To push a bottom sheet from anywhere: `openOverlay({ kind: '...' })`. Add new overlay kinds to the `Overlay` union in `overlays.tsx` and handle them in the `content()` switch.

To navigate to a full-screen route: call `openMap()` or `openReview()` (hash-based). To add a new route, extend the `Route` type and `parseRoute()` in `App.tsx`.

## Verifying your work

```sh
npm run build   # must pass with zero type errors
npm run dev     # then walk the demo script above
```

The Supabase backend is optional. All demo flows must work with the in-memory mock (no `.env.local` required).
