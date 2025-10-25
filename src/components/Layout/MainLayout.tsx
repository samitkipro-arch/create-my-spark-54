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
    <div className="flex min-h-screen bg-background transition-all duration-200">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="md:ml-6 md:my-6 transition-all duration-300 ease-in-out">
          <div className="sticky top-6 h-[calc(100vh-3rem)] w-[260px] rounded-2xl border bg-card shadow-2xl overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-all duration-200">
            <Sidebar />
          </div>
        </aside>
      )}

      {/* Mobile Floating Hamburger Button */}
      {isMobile && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="default" 
              size="icon"
              className="fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="p-0 w-[280px] bg-sidebar border-sidebar-border m-4 rounded-2xl shadow-2xl h-[calc(100vh-2rem)] top-4 left-0"
          >
            <Sidebar onNavigate={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <main className="flex-1 overflow-auto transition-all duration-300 ease-in-out">
        {children}
      </main>
    </div>
  );
};
