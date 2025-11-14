import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Receipt, Users, UserCog, BarChart3, Settings, Search, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
};

const ALL_ITEMS: MenuItem[] = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard" },
  { icon: Receipt, label: "Reçus", path: "/recus" },
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: UserCog, label: "Équipe", path: "/equipe" },
  { icon: BarChart3, label: "Rapports & Exports", path: "/rapports" },
  { icon: Settings, label: "Paramètres", path: "/parametres" },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();

  /* ------------------------ PROFIL ------------------------ */
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(data || {});
    };
    load();
  }, [user]);

  const initials = `${profile?.first_name?.[0] || ""}${profile?.last_name?.[0] || ""}`.toUpperCase() || "?";

  /* ------------------------ RESTRICTIF ENTREPRISE ------------------------ */
  const menuItems =
    role === "enterprise"
      ? ALL_ITEMS.filter((i) => ["/dashboard", "/recus", "/parametres"].includes(i.path))
      : ALL_ITEMS;

  /* ------------------------ RECHERCHE ------------------------ */
  const [search, setSearch] = useState("");

  const filteredItems = menuItems.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()));

  /* ------------------------ LOADING ROLE ------------------------ */
  if (role === null) {
    return (
      <div className="w-full bg-sidebar flex flex-col h-full p-6">
        <div className="h-6 w-32 bg-sidebar-accent/40 rounded-md" />
      </div>
    );
  }

  return (
    <div className="w-full bg-sidebar h-full flex flex-col border-r border-sidebar-border">
      {/* LOGO */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight text-primary">Finvisor</h1>
      </div>

      {/* SEARCH BAR */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-3 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-8 bg-sidebar-accent border-sidebar-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Dropdown search results */}
        {search.length > 0 && (
          <div className="mt-2 bg-sidebar-accent border border-sidebar-border rounded-lg py-1 max-h-48 overflow-auto">
            {filteredItems.length === 0 && (
              <p className="text-center py-2 text-sm text-muted-foreground">Aucun résultat</p>
            )}

            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSearch("");
                    onNavigate?.();
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 hover:bg-sidebar-border/20 text-sm"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MENU ITEMS */}
      <nav className="flex-1 px-3 mt-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent/50 text-primary border border-primary/20",
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* HELP + SETTINGS */}
      <div className="px-4 pb-4 space-y-2 border-t border-sidebar-border pt-4">
        <Link
          to="/aide-support"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm"
        >
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          Obtenir de l’aide
        </Link>

        <Link
          to="/parametres"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
          Paramètres
        </Link>
      </div>

      {/* PROFILE WIDGET */}
      <div className="p-4 border-t border-sidebar-border">
        <Link
          to="/compte-profile"
          onClick={onNavigate}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition"
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {profile?.first_name} {profile?.last_name}
            </span>
            <span className="text-xs text-muted-foreground">{profile?.email}</span>
          </div>
        </Link>
      </div>
    </div>
  );
};
