import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import SignupMotoboy from "./pages/SignupMotoboy";
import SignupRestaurant from "./pages/SignupRestaurant";
import Home from "./pages/Home";
import OfferDetails from "./pages/OfferDetails";
import Ranking from "./pages/Ranking";
import AcceptedOffers from "./pages/AcceptedOffers";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro/motoboy" element={<SignupMotoboy />} />
          <Route path="/cadastro/restaurante" element={<SignupRestaurant />} />
          <Route path="/home" element={<Home />} />
          <Route path="/oferta/:id" element={<OfferDetails />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/extras-aceitos" element={<AcceptedOffers />} />
          <Route path="/perfil" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
