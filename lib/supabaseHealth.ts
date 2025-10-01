import { validateEnv } from './env';

/**
 * Health check result type
 */
export type SupabaseHealthResult = {
  ok: true;
};

/**
 * Checks if Supabase environment variables are properly configured
 * @returns Health check result if environment is valid
 * @throws Error with helpful message if environment is invalid
 */
export function checkSupabaseEnv(): SupabaseHealthResult {
  try {
    validateEnv();
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Supabase environment check failed: ${error.message}. ` +
        'Please ensure all required environment variables are set in your .env.local file.'
      );
    }
    throw new Error('Supabase environment check failed: Unknown error');
  }
}
