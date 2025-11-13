import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, Users, UserCog, BarChart3, Settings, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";

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

export const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { role } = useUserRole();

  if (role === null) {
    return (
      <div className="flex flex-col w-full h-full p-6 space-y-6">
        <div className="h-6 w-32 bg-sidebar-accent/40 rounded-md" />
        <div className="space-y-3">
          <div className="h-10 bg-sidebar-accent/40 rounded-lg" />
          <div className="h-10 bg-sidebar-accent/40 rounded-lg" />
          <div className="h-10 bg-sidebar-accent/40 rounded-lg" />
        </div>
        <div className="h-10 bg-sidebar-accent/40 rounded-lg mt-auto" />
      </div>
    );
  }

  const items =
    role === "enterprise"
      ? ALL_ITEMS.filter((i) => ["/dashboard", "/recus", "/parametres"].includes(i.path))
      : ALL_ITEMS;

  return (
    <div className="flex flex-col h-full w-full bg-sidebar text-sidebar-foreground">
      {/* LOGO */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight">Finvisor</h1>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-primary/20 text-primary border border-primary/30 shadow-sm",
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
};
