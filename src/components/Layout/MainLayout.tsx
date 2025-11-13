import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import SidebarContent from "./SidebarContent"; // ⬅️ Ton sidebar actuel (inchangé)

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ▬▬▬ DESKTOP SIDEBAR ▬▬▬ */}
      <aside
        className="
        hidden md:flex
        w-64 min-h-screen
        flex-col 
        border-r border-border/40 
        bg-sidebar 
        backdrop-blur-xl
      "
      >
        <SidebarContent />
      </aside>

      {/* ▬▬▬ MOBILE SIDEBAR VIA DRAWER ▬▬▬ */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="md:hidden m-4 p-2 rounded-lg bg-card border border-border/40">
            <Menu className="w-6 h-6" />
          </button>
        </SheetTrigger>

        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r border-border/40 backdrop-blur-xl">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ▬▬▬ MAIN CONTENT ▬▬▬ */}
      <main className="flex-1 min-h-screen">
        <div className="p-4 md:p-10">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
