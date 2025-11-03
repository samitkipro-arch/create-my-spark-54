import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

/**
 * Wait for a valid session to be available
 * This prevents making queries before auth is ready
 */
export async function waitForSession(timeoutMs = 5000): Promise<Session | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    // 1) Check for existing session immediately
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      clearTimeout(timeout);
      return session;
    }

    // 2) Wait for auth state change event (once)
    return await new Promise<Session | null>((resolve, reject) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(session);
        }
      });

      ctrl.signal.addEventListener('abort', () => {
        subscription.unsubscribe();
        reject(new Error('Session timeout'));
      });
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error('Session bootstrap error:', error);
    return null;
  }
}
