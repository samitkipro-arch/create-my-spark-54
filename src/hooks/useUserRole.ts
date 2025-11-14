import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "cabinet" | "client" | null;

type UseUserRoleResult = {
  role: UserRole;
  loading: boolean;
  enterpriseName: string | null;
};

export function useUserRole(): UseUserRoleResult {
  const initialRole = (sessionStorage.getItem("finvisor:userRole") as UserRole) ?? null;
  const initialEntName = sessionStorage.getItem("finvisor:enterpriseName");

  const [role, setRole] = useState<UserRole>(initialRole);
  const [enterpriseName, setEnterpriseName] = useState<string | null>(initialEntName);
  const [loading, setLoading] = useState<boolean>(!initialRole);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      setLoading(true);

      // get user
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) {
        if (!cancelled) {
          setRole(null);
          setEnterpriseName(null);
          sessionStorage.clear();
          setLoading(false);
        }
        return;
      }

      // get profile → account_type
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, first_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      const type = (profile?.account_type ?? null) as UserRole;
      setRole(type);
      sessionStorage.setItem("finvisor:userRole", type ?? "");

      // if client → fetch entreprise name
      if (type === "client") {
        const { data: ent } = await supabase.from("entreprises").select("name").eq("user_id", userId).maybeSingle();

        const name = ent?.name || null;
        setEnterpriseName(name);
        sessionStorage.setItem("finvisor:enterpriseName", name ?? "");
      } else {
        setEnterpriseName(null);
        sessionStorage.removeItem("finvisor:enterpriseName");
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

  return { role, loading, enterpriseName };
}
