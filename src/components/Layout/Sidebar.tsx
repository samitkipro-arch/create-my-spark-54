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
  const role = useUserRole(); // "cabinet" | "enterprise" | null (pendant le chargement)

  // Évite le "flash" d’items : tant que le rôle n’est pas connu, on ne rend rien
  if (role === null) {
    return (
      <div className="w-full bg-sidebar flex flex-col h-full md:border-r md:border-sidebar-border">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">Finvisor</h1>
        </div>
        <nav className="flex-1 px-4 py-2" aria-hidden>
          <div className="space-y-1">
            <div className="h-9 rounded-lg bg-sidebar-accent/40" />
            <div className="h-9 rounded-lg bg-sidebar-accent/40" />
            <div className="h-9 rounded-lg bg-sidebar-accent/40" />
          </div>
        </nav>
        <div className="p-4">
          <div className="h-10 rounded-lg bg-sidebar-accent/40" />
        </div>
      </div>
    );
  }

  // Si enterprise => ne garder que Dashboard, Reçus, Paramètres
  const menuItems: MenuItem[] =
    role === "enterprise"
      ? ALL_ITEMS.filter((i) => ["/dashboard", "/recus", "/parametres"].includes(i.path))
      : ALL_ITEMS;

  return (
    <div className="w-full bg-sidebar flex flex-col h-full md:border-r md:border-sidebar-border">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">Finvisor</h1>
      </div>

      <nav className="flex-1 px-4 py-2">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  isActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={signOut}>
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Déconnexion</span>
        </Button>
      </div>
    </div>
  );
};
