import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "cabinet" | "enterprise" | null;

type UseUserRoleResult = {
  role: UserRole;
  loading: boolean;
  enterpriseName: string | null;
};

export function useUserRole(): UseUserRoleResult {
  // Hydratation ultra rapide pour éviter le "flash" au montage
  const initialRole = (sessionStorage.getItem("finvisor:userRole") as UserRole) ?? null;
  const initialEntName = sessionStorage.getItem("finvisor:enterpriseName");

  const [role, setRole] = useState<UserRole>(initialRole);
  const [enterpriseName, setEnterpriseName] = useState<string | null>(initialEntName);
  const [loading, setLoading] = useState<boolean>(initialRole === null); // si connu en cache => pas de loading

  useEffect(() => {
    const resolveRole = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;

      if (!userId) {
        setRole(null);
        setEnterpriseName(null);
        sessionStorage.removeItem("finvisor:userRole");
        sessionStorage.removeItem("finvisor:enterpriseName");
        setLoading(false);
        return;
      }

      // Si l'utilisateur a une ligne dans `entreprises`, on le considère "enterprise".
      const { data: ent, error } = await (supabase as any).from("entreprises").select("name").eq("user_id", userId).limit(1);

      if (!error && ent && ent.length > 0) {
        setRole("enterprise");
        setEnterpriseName(ent[0].name || null);
        sessionStorage.setItem("finvisor:userRole", "enterprise");
        sessionStorage.setItem("finvisor:enterpriseName", ent[0].name || "");
      } else {
        setRole("cabinet");
        setEnterpriseName(null);
        sessionStorage.setItem("finvisor:userRole", "cabinet");
        sessionStorage.removeItem("finvisor:enterpriseName");
      }
      setLoading(false);
    };

    resolveRole();
    const { data: sub } = supabase.auth.onAuthStateChange(() => resolveRole());
    return () => sub?.subscription?.unsubscribe();
  }, []);

  return { role, loading, enterpriseName };
}
