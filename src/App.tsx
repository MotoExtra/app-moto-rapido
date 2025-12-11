import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import LoginRestaurant from "./pages/LoginRestaurant";
import SignupMotoboy from "./pages/SignupMotoboy";
import SignupRestaurant from "./pages/SignupRestaurant";
import Home from "./pages/Home";
import RestaurantHome from "./pages/RestaurantHome";
import RestaurantProfile from "./pages/RestaurantProfile";
import CreateOffer from "./pages/CreateOffer";
import OfferDetails from "./pages/OfferDetails";
import Ranking from "./pages/Ranking";
import AcceptedOffers from "./pages/AcceptedOffers";
import Profile from "./pages/Profile";
import OfferExtra from "./pages/OfferExtra";
import EditExtra from "./pages/EditExtra";
import Install from "./pages/Install";
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
          <Route path="/login/restaurante" element={<LoginRestaurant />} />
          <Route path="/cadastro/motoboy" element={<SignupMotoboy />} />
          <Route path="/cadastro/restaurante" element={<SignupRestaurant />} />
          <Route path="/home" element={<Home />} />
          <Route path="/restaurante/home" element={<RestaurantHome />} />
          <Route path="/restaurante/perfil" element={<RestaurantProfile />} />
          <Route path="/restaurante/criar-extra" element={<CreateOffer />} />
          <Route path="/oferta/:id" element={<OfferDetails />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/extras-aceitos" element={<AcceptedOffers />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/ofertar-extra" element={<OfferExtra />} />
          <Route path="/editar-extra/:id" element={<EditExtra />} />
          <Route path="/install" element={<Install />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
