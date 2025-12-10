import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  LogOut, 
  Store, 
  Package, 
  Clock, 
  MapPin,
  User,
  Settings,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

interface Restaurant {
  id: string;
  fantasy_name: string;
  address: string;
  city: string;
  phone: string;
  logo_url: string | null;
}

interface Offer {
  id: string;
  restaurant_name: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  is_accepted: boolean;
  accepted_by: string | null;
  created_at: string;
}

const RestaurantHome = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login/restaurante");
        return;
      }

      // Fetch restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (restaurantError || !restaurantData) {
        await supabase.auth.signOut();
        navigate("/login/restaurante");
        return;
      }

      setRestaurant(restaurantData);

      // Fetch offers created by this restaurant
      const { data: offersData } = await supabase
        .from("offers")
        .select("*")
        .eq("created_by", session.user.id)
        .order("created_at", { ascending: false });

      if (offersData) {
        setOffers(offersData);
      }

      setLoading(false);
    };

    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/login/restaurante");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/onboarding");
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableOffers = offers.filter(o => !o.is_accepted);
  const acceptedOffers = offers.filter(o => o.is_accepted);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <img src={logo} alt="MotoPay" className="h-10" />
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/restaurante/perfil")}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{restaurant?.fantasy_name}</h1>
            <p className="text-sm text-primary-foreground/80 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {restaurant?.city}
            </p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 -mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{availableOffers.length}</p>
                <p className="text-xs text-muted-foreground">Extras Disponíveis</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{acceptedOffers.length}</p>
                <p className="text-xs text-muted-foreground">Extras Aceitos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meus Extras</h2>
          <Button onClick={() => navigate("/restaurante/criar-extra")} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Criar Extra
          </Button>
        </div>

        {offers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhum extra criado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro extra para encontrar motoboys disponíveis
              </p>
              <Button onClick={() => navigate("/restaurante/criar-extra")}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Extra
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <Card key={offer.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{offer.description}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {offer.address}
                      </p>
                    </div>
                    <Badge variant={offer.is_accepted ? "default" : "secondary"}>
                      {offer.is_accepted ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Aceito</>
                      ) : (
                        <><Clock className="w-3 h-3 mr-1" /> Disponível</>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(offer.time_start)} - {formatTime(offer.time_end)}
                    </span>
                  </div>

                  {offer.is_accepted && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-green-600">
                      <User className="w-4 h-4" />
                      Motoboy confirmado
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-lg border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around px-4 py-3 max-w-md mx-auto">
          <button className="relative flex flex-col items-center gap-1 px-4 py-1 group">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-primary">Extras</span>
          </button>
          
          <button 
            onClick={() => navigate("/restaurante/perfil")}
            className="relative flex flex-col items-center gap-1 px-4 py-1 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-colors">
              <Store className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default RestaurantHome;
