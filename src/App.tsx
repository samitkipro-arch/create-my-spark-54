import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Recus from "./pages/Recus";
import Clients from "./pages/Clients";
import Equipe from "./pages/Equipe";
import Rapports from "./pages/Rapports";
import Parametres from "./pages/Parametres";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recus" element={<Recus />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/rapports" element={<Rapports />} />
          <Route path="/parametres" element={<Parametres />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
