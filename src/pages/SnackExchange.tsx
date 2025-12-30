import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Loader2, RefreshCw } from "lucide-react";
import { SnackExchangeCard } from "@/components/snack/SnackExchangeCard";
import { CreateSnackModal } from "@/components/snack/CreateSnackModal";
import { SnackChatModal } from "@/components/snack/SnackChatModal";
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
  accepted_by?: string | null;
  accepted_at?: string | null;
  confirmed_at?: string | null;
  profiles?: {
    name: string;
  };
  accepter_profile?: {
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
  const [chatExchange, setChatExchange] = useState<SnackExchange | null>(null);

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

      // Load all available exchanges (not mine, status = available)
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

      // Load my exchanges (created by me OR I'm the accepter)
      const { data: mine, error: mineError } = await supabase
        .from('snack_exchanges')
        .select('*')
        .or(`user_id.eq.${user.id},accepted_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (mineError) throw mineError;

      // Get all user ids for profiles (owners and accepters)
      const allUserIds = new Set<string>();
      (mine || []).forEach(e => {
        if (e.user_id) allUserIds.add(e.user_id);
        if (e.accepted_by) allUserIds.add(e.accepted_by);
      });

      let allProfilesMap: Record<string, string> = {};
      if (allUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', Array.from(allUserIds));
        
        allProfilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }
      
      const myExchangesWithProfiles = (mine || []).map(e => ({
        ...e,
        profiles: { name: allProfilesMap[e.user_id] || 'Motoboy' },
        accepter_profile: e.accepted_by ? { name: allProfilesMap[e.accepted_by] || 'Interessado' } : undefined
      }));
      
      // Filter out confirmed exchanges that are older than 24 hours
      const filteredMyExchanges = myExchangesWithProfiles.filter(e => {
        if (e.status === 'confirmed' && e.confirmed_at) {
          const confirmedAt = new Date(e.confirmed_at);
          const now = new Date();
          const diffHours = (now.getTime() - confirmedAt.getTime()) / (1000 * 60 * 60);
          return diffHours < 24;
        }
        return true;
      });

      setMyExchanges(filteredMyExchanges);
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

  const handleOpenChat = (exchange: SnackExchange) => {
    setChatExchange(exchange);
  };

  const handleAcceptExchange = async (exchange: SnackExchange) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('snack_exchanges')
        .update({
          status: 'pending',
          accepted_by: userId,
          accepted_at: new Date().toISOString()
        })
        .eq('id', exchange.id)
        .eq('status', 'available');

      if (error) throw error;
      
      // Get current user name for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();
      
      // Send push notification to owner
      await supabase.functions.invoke('notify-snack-exchange', {
        body: {
          exchange_id: exchange.id,
          action: 'accepted',
          actor_name: profile?.name || 'Motoboy',
        },
      });
      
      toast.success('Proposta de troca enviada! Aguarde a confirmação.');
      loadExchanges();
    } catch (error) {
      console.error('Error accepting exchange:', error);
      toast.error('Erro ao aceitar troca');
    }
  };

  // Count pending offers that need attention
  const pendingCount = myExchanges.filter(e => 
    e.status === 'pending' && e.user_id === userId
  ).length;

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
            <TabsTrigger value="mine" className="relative">
              Minhas ({myExchanges.length})
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
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
                  onContact={() => handleOpenChat(exchange)}
                  onAccept={() => handleAcceptExchange(exchange)}
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
                  onContact={() => handleOpenChat(exchange)}
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

      {/* Chat Modal */}
      {userId && chatExchange && (
        <SnackChatModal
          open={!!chatExchange}
          onOpenChange={(open) => !open && setChatExchange(null)}
          exchange={chatExchange}
          currentUserId={userId}
          onStatusChange={loadExchanges}
        />
      )}
    </div>
  );
}
