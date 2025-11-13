import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const TITLES: Record<string, string> = {
    "/dashboard": "Tableau de bord",
    "/recus": "Reçus",
    "/clients": "Clients",
    "/equipe": "Équipe",
    "/rapports": "Rapports & Exports",
    "/parametres": "Paramètres",
  };

  const SUBTITLES: Record<string, string> = {
    "/dashboard": "Suivez votre activité",
    "/recus": "Gérez vos reçus et factures",
    "/clients": "Gérez vos clients et leur suivi",
    "/equipe": "Gérez les membres et autorisations",
    "/rapports": "Exportez et analysez vos données",
    "/parametres": "Configurez votre espace",
  };

  const title = TITLES[location.pathname] || "Finvisor";
  const subtitle = SUBTITLES[location.pathname] || "";

  return (
    <div className="flex min-h-screen bg-background">
      {/* 🖥️ DESKTOP SIDEBAR — FULL FIXED SHADCN STYLE */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 w-[260px] border-r border-sidebar-border bg-sidebar z-20">
          <Sidebar />
        </aside>
      )}

      {/* 🧭 DESKTOP HEADER */}
      {!isMobile && (
        <header className="fixed top-0 left-[260px] right-0 h-20 border-b border-border bg-background/90 backdrop-blur z-10 flex flex-col justify-center px-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </header>
      )}

      {/* 📱 MOBILE HEADER */}
      {isMobile && (
        <header className="fixed inset-x-0 top-0 h-16 bg-background/90 backdrop-blur border-b border-border flex items-center justify-center z-30">
          <h1 className="text-lg font-semibold">{title}</h1>
        </header>
      )}

      {/* 🍔 MOBILE MENU */}
      {isMobile && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="fixed top-4 left-4 z-40 p-2">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </SheetTrigger>

          <SheetContent className="p-0 w-[260px] bg-sidebar/95 backdrop-blur-xl border-none" side="left">
            <Sidebar onNavigate={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* 🧩 MAIN CONTENT */}
      <main
        className={`
          flex-1 
          ml-0 
          ${!isMobile ? "ml-[260px] mt-20 p-8" : "pt-20 p-4"} 
          min-h-screen 
        `}
      >
        {children}
      </main>
    </div>
  );
};
