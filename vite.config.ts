/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' emits relative asset URLs, so the build works from any path. That
// was for GitHub Pages project sites (/<repo-name>/); Vercel serves from the
// domain root, where it is unnecessary but harmless — retained intentionally
// rather than changed for no gain (issue #26).
export default defineConfig({
  base: './',
  plugins: [react()],

  // The `test` block below configures Vitest ONLY. It does not touch `npm run
  // dev`, `npm run build`, or `npm run preview` — those keep reading
  // .env.local, so the app still talks to the live Supabase backend exactly as
  // before.
  test: {
    // Only run this working tree's tests. Merged branches linger in
    // .claude/worktrees/ with their own copies of every spec; without this,
    // `npm test` runs six stale copies of checkin.test.ts alongside the real
    // one, and reports failures from code that is no longer on main.
    dir: 'src',

    env: {
      // Force the in-memory repository for every test.
      //
      // Vitest loads .env.local like any other Vite mode, so VITE_SUPABASE_URL
      // and VITE_SUPABASE_ANON_KEY are visible here. That made
      // liveConferences.supabaseConfigured true, which routed the Tysons
      // conference to the LIVE backend — so checkin.test.ts's createAttendee
      // calls were writing real rows into production on every `npm test`.
      // forceMock short-circuits that, so a test can never reach Supabase.
      VITE_OFFSITE_MOCK: '1',
    },
  },
});
