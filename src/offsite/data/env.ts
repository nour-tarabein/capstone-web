/**
 * Vite inlines import.meta.env.VITE_* at build time, so these are read as
 * literal property accesses. Kept separate from index.ts so supabaseRepository
 * can read config without importing index (which imports it — a cycle).
 *
 * All three are empty/unset by default, which is what makes a fresh clone and
 * the GitHub Pages build fall back to the fixture-backed demo with zero setup.
 */
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
export const forceMock = import.meta.env.VITE_OFFSITE_MOCK === '1';
