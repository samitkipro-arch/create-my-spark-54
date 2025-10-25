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

  const currentTitle = pageTitles[location.pathname] || "Finvisor";

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

      {/* Mobile Page Title */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center h-16 pointer-events-none">
          <h1 className="text-lg font-bold text-foreground">{currentTitle}</h1>
        </div>
      )}

      {/* Mobile Floating Hamburger Button */}
      {isMobile && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button 
              className="fixed top-4 left-4 z-50 p-3 backdrop-blur-md bg-background/80 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border border-border/50 pointer-events-auto"
            >
              <Menu className="w-6 h-6 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="p-0 w-[280px] bg-sidebar border-sidebar-border mx-4 my-20 rounded-2xl shadow-2xl h-auto max-h-[calc(100vh-10rem)]"
          >
            <Sidebar onNavigate={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <main className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${isMobile ? 'pt-16' : ''}`}>
        {children}
      </main>
    </div>
  );
};
