# Lonestar Tech Summit 2026 — web demo

A browser version of the capstone conference app, built so an audience can
try it on their own phones during a presentation. It mirrors the mobile
(Expo) app screen-for-screen — same theme, same mock data, same fixtures —
and runs entirely in the browser: no backend, no API keys, nothing to
configure. A refresh resets it to a clean slate, which is exactly what you
want when strangers are poking at it.

## Run it locally

```sh
npm install
npm run dev
```

Open the printed URL. On a desktop browser the app renders in a phone-sized
frame; on a phone it fills the screen.

## Put it on GitHub Pages

1. Create a **public** GitHub repository and push this directory to its
   `main` branch.
2. In the repo settings, under **Pages**, set the source to **GitHub
   Actions**.
3. Push (or re-run the workflow). The included
   `.github/workflows/deploy.yml` builds the site and publishes it at
   `https://<user>.github.io/<repo>/`.

Share that URL with the audience — a QR code of it on your last slide works
well. The Vite config uses a relative base path, so the build works from any
subpath without edits.

## Live multi-device mode (Supabase)

By default the app runs entirely in the browser: every phone is its own
sandbox, and a refresh resets it. To make it genuinely multi-device — an event
created or RSVP'd on one phone showing up on everyone else's — point it at a
free Supabase project. Nothing else changes; the same UI just talks to Postgres
instead of an in-memory store (the data layer was built as a swappable
interface for exactly this).

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the project's **SQL editor**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. That creates the
   tables, the Row-Level Security policies, the functions the app calls, and
   the same seed data the demo ships with. Re-running it later is how you reset
   the demo to a clean slate.
3. In **Settings → API**, copy the **Project URL** and the **anon public** key.
   The anon key is safe to expose in the browser — the schema protects data
   with RLS, not by hiding the key.
4. **Local:** `cp .env.example .env.local`, paste the two values, `npm run dev`.
5. **Deployed site:** add the two values as GitHub Actions secrets, then
   re-run the deploy workflow:
   ```sh
   gh secret set VITE_SUPABASE_URL --body "https://YOUR-PROJECT.supabase.co"
   gh secret set VITE_SUPABASE_ANON_KEY --body "YOUR-ANON-KEY"
   gh workflow run "Deploy to GitHub Pages"
   ```
   With the secrets unset, the build falls back to the in-memory demo — so the
   site keeps working before (and without) any of this.

The two-phone moment: open the same event on two phones, RSVP on one, and the
other's attending count updates within ~2.5s (it polls — a deliberate choice
over websockets for demo-wifi robustness). A **hosted** event appears on the
map once you approve it in the organizer **Review queue** (More → Organizer
mode), because attendee submissions are gated on organizer approval in Postgres.

## Demo script

- **Home → Tonight Nearby** opens the off-site networking map: official
  conference events plus Eventbrite/Luma/Partiful/Shotgun events around
  downtown Austin, one night at a time, with the conference chrome floating
  over a full-bleed dark map.
- Tap a pin or a card, then **I'm going** — the attending list unlocks only
  after you RSVP (the reciprocity gate), grouped by what you share with each
  person. **Message** anyone in the list to open a demo DM thread.
- **Viewing as** switches the demo persona; the attending list regroups
  around the new viewer.
- **Host** submits a new event. It does not appear on the map yet — flip on
  **Organizer mode** in the More tab, open the **Review queue**, approve it,
  and go back to the map to see it land.
- Everything else is tappable too: the green chat button is a scripted
  **concierge** that answers from the app's own data, search covers
  sessions/people/booths, session cards add to **My Schedule** per persona,
  exhibitors filter and favorite, and the More rows all open real sheets.

## How it differs from the mobile app

- The map is Leaflet with CARTO's dark basemap instead of Mapbox in a
  WebView — no access token to ship with the demo.
- Nearby search (coffee/food/hotels) is omitted; it needs the Mapbox Search
  API, which needs a token.
- The Host form picks from preset downtown venues instead of live venue
  search, for the same reason.
- State is in-memory by default; set the two `VITE_SUPABASE_*` vars to run
  against the same Supabase backend the mobile app uses (see above).
- The concierge chat and DM replies are scripted from the mock data — no
  model behind them, so they can never disagree with what's on screen.

Everything under `src/offsite/` — domain types, fixtures, the grouping
logic, the mock repository — is ported unchanged from the mobile repo, so
the two apps cannot drift apart on the data they demo.
