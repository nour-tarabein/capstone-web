import { useEffect } from 'react';
import type { Repository } from './repository';
import { createMockRepository } from './mockRepository';
import { createSupabaseRepository } from './supabaseRepository';
import { isLiveConference, supabaseConfigured } from './liveConferences';
import { useActiveConferenceId } from '../activeConference';
import { setLiveRoster } from '../roster';

const mockRepository = createMockRepository();
// Constructing createSupabaseRepository() calls supabase-js's createClient(),
// which throws on an empty URL — only build it when config is actually
// present, never eagerly.
const liveRepository = supabaseConfigured ? createSupabaseRepository() : null;

/**
 * The repository for one conference (issue #7). Austin runs on the mock
 * repository unconditionally; Tysons Corner runs on the live Supabase
 * repository once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set, and
 * falls back to mock otherwise — a fresh clone and the default GitHub Pages
 * build still run with zero setup and survive a dead network (DESIGN.md #11).
 */
export function getRepository(conferenceId: string): Repository {
  if (liveRepository && isLiveConference(conferenceId)) return liveRepository;
  return mockRepository;
}

/** Fetches the live roster for one conference and publishes it to roster.ts. A no-op for a mock-backed conference. */
export async function refreshLiveRoster(conferenceId: string): Promise<void> {
  if (!liveRepository || !isLiveConference(conferenceId)) return;
  const attendees = await liveRepository.listRoster(conferenceId);
  setLiveRoster(conferenceId, attendees);
}

/**
 * Keeps roster.ts's cache warm for whichever conference is active, so
 * People/Attendees, Search, and session-matching show attendees who checked
 * in on someone else's phone (issue #7) without every screen having to fetch
 * for itself. Mount once, at the app root.
 */
export function useLiveRosterSync(): void {
  const conferenceId = useActiveConferenceId();
  useEffect(() => {
    let cancelled = false;
    refreshLiveRoster(conferenceId).catch((err: unknown) => {
      if (!cancelled) console.error('[roster] live refresh failed', err);
    });
    return () => {
      cancelled = true;
    };
  }, [conferenceId]);
}
