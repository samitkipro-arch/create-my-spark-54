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

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { role } = useUserRole();

  // Loading skeleton (évite le flash)
  if (role === null) {
    return (
      <div className="w-full bg-sidebar flex flex-col h-full border-r border-sidebar-border">
        <div className="p-6">
          <div className="h-6 w-32 bg-sidebar-accent/40 rounded-md" />
        </div>

        <div className="flex-1 px-4 py-2 space-y-2">
          <div className="h-10 rounded-lg bg-sidebar-accent/40" />
          <div className="h-10 rounded-lg bg-sidebar-accent/40" />
          <div className="h-10 rounded-lg bg-sidebar-accent/40" />
        </div>

        <div className="p-4">
          <div className="h-10 rounded-lg bg-sidebar-accent/40" />
        </div>
      </div>
    );
  }

  // Enterprise restrictions
  const menuItems =
    role === "enterprise"
      ? ALL_ITEMS.filter((i) => ["/dashboard", "/recus", "/parametres"].includes(i.path))
      : ALL_ITEMS;

  return (
    <div className="w-full h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* HEADER */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Finvisor</h1>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
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
                <Icon className={cn("w-5 h-5 transition", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </div>
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
