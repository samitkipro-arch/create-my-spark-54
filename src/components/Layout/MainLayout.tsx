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
    "/": "Vue d'ensemble de votre activité",
    "/clients": "Gérez vos clients, leurs informations légales et leur suivi en un seul endroit.",
    "/equipe": "Gérez les membres de votre équipe et leurs autorisations.",
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

      {/* Mobile Page Title and Subtitle */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-30 flex flex-col items-center justify-center pt-4 pb-3 pointer-events-none">
          <h1 className="text-lg font-bold text-foreground">{currentTitle}</h1>
          {currentSubtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 px-4 text-center opacity-60">
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
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                backdropFilter: "blur(6px)",
              }}
              className="fixed top-4 left-4 z-50 p-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-border/30 pointer-events-auto"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="p-4 w-[280px] bg-sidebar border-sidebar-border m-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.25)] h-auto overflow-auto"
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

      <main className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${isMobile ? 'pt-20' : ''}`}>
        {children}
      </main>
    </div>
  );
};
