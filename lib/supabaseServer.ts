import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getClientEnv } from './env';

/**
 * Creates a Supabase client for server use
 * Handles cookies for authentication state management
 * @param cookiesStore - Optional cookies store from Next.js headers
 * @returns Supabase server client
 */
export async function getSupabaseServerClient(
  cookiesStore?: Awaited<ReturnType<typeof cookies>>
) {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getClientEnv();

  const cookieStore = cookiesStore || await cookies();

  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
          }
        },
      },
    }
  );
}


