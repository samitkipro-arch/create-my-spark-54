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

  // Fonction pour lier un utilisateur à une organisation
  const linkUserToOrg = async (userId: string) => {
    try {
      // 1. Chercher le profil de l'utilisateur pour voir s'il a déjà un org_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id, first_name, last_name, email')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      let orgId = profile?.org_id;

      // 2. Si pas d'org_id dans le profil, chercher une org avec owner_id = userId
      if (!orgId) {
        const { data: existingOrg, error: orgError } = await supabase
          .from('orgs')
          .select('id')
          .eq('owner_id', userId)
          .maybeSingle();

        if (orgError && orgError.code !== 'PGRST116') {
          console.error('Error fetching org:', orgError);
          return;
        }

        // 3. Si toujours pas d'org, en créer une
        if (!existingOrg) {
          const orgName = profile?.first_name && profile?.last_name
            ? `Organisation de ${profile.first_name} ${profile.last_name}`
            : profile?.email?.split('@')[0] || 'Mon Organisation';

          const { data: newOrg, error: createOrgError } = await supabase
            .from('orgs')
            .insert({ name: orgName, owner_id: userId })
            .select('id')
            .single();

          if (createOrgError) {
            console.error('Error creating org:', createOrgError);
            return;
          }

          orgId = newOrg.id;

          // Mettre à jour le profil avec l'org_id
          await supabase
            .from('profiles')
            .update({ org_id: orgId })
            .eq('user_id', userId);
        } else {
          orgId = existingOrg.id;
        }
      }

      // 4. Vérifier si l'utilisateur est dans org_members
      const { data: membership, error: membershipError } = await supabase
        .from('org_members')
        .select('id')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .maybeSingle();

      if (membershipError && membershipError.code !== 'PGRST116') {
        console.error('Error checking membership:', membershipError);
        return;
      }

      // 5. Si pas dans org_members, l'ajouter
      if (!membership && orgId) {
        const { error: insertMemberError } = await supabase
          .from('org_members')
          .insert({
            user_id: userId,
            org_id: orgId,
          });

        if (insertMemberError) {
          console.error('Error adding to org_members:', insertMemberError);
        }
      }
    } catch (error) {
      console.error('Error in linkUserToOrg:', error);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
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

  useEffect(() => {
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          setTimeout(() => {
            checkSubscription();
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        setTimeout(() => {
          checkSubscription();
        }, 0);
      }
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Lier l'utilisateur à son organisation après login
    if (!error && data.user) {
      await linkUserToOrg(data.user.id);
    }

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
          organization_id: organisationId,
        }
      }
    });

    // Le trigger handle_new_user gère la création de l'org, du profil et de org_members
    // Mais on appelle linkUserToOrg pour s'assurer que tout est cohérent
    if (!error && data.user) {
      await linkUserToOrg(data.user.id);
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