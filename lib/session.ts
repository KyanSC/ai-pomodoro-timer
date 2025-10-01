import { getSupabaseServerClient } from './supabaseServer';

/**
 * Gets the current user session on the server
 * @returns User session data or null if not authenticated
 */
export async function getSession() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email || null,
        user_metadata: user.user_metadata || {},
      },
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}
