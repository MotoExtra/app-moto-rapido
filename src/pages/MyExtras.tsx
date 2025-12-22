import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Clock, Loader2, Pencil, Trash2, Plus, Bike, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface MyOffer {
  id: string;
  restaurant_name: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  is_accepted: boolean;
  offer_date?: string;
}

const MyExtras = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [myOffers, setMyOffers] = useState<MyOffer[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login/motoboy");
        return;
      }

      setUser(user);
      await fetchMyOffers(user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate("/login/motoboy");
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchMyOffers = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("id, restaurant_name, description, address, time_start, time_end, is_accepted, offer_date")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMyOffers(data || []);
    } catch (error) {
      console.error("Erro ao buscar meus extras:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus extras.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este extra?")) return;

    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerId);

      if (error) throw error;

      setMyOffers((current) => current.filter((o) => o.id !== offerId));

      toast({
        title: "Extra excluído",
        description: "O extra foi removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir extra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o extra.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-blue-500/10 via-background to-blue-500/5 border-b shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/home")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Extras Ofertados</h1>
              </div>
            </div>
            <Button
              onClick={() => navigate("/ofertar-extra")}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo Extra
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {myOffers.length === 0 ? (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-blue-500/5">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Você ainda não criou nenhum extra</p>
                <p className="text-sm mt-1">Oferte extras para outros motoboys!</p>
                <Button
                  onClick={() => navigate("/ofertar-extra")}
                  className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Extra
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground px-1">
              {myOffers.length} extra{myOffers.length !== 1 ? 's' : ''} criado{myOffers.length !== 1 ? 's' : ''}
            </p>
            
            {myOffers.map((offer) => (
              <Card
                key={offer.id}
                className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-card via-card to-blue-500/5"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-base truncate">{offer.restaurant_name}</h4>
                        {offer.is_accepted ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs flex-shrink-0">
                            Aceito
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs flex-shrink-0">
                            Disponível
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{offer.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5" />
                          {offer.time_start} - {offer.time_end}
                        </span>
                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-lg truncate max-w-[200px]">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{offer.address}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-600"
                        onClick={() => navigate(`/editar-extra/${offer.id}`)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                        onClick={() => handleDeleteOffer(offer.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyExtras;
