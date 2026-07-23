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

## Demo script

- **Home → Tonight Nearby** opens the off-site networking map: official
  conference events plus Eventbrite/Luma/Partiful/Shotgun events around
  downtown Austin, one night at a time.
- Tap a pin or a card, then **I'm going** — the attending list unlocks only
  after you RSVP (the reciprocity gate), grouped by what you share with each
  person.
- **Viewing as** switches the demo persona; the attending list regroups
  around the new viewer.
- **Host** submits a new event. It does not appear on the map yet — flip on
  **Organizer mode** in the More tab, open the **Review queue**, approve it,
  and go back to the map to see it land.

## How it differs from the mobile app

- The map is Leaflet with CARTO's dark basemap instead of Mapbox in a
  WebView — no access token to ship with the demo.
- Nearby search (coffee/food/hotels) is omitted; it needs the Mapbox Search
  API, which needs a token.
- The Host form picks from preset downtown venues instead of live venue
  search, for the same reason.
- State is in-memory only (the mobile app can also run against Supabase).

Everything under `src/offsite/` — domain types, fixtures, the grouping
logic, the mock repository — is ported unchanged from the mobile repo, so
the two apps cannot drift apart on the data they demo.
