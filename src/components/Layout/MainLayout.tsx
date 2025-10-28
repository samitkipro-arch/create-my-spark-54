import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const pageTitles: Record<string, string> = {
    "/": "Tableau de bord",
    "/recus": "Reçus",
    "/clients": "Clients",
    "/equipe": "Équipe",
    "/rapports": "Rapports & Exports",
    "/parametres": "Paramètres",
  };

  const pageSubtitles: Record<string, string> = {
    "/": "Suivez votre activité",
    "/recus": "Gérez vos reçus et factures",
    "/clients": "Gérez vos clients et leur suivi",
    "/equipe": "Gérez les membres et autorisations",
    "/rapports": "Exportez et analysez vos données",
    "/parametres": "Configurez votre espace",
  };

  const currentTitle = pageTitles[location.pathname] || "Finvisor";
  const currentSubtitle = pageSubtitles[location.pathname] || "";

  return (
    <div className="flex min-h-screen bg-background transition-all duration-200">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="md:ml-6 md:my-6 transition-all duration-300 ease-in-out">
          <div className="sticky top-6 h-[calc(100vh-3rem)] w-[260px] rounded-2xl border bg-card shadow-2xl overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-all duration-200">
            <Sidebar />
          </div>
        </aside>
      )}

      {/* Desktop Page Title and Subtitle (Fixed) */}
      {!isMobile && (
        <div className="fixed top-0 left-[292px] right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border px-8 py-4">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{currentTitle}</h1>
          {currentSubtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {currentSubtitle}
            </p>
          )}
        </div>
      )}

      {/* Mobile Page Title and Subtitle (Fixed) */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border flex flex-col items-center justify-center pt-4 pb-3">
          <h1 className="text-lg font-bold text-foreground">{currentTitle}</h1>
          {currentSubtitle && (
            <p className="text-xs text-muted-foreground/70 mt-1 px-4 text-center">
              {currentSubtitle}
            </p>
          )}
        </div>
      )}

      {/* Mobile Floating Hamburger Button */}
      {isMobile && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button 
              className="fixed top-4 left-4 z-50 p-2 transition-all duration-200 pointer-events-auto"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="p-0 w-[280px] bg-sidebar/95 backdrop-blur-xl border-0 m-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.25)] h-auto overflow-hidden"
            style={{
              top: "16px",
              left: "0px",
              height: "auto",
              maxHeight: "calc(100vh - 32px)",
            }}
          >
            <Sidebar onNavigate={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <main className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${isMobile ? 'pt-20' : 'pt-24'}`}>
        {children}
      </main>
    </div>
  );
};