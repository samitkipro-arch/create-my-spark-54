import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, organisationId?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  receiptsCredits: number;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptsCredits, setReceiptsCredits] = useState(0);
  const navigate = useNavigate();

  const refreshCredits = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-receipt-credits');
      if (error) throw error;
      if (data?.credits !== undefined) {
        setReceiptsCredits(data.credits);
      }
    } catch (error) {
      console.error('Error refreshing credits:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Refresh credits when user logs in
        if (session?.user) {
          await refreshCredits();
        } else {
          setReceiptsCredits(0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Refresh credits on initial load
      if (session?.user) {
        await refreshCredits();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, organisationId?: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (!error && data.user) {
      // Utiliser setTimeout pour éviter le deadlock avec onAuthStateChange
      setTimeout(async () => {
        try {
          let orgId = organisationId;

          // Si pas d'organisation fournie, en créer une nouvelle
          if (!orgId) {
            const { data: newOrg, error: orgError } = await (supabase as any)
              .from('orgs')
              .insert({ name: `Organisation de ${firstName} ${lastName}` })
              .select('id')
              .single();

            if (orgError || !newOrg) {
              console.error('Erreur création organisation:', orgError);
              return;
            }
            orgId = newOrg.id;
          }

          // Créer le profil
          const { error: profileError } = await (supabase as any)
            .from('profiles')
            .insert({
              user_id: data.user!.id,
              first_name: firstName,
              last_name: lastName,
            });

          if (profileError) {
            console.error('Erreur création profil:', profileError);
          }

          // Ajouter l'utilisateur à l'organisation (sans is_active car la colonne n'existe pas)
          const { error: memberError } = await (supabase as any)
            .from('org_members')
            .insert({
              user_id: data.user!.id,
              org_id: orgId,
            });

          if (memberError) {
            console.error('Erreur ajout membre organisation:', memberError);
          }
        } catch (err) {
          console.error('Erreur lors du signup:', err);
        }
      }, 0);
    }

    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e) {
      console.error('Erreur lors de la déconnexion:', e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, loading, receiptsCredits, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
