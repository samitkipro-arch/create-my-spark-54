import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, Users, UserCog, BarChart3, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/" },
  { icon: Receipt, label: "Reçus", path: "/recus" },
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: UserCog, label: "Équipe", path: "/equipe" },
  { icon: BarChart3, label: "Rapports & Exports", path: "/rapports" },
  { 
    icon: Settings, 
    label: "Paramètres", 
    path: "/parametres",
    subItems: [
      { label: "Compte", path: "/parametres/compte" },
      { label: "Abonnement", path: "/parametres/abonnement" },
      { label: "Aide", path: "/parametres/aide" },
    ]
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

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
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isSubItemActive = hasSubItems && item.subItems?.some(sub => location.pathname === sub.path);
            const isExpanded = openSubMenu === item.path;
            
            return (
              <div key={item.path}>
                {hasSubItems ? (
                  <>
                    <button
                      onClick={() => setOpenSubMenu(isExpanded ? null : item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                        isActive || isSubItemActive
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        isExpanded && "rotate-180"
                      )} />
                    </button>
                    {isExpanded && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.subItems?.map((subItem) => (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            onClick={onNavigate}
                            className={cn(
                              "block px-3 py-2 rounded-lg transition-all text-sm",
                              location.pathname === subItem.path
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-sidebar-foreground hover:bg-sidebar-accent"
                            )}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </nav>
      
      <div className="p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3" 
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Déconnexion</span>
        </Button>
      </div>
    </div>
  );
};
