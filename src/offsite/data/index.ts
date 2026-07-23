import type { Repository } from './repository';
import { createMockRepository } from './mockRepository';

/**
 * The web demo is fixture-backed only — no Supabase, no network, nothing to
 * configure. That is what makes it safe to hand an audience: it runs entirely
 * in the browser and a refresh resets it to a clean slate.
 */
export const repository: Repository = createMockRepository();
