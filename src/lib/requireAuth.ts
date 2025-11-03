import { Session } from '@supabase/supabase-js';
import { waitForSession } from './authBootstrap';

/**
 * Guard function to ensure user is authenticated
 * Redirects to login if no session is found
 */
export async function requireAuth(timeoutMs = 4000): Promise<Session | null> {
  try {
    const session = await waitForSession(timeoutMs);
    if (!session) {
      // No session found, redirect to login
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/auth?next=${next}`;
      return null;
    }
    return session;
  } catch (error) {
    console.error('Auth required but failed:', error);
    window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }
}
