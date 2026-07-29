import { tysonsConference } from '../fixtures/conference';
import { forceMock, supabaseAnonKey, supabaseUrl } from './env';

/**
 * Which conferences run on the live Supabase backend, and the guard that
 * decides whether "live" is even possible right now (issue #7).
 *
 * Kept in its own file, importing only env.ts and the conference fixture, so
 * roster.ts can import it without pulling in the repository layer — which
 * imports persona.ts, which imports roster.ts. Routing this through
 * data/index.ts instead would close that cycle and leave roster.ts's
 * module-level exports in the temporal dead zone at load time.
 *
 * Austin stays on the mock repository unconditionally until a later
 * migration ticket — only Tysons Corner is listed here. VITE_OFFSITE_MOCK=1
 * still forces every conference back to mock, live or not (the demo-day
 * insurance policy).
 */
export const supabaseConfigured = !forceMock && !!supabaseUrl && !!supabaseAnonKey;

const LIVE_CONFERENCE_IDS = new Set<string>(supabaseConfigured ? [tysonsConference.id] : []);

export function isLiveConference(conferenceId: string): boolean {
  return LIVE_CONFERENCE_IDS.has(conferenceId);
}
