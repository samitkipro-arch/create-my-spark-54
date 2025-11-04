import { MainLayout } from "@/components/Layout/MainLayout";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { User, CreditCard, HelpCircle } from "lucide-react";

const menuItems = [
  { icon: User, label: "Compte & Profil", path: "/parametres/compte" },
  { icon: CreditCard, label: "Abonnement & Facturation", path: "/parametres/abonnement" },
  { icon: HelpCircle, label: "Aide & Support", path: "/parametres/aide" },
];

const Parametres = () => {
  const location = useLocation();

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Paramètres</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:scale-105",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Icon className="w-8 h-8 mb-3 text-primary" />
                <span className="text-sm font-medium text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Parametres;
