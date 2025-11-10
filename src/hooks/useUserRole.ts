import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const [role, setRole] = useState<"cabinet" | "enterprise" | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setRole(null);

      const email = user.email;

      // check si dans "entreprises"
      const { data: ent } = await (supabase as any).from("entreprises").select("id").eq("email", email).single();

      if (ent) return setRole("enterprise");

      // sinon cabinet
      setRole("cabinet");
    };

    load();
  }, []);

  return role;
};
