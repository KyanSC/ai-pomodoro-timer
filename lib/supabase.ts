import { createBrowserClient } from '@supabase/ssr';
import { getClientEnv } from './env';

/**
 * Minimal user session type
 */
export type SessionUser = {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown>;
};

/**
 * Creates a Supabase client for browser use
 * Uses public environment variables that are safe to expose client-side
 * @returns Supabase browser client
 */
export function getSupabaseBrowserClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getClientEnv();
  
  return createBrowserClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Creates a Supabase client for server use
 * Handles cookies for authentication state management
 * @param cookiesStore - Optional cookies store from Next.js headers
 * @returns Supabase server client
 */
// Note: Server client lives in lib/supabaseServer.ts to avoid bundling
// server-only imports like `next/headers` into the client build.