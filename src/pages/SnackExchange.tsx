import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Loader2, RefreshCw } from "lucide-react";
import { SnackExchangeCard } from "@/components/snack/SnackExchangeCard";
import { CreateSnackModal } from "@/components/snack/CreateSnackModal";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SnackExchange {
  id: string;
  user_id: string;
  offering: string;
  wanting: string;
  description?: string;
  city: string;
  phone: string;
  status: string;
  expires_at: string;
  created_at: string;
  profiles?: {
    name: string;
  };
}

export default function SnackExchange() {
  const navigate = useNavigate();
  const [exchanges, setExchanges] = useState<SnackExchange[]>([]);
  const [myExchanges, setMyExchanges] = useState<SnackExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCity, setUserCity] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadUserAndExchanges();
    
    const channel = supabase
      .channel('snack_exchanges_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'snack_exchanges' },
        () => {
          loadExchanges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUserAndExchanges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login/motoboy');
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('city, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setUserCity(profile.city);
        setUserPhone(profile.phone);
      }

      await loadExchanges();
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadExchanges = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load all available exchanges
      const { data: allExchanges, error: allError } = await supabase
        .from('snack_exchanges')
        .select('*')
        .eq('status', 'available')
        .gt('expires_at', new Date().toISOString())
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      // Get user names for exchanges
      const userIds = allExchanges?.map(e => e.user_id) || [];
      let profilesMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }

      const exchangesWithProfiles = (allExchanges || []).map(e => ({
        ...e,
        profiles: { name: profilesMap[e.user_id] || 'Motoboy' }
      }));
      setExchanges(exchangesWithProfiles);

      // Load my exchanges
      const { data: mine, error: mineError } = await supabase
        .from('snack_exchanges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (mineError) throw mineError;
      
      const myExchangesWithProfiles = (mine || []).map(e => ({
        ...e,
        profiles: { name: profilesMap[e.user_id] || 'Você' }
      }));
      setMyExchanges(myExchangesWithProfiles);
    } catch (error) {
      console.error('Error loading exchanges:', error);
      toast.error('Erro ao carregar trocas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('snack_exchanges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Oferta removida');
      loadExchanges();
    } catch (error) {
      console.error('Error deleting exchange:', error);
      toast.error('Erro ao remover oferta');
    }
  };

  const handleContact = (phone: string) => {
    toast.info(`Contato: ${phone}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/home')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                🍔 Troca de Lanche
              </h1>
              <p className="text-xs text-muted-foreground">
                Troque lanches com outros motoboys
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadExchanges}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova Troca
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="available">
              Disponíveis ({exchanges.length})
            </TabsTrigger>
            <TabsTrigger value="mine">
              Minhas ({myExchanges.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : exchanges.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🍽️</div>
                <p className="text-muted-foreground">
                  Nenhuma oferta de troca disponível
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seja o primeiro a criar uma!
                </p>
              </div>
            ) : (
              exchanges.map((exchange) => (
                <SnackExchangeCard
                  key={exchange.id}
                  exchange={exchange}
                  currentUserId={userId || undefined}
                  onContact={handleContact}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="mine" className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : myExchanges.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-muted-foreground">
                  Você não tem ofertas de troca
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Oferta
                </Button>
              </div>
            ) : (
              myExchanges.map((exchange) => (
                <SnackExchangeCard
                  key={exchange.id}
                  exchange={exchange}
                  currentUserId={userId || undefined}
                  onDelete={handleDelete}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Modal */}
      {userId && (
        <CreateSnackModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          userId={userId}
          userCity={userCity}
          userPhone={userPhone}
          onSuccess={loadExchanges}
        />
      )}
    </div>
  );
}
