import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Login = lazy(() => import("./pages/Login"));
const LoginRestaurant = lazy(() => import("./pages/LoginRestaurant"));
const SignupMotoboy = lazy(() => import("./pages/SignupMotoboy"));
const SignupRestaurant = lazy(() => import("./pages/SignupRestaurant"));
const Home = lazy(() => import("./pages/Home"));
const RestaurantHome = lazy(() => import("./pages/RestaurantHome"));
const RestaurantProfile = lazy(() => import("./pages/RestaurantProfile"));
const CreateOffer = lazy(() => import("./pages/CreateOffer"));
const EditRestaurantOffer = lazy(() => import("./pages/EditRestaurantOffer"));
const LiveMotoboy = lazy(() => import("./pages/LiveMotoboy"));
const Ranking = lazy(() => import("./pages/Ranking"));
const AcceptedOffers = lazy(() => import("./pages/AcceptedOffers"));
const Profile = lazy(() => import("./pages/Profile"));
const OfferExtra = lazy(() => import("./pages/OfferExtra"));
const EditExtra = lazy(() => import("./pages/EditExtra"));
const MyExtras = lazy(() => import("./pages/MyExtras"));
const SnackExchange = lazy(() => import("./pages/SnackExchange"));
const Gamification = lazy(() => import("./pages/Gamification"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCNHReview = lazy(() => import("./pages/AdminCNHReview"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LogoPreview = lazy(() => import("./pages/LogoPreview"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-muted-foreground text-sm">Carregando...</span>
    </div>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/meu-progresso" element={<ProtectedRoute allowedUserType="motoboy"><Gamification /></ProtectedRoute>} />
                
                {/* Rotas protegidas de restaurante */}
                <Route path="/restaurante/home" element={<ProtectedRoute allowedUserType="restaurant"><RestaurantHome /></ProtectedRoute>} />
                <Route path="/restaurante/perfil" element={<ProtectedRoute allowedUserType="restaurant"><RestaurantProfile /></ProtectedRoute>} />
                <Route path="/restaurante/criar-extra" element={<ProtectedRoute allowedUserType="restaurant"><CreateOffer /></ProtectedRoute>} />
                <Route path="/restaurante/editar-extra/:id" element={<ProtectedRoute allowedUserType="restaurant"><EditRestaurantOffer /></ProtectedRoute>} />
                <Route path="/restaurante/motoboy-ao-vivo" element={<ProtectedRoute allowedUserType="restaurant"><LiveMotoboy /></ProtectedRoute>} />
                
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/cnh" element={<AdminCNHReview />} />
                <Route path="/logo-preview" element={<LogoPreview />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
