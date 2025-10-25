import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="md:ml-6 md:my-6">
          <div className="sticky top-6 h-[calc(100vh-3rem)] w-[260px] rounded-2xl border bg-card shadow-2xl overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <Sidebar />
          </div>
        </aside>
      )}

      {/* Mobile Header with Hamburger */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border">
          <div className="flex items-center justify-between p-4">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
                <Sidebar onNavigate={() => setIsOpen(false)} />
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold text-primary">Finvisor</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>
      )}

      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-16' : ''}`}>
        {children}
      </main>
    </div>
  );
};
