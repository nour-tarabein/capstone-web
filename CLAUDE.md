# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser demo of the **Lonestar Tech Summit 2026** conference app — a React/TypeScript SPA built with Vite. It mirrors a companion React Native (Expo) app screen-for-screen: same theme, same mock data, same fixtures. The goal is for a presenter to share it with an audience on their phones during a talk. Everything under `src/offsite/` is ported unchanged from the mobile repo and must stay in sync with it.

## Commands

```sh
npm run dev       # start dev server
npm run build     # tsc type check + vite build (outputs to dist/)
npm run preview   # preview the production build locally
npm test          # run the Vitest suite
```

Tests are run with Vitest. Type checking is `tsc` (via `npm run build`). There is no lint script configured.

## Architecture

### Routing

`src/App.tsx` is the root. Routing is **hash-based** (`window.location.hash`) with three routes: `tabs` (default), `map` (`#/map`), `review` (`#/review`). The map and review screens slide in as full-screen layers over the live tab stack, so tab state (scroll positions, etc.) survives navigation. Tab switching is managed by a module-level `switchTab` reference exported as `goToTab()` — this allows sheets and screens to jump tabs without prop-drilling.

### Overlay system

`src/overlays.tsx` manages a **stack of bottom sheets** via a plain module-level array + `useSyncExternalStore`. Any screen calls `openOverlay({ kind: '...' })` to push a sheet; the `OverlayHost` component renders the stack. Each `Sheet` (`src/ui/Sheet.tsx`) handles its own enter/exit animation and drag-to-dismiss — children request dismissal via the `useDismiss()` context hook rather than unmounting themselves directly.

### Global state pattern

All shared state (viewer persona, admin mode, my schedule) uses the same pattern: a module-level variable + a `Set<() => void>` of listeners + `useSyncExternalStore`. No context providers, no Redux.

- `src/offsite/persona.ts` — which attendee you're "viewing as" (demo persona switcher)
- `src/offsite/adminMode.ts` — organizer mode toggle (UI-only gate, not a security boundary)
- `src/myschedule.ts` — per-persona session bookmarks, in-memory only

### Data layer

`src/offsite/` holds the domain model ported from the mobile app:
- `fixtures/` — static mock data (attendees, sessions, events, conference config)
- `format.ts` — shared formatting utilities
- `persona.ts`, `adminMode.ts` — global state atoms

`src/data/mock.ts` derives UI-level data from the fixtures (home actions, schedule days, etc.).

### Supabase backend (optional)

By default everything is in-memory. Setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` switches the data layer to a live Supabase backend. The schema is in `supabase/schema.sql`. Copy `.env.example` to `.env.local` for local Supabase development.

### Screens vs Sheets

- `src/screens/` — full tab pages (Home, Schedule, Exhibitors, More, MyEvent) plus full-screen routes (MapScreen, ReviewQueue)
- `src/sheets/` — bottom sheet content (SessionSheet, SearchSheet, ConciergeSheet, ExhibitorSheet, PeopleSheets, InfoSheets)
- `src/components/` — reusable pieces used across screens and sheets

### Styling

Plain CSS in `src/styles.css`. Theme colors are in `src/theme.ts` (used inline in TSX) and must stay in sync with the mobile app's `src/theme/colors.ts`. Icons come from `@mdi/js` (Material Design Icons), rendered via `src/icons.tsx`.

### Map

The map screen uses **Leaflet** with CARTO's dark basemap — no Mapbox token needed. This is a deliberate divergence from the mobile app (which uses Mapbox in a WebView).

More's Location card previews the same basemap without a second Leaflet instance: `src/mapTiles.ts` holds the tile URL template (shared with the map screen) plus pure slippy-map arithmetic, and `src/components/VenueMapPreview.tsx` lays the resulting tiles out as plain `<img>` elements with the venue pin on top.

### Build / deploy

Vite is configured with `base: './'` so the build works from any URL path, including GitHub Pages project sites (`/<repo-name>/`). The deploy workflow is at `.github/workflows/deploy.yml`.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `nour-tarabein/capstone-web`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root (created lazily as needed). See `docs/agents/domain.md`.
