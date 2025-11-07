import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SubscriptionState {
  subscribed: boolean;
  plan: string | null;
  interval: string | null;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, organisationId?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  subscription: SubscriptionState;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    plan: null,
    interval: null,
    subscription_end: null,
  });
  const navigate = useNavigate();

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Ne pas appeler la fonction si pas de session valide
      if (!session?.access_token) {
        console.log('No valid session for subscription check');
        setSubscription({
          subscribed: false,
          plan: null,
          interval: null,
          subscription_end: null,
        });
        return;
      }

      console.log('Checking subscription with valid session');
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setSubscription({
          subscribed: false,
          plan: null,
          interval: null,
          subscription_end: null,
        });
        return;
      }

      if (data) {
        setSubscription({
          subscribed: data.subscribed || false,
          plan: data.plan || null,
          interval: data.interval || null,
          subscription_end: data.subscription_end || null,
        });
      }
    } catch (error) {
      console.error('Error in checkSubscription:', error);
      setSubscription({
        subscribed: false,
        plan: null,
        interval: null,
        subscription_end: null,
      });
    }
  };

  // Vérifier et réparer le lien org_members si nécessaire
  const ensureOrgMembership = async (userId: string) => {
    try {
      // Vérifier si l'utilisateur a un profil avec org_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile?.org_id) return;

      // Vérifier si l'utilisateur est déjà dans org_members avec le bon user_id
      const { data: existingMember } = await supabase
        .from('org_members')
        .select('id')
        .eq('user_id', userId)
        .eq('org_id', profile.org_id)
        .maybeSingle();

      if (existingMember) return; // Déjà OK

      // Chercher une entrée avec user_id NULL pour cette org
      const { data: nullMember } = await supabase
        .from('org_members')
        .select('id')
        .is('user_id', null)
        .eq('org_id', profile.org_id)
        .limit(1)
        .maybeSingle();

      if (nullMember) {
        // Mettre à jour l'entrée existante avec le user_id correct
        await supabase
          .from('org_members')
          .update({ user_id: userId })
          .eq('id', nullMember.id);
      } else {
        // Créer une nouvelle entrée
        await supabase
          .from('org_members')
          .insert({
            user_id: userId,
            org_id: profile.org_id,
          });
      }
    } catch (error) {
      console.error('Error ensuring org membership:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check subscription when user logs in
        if (session?.user) {
          // Différer les appels Supabase pour éviter les deadlocks
          setTimeout(async () => {
            await ensureOrgMembership(session.user.id);
            await checkSubscription();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check subscription for existing session
      if (session?.user) {
        setTimeout(async () => {
          await ensureOrgMembership(session.user.id);
          await checkSubscription();
        }, 0);
      }
    });

    return () => authSubscription.unsubscribe();
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

          // Créer le profil avec l'org_id
          const { error: profileError } = await (supabase as any)
            .from('profiles')
            .insert({
              user_id: data.user!.id,
              first_name: firstName,
              last_name: lastName,
              email: email,
              org_id: orgId,
            });

          if (profileError) {
            console.error('Erreur création profil:', profileError);
          }

          // Ajouter l'utilisateur à l'organisation
          const { error: memberError } = await (supabase as any)
            .from('org_members')
            .insert({
              user_id: data.user!.id,
              org_id: orgId,
              first_name: firstName,
              last_name: lastName,
              email: email,
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
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, loading, subscription, checkSubscription }}>
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
