/**
 * Environment variable validation and access
 * Safely reads environment variables with proper error handling
 */

// Client-safe environment variables
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

// Server-only environment variables
export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

/**
 * Validates that required environment variables are present
 * Throws readable errors if any are missing at runtime
 * Does not crash build if they're absent in CI without secrets
 */
export function validateEnv() {
  const missing: string[] = [];

  // Check client-safe variables
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Check server-only variables
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env.local file and ensure all Supabase variables are set.'
    );
  }
}

/**
 * Gets validated environment variables for client use
 * @returns Client-safe environment variables
 */
export function getClientEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}

/**
 * Gets validated environment variables for server use
 * @returns Server-only environment variables
 */
export function getServerEnv() {
  return {
    SUPABASE_SERVICE_ROLE_KEY: serverEnv.SUPABASE_SERVICE_ROLE_KEY!,
  };
}
