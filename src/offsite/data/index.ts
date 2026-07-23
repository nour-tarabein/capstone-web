import type { Repository } from './repository';
import { createMockRepository } from './mockRepository';
import { createSupabaseRepository } from './supabaseRepository';
import { forceMock, supabaseAnonKey, supabaseUrl } from './env';

/**
 * Falls back to fixtures whenever Supabase config is absent, so a fresh clone
 * and the default GitHub Pages build run with no setup and survive a dead
 * network (DESIGN.md #11). Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (see
 * supabase/schema.sql and the README) to switch on the live, multi-device
 * backend — that is what lets an event created on one phone appear on others.
 */
const useMock = forceMock || !supabaseUrl || !supabaseAnonKey;

export const repository: Repository = useMock
  ? createMockRepository()
  : createSupabaseRepository();

export const isMockMode = useMock;
