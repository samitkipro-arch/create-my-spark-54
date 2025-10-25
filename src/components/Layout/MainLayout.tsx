import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:block md:ml-6 md:my-6">
        <div className="sticky top-6 h-[calc(100vh-3rem)] w-[260px] rounded-2xl border bg-card shadow-2xl overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Sidebar />
        </div>
      </aside>
      <aside className="md:hidden">
        <Sidebar />
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
