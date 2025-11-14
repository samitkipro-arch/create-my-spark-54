import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "cabinet" | "client" | null;

type UseUserRoleResult = {
  role: UserRole;
  loading: boolean;
};

export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;

      if (!userId) {
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error fetching profile:", error);
        setRole(null);
      } else {
        const accountType = (profileData as any)?.account_type;
        setRole((accountType as UserRole) ?? null);
      }

      setLoading(false);
    };

    resolve();
    const { data: sub } = supabase.auth.onAuthStateChange(resolve);

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return { role, loading };
}
