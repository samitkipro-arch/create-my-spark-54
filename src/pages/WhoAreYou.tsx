import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Recus from "./pages/Recus";
import Clients from "./pages/Clients";
import Equipe from "./pages/Equipe";
import Rapports from "./pages/Rapports";
import Parametres from "./pages/Parametres";
import CompteProfile from "./pages/parametres/CompteProfile";
import AbonnementFacturation from "./pages/parametres/AbonnementFacturation";
import AideSupport from "./pages/parametres/AideSupport";
import NotFound from "./pages/NotFound";

import WhoAreYou from "./pages/WhoAreYou";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Order: who-are-you, then auth, then the rest */}
            <Route path="/who-are-you" element={<WhoAreYou />} />
            <Route path="/auth" element={<Auth />} />

            {/* Root goes to WhoAreYou */}
            <Route path="/" element={<WhoAreYou />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recus"
              element={
                <ProtectedRoute>
                  <Recus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipe"
              element={
                <ProtectedRoute>
                  <Equipe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rapports"
              element={
                <ProtectedRoute>
                  <Rapports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parametres"
              element={
                <ProtectedRoute>
                  <Parametres />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parametres/compte"
              element={
                <ProtectedRoute>
                  <CompteProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parametres/abonnement"
              element={
                <ProtectedRoute>
                  <AbonnementFacturation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parametres/aide"
              element={
                <ProtectedRoute>
                  <AideSupport />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
