import { supabase } from '@/integrations/supabase/client';

/**
 * Clean logout function that ensures complete session cleanup
 * and redirects to login page
 */
export async function logout() {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error) {
    console.warn('SignOut error:', error);
  } finally {
    // Clean all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Force navigation to login (replace to avoid back button issues)
    window.location.replace('/auth');
  }
}
