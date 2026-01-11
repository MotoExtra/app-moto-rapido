import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import ProtectedRoute from "./components/ProtectedRoute";
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
import EditRestaurantOffer from "./pages/EditRestaurantOffer";
import LiveMotoboy from "./pages/LiveMotoboy";
import Ranking from "./pages/Ranking";
import AcceptedOffers from "./pages/AcceptedOffers";
import Profile from "./pages/Profile";
import OfferExtra from "./pages/OfferExtra";
import EditExtra from "./pages/EditExtra";
import MyExtras from "./pages/MyExtras";
import SnackExchange from "./pages/SnackExchange";

import AdminDashboard from "./pages/AdminDashboard";
import AdminCNHReview from "./pages/AdminCNHReview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasSeenSplash = sessionStorage.getItem('splashShown');
    
    if (isStandalone && !hasSeenSplash) {
      setShowSplash(true);
    } else {
      setIsReady(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setIsReady(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        {isReady && (
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/login/motoboy" element={<Login />} />
              <Route path="/login/restaurante" element={<LoginRestaurant />} />
              <Route path="/cadastro/motoboy" element={<SignupMotoboy />} />
              <Route path="/cadastro/restaurante" element={<SignupRestaurant />} />
              
              {/* Rotas protegidas de motoboy */}
              <Route path="/home" element={<ProtectedRoute allowedUserType="motoboy"><Home /></ProtectedRoute>} />
              <Route path="/ranking" element={<ProtectedRoute allowedUserType="motoboy"><Ranking /></ProtectedRoute>} />
              <Route path="/extras-aceitos" element={<ProtectedRoute allowedUserType="motoboy"><AcceptedOffers /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute allowedUserType="motoboy"><Profile /></ProtectedRoute>} />
              <Route path="/ofertar-extra" element={<ProtectedRoute allowedUserType="motoboy"><OfferExtra /></ProtectedRoute>} />
              <Route path="/editar-extra/:id" element={<ProtectedRoute allowedUserType="motoboy"><EditExtra /></ProtectedRoute>} />
              <Route path="/meus-extras" element={<ProtectedRoute allowedUserType="motoboy"><MyExtras /></ProtectedRoute>} />
              <Route path="/troca-lanche" element={<ProtectedRoute allowedUserType="motoboy"><SnackExchange /></ProtectedRoute>} />
              
              {/* Rotas protegidas de restaurante */}
              <Route path="/restaurante/home" element={<ProtectedRoute allowedUserType="restaurant"><RestaurantHome /></ProtectedRoute>} />
              <Route path="/restaurante/perfil" element={<ProtectedRoute allowedUserType="restaurant"><RestaurantProfile /></ProtectedRoute>} />
              <Route path="/restaurante/criar-extra" element={<ProtectedRoute allowedUserType="restaurant"><CreateOffer /></ProtectedRoute>} />
              <Route path="/restaurante/editar-extra/:id" element={<ProtectedRoute allowedUserType="restaurant"><EditRestaurantOffer /></ProtectedRoute>} />
              <Route path="/restaurante/motoboy-ao-vivo" element={<ProtectedRoute allowedUserType="restaurant"><LiveMotoboy /></ProtectedRoute>} />
              
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/cnh" element={<AdminCNHReview />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
