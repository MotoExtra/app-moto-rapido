import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Navigation,
  User,
  RefreshCw,
  AlertCircle,
  Route,
  WifiOff,
  Signal,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateDistance } from '@/lib/distance';
import LiveMotoboyMap from '@/components/LiveMotoboyMap';

interface MotoboyLocation {
  user_id: string;
  offer_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
}

interface LocationHistoryPoint {
  lat: number;
  lng: number;
  recorded_at: string;
}

type GpsStatus = 'active' | 'inactive' | 'unknown';

interface ActiveMotoboy {
  id: string;
  offer_id: string;
  motoboy_name: string;
  motoboy_phone: string | null;
  offer_address: string;
  offer_lat: number | null;
  offer_lng: number | null;
  offer_description: string;
  time_start: string;
  time_end: string;
  location: MotoboyLocation | null;
  accepted_at: string;
  routeHistory: LocationHistoryPoint[];
}

// Check if GPS is active based on last update time (inactive if > 2 minutes)
const getGpsStatus = (location: MotoboyLocation | null): GpsStatus => {
  if (!location) return 'unknown';
  
  const now = new Date();
  const lastUpdate = new Date(location.updated_at);
  const diffMs = now.getTime() - lastUpdate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  return diffMins <= 2 ? 'active' : 'inactive';
};

const LiveMotoboy = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeMotoboys, setActiveMotoboys] = useState<ActiveMotoboy[]>([]);
  const [selectedMotoboy, setSelectedMotoboy] = useState<ActiveMotoboy | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showRouteHistory, setShowRouteHistory] = useState(true);

  // Fetch active motoboys (status = in_progress)
  useEffect(() => {
    const fetchActiveMotoboys = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login/restaurante');
          return;
        }

        setRestaurantId(user.id);

        // Get offers created by this restaurant that are in_progress
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('id, description, address, lat, lng, time_start, time_end, accepted_by')
          .eq('created_by', user.id)
          .eq('is_accepted', true);

        if (offersError) throw offersError;

        if (!offersData || offersData.length === 0) {
          setLoading(false);
          return;
        }

        // Get accepted_offers with status = in_progress
        const offerIds = offersData.map(o => o.id);
        const { data: acceptedData, error: acceptedError } = await supabase
          .from('accepted_offers')
          .select('offer_id, user_id, status, accepted_at')
          .in('offer_id', offerIds)
          .eq('status', 'in_progress');

        if (acceptedError) throw acceptedError;

        if (!acceptedData || acceptedData.length === 0) {
          setLoading(false);
          return;
        }

        // Get motoboy profiles
        const motoboyIds = acceptedData.map(a => a.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, phone')
          .in('id', motoboyIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        // Get motoboy locations
        const { data: locationsData } = await supabase
          .from('motoboy_locations')
          .select('*')
          .in('offer_id', offerIds);

        const locationsMap = new Map(locationsData?.map(l => [l.offer_id, l]) || []);

        // Get route history for all offers
        const { data: historyData } = await supabase
          .from('motoboy_location_history')
          .select('offer_id, lat, lng, recorded_at')
          .in('offer_id', offerIds)
          .order('recorded_at', { ascending: true });

        // Group history by offer_id
        const historyByOffer = new Map<string, LocationHistoryPoint[]>();
        historyData?.forEach(h => {
          const current = historyByOffer.get(h.offer_id) || [];
          current.push({ lat: h.lat, lng: h.lng, recorded_at: h.recorded_at });
          historyByOffer.set(h.offer_id, current);
        });

        // Build active motoboys list
        const motoboys: ActiveMotoboy[] = acceptedData.map(accepted => {
          const offer = offersData.find(o => o.id === accepted.offer_id)!;
          const profile = profilesMap.get(accepted.user_id);
          const location = locationsMap.get(accepted.offer_id);
          const routeHistory = historyByOffer.get(accepted.offer_id) || [];

          return {
            id: accepted.user_id,
            offer_id: accepted.offer_id,
            motoboy_name: profile?.name || 'Motoboy',
            motoboy_phone: profile?.phone || null,
            offer_address: offer.address,
            offer_lat: offer.lat,
            offer_lng: offer.lng,
            offer_description: offer.description,
            time_start: offer.time_start,
            time_end: offer.time_end,
            location: location || null,
            accepted_at: accepted.accepted_at,
            routeHistory,
          };
        });

        setActiveMotoboys(motoboys);
        if (motoboys.length > 0) {
          setSelectedMotoboy(motoboys[0]);
        }
      } catch (error) {
        console.error('Error fetching active motoboys:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os motoboys ativos.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchActiveMotoboys();

    // Set up realtime listener for location updates
    const locationChannel = supabase
      .channel('live-motoboy-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motoboy_locations',
        },
        (payload) => {
          const newLocation = payload.new as MotoboyLocation;
          
          setActiveMotoboys(current =>
            current.map(m =>
              m.offer_id === newLocation.offer_id
                ? { ...m, location: newLocation }
                : m
            )
          );

          // Update selected motoboy if it's the same
          setSelectedMotoboy(current =>
            current && current.offer_id === newLocation.offer_id
              ? { ...current, location: newLocation }
              : current
          );
        }
      )
      .subscribe();

    // Set up realtime listener for history updates
    const historyChannel = supabase
      .channel('live-motoboy-history')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'motoboy_location_history',
        },
        (payload) => {
          const newHistoryPoint = payload.new as { offer_id: string; lat: number; lng: number; recorded_at: string };
          
          setActiveMotoboys(current =>
            current.map(m =>
              m.offer_id === newHistoryPoint.offer_id
                ? {
                    ...m,
                    routeHistory: [
                      ...m.routeHistory,
                      { lat: newHistoryPoint.lat, lng: newHistoryPoint.lng, recorded_at: newHistoryPoint.recorded_at }
                    ]
                  }
                : m
            )
          );

          // Update selected motoboy if it's the same
          setSelectedMotoboy(current =>
            current && current.offer_id === newHistoryPoint.offer_id
              ? {
                  ...current,
                  routeHistory: [
                    ...current.routeHistory,
                    { lat: newHistoryPoint.lat, lng: newHistoryPoint.lng, recorded_at: newHistoryPoint.recorded_at }
                  ]
                }
              : current
          );
        }
      )
      .subscribe();

    // Set up realtime listener for accepted_offers status changes
    const statusChannel = supabase
      .channel('live-motoboy-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'accepted_offers',
        },
        (payload) => {
          const updated = payload.new as { offer_id: string; status: string };
          
          // If status is no longer 'in_progress', remove from list
          if (updated.status !== 'in_progress') {
            setActiveMotoboys(current => {
              const filtered = current.filter(m => m.offer_id !== updated.offer_id);
              
              // Update selected motoboy if needed
              setSelectedMotoboy(selected => {
                if (selected?.offer_id === updated.offer_id) {
                  return filtered.length > 0 ? filtered[0] : null;
                }
                return selected;
              });
              
              return filtered;
            });
            
            toast({
              title: 'Serviço finalizado',
              description: 'O motoboy finalizou o serviço e foi removido do rastreamento.',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(historyChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [navigate, toast]);

  const formatTime = (time: string) => time.slice(0, 5);

  const getTimeSinceCheckin = (acceptedAt: string) => {
    const now = new Date();
    const checkin = new Date(acceptedAt);
    const diffMs = now.getTime() - checkin.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}min`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

  const getLastUpdateTime = (updatedAt: string | undefined) => {
    if (!updatedAt) return 'Sem dados';
    
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) {
      return `há ${diffSecs}s`;
    }
    const mins = Math.floor(diffSecs / 60);
    return `há ${mins}min`;
  };

  const getDistance = useMemo(() => {
    if (!selectedMotoboy?.location || !selectedMotoboy.offer_lat || !selectedMotoboy.offer_lng) {
      return null;
    }
    return calculateDistance(
      selectedMotoboy.location.lat,
      selectedMotoboy.location.lng,
      selectedMotoboy.offer_lat,
      selectedMotoboy.offer_lng
    );
  }, [selectedMotoboy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando rastreamento...</p>
        </div>
      </div>
    );
  }

  if (activeMotoboys.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="p-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/restaurante/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Motoboy ao Vivo</h1>
          </div>
        </header>

        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Navigation className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Nenhum motoboy ativo</h2>
          <p className="text-muted-foreground text-center mb-4">
            Quando um motoboy apertar "CHEGUEI", você poderá acompanhá-lo em tempo real aqui.
          </p>
          <Button onClick={() => navigate('/restaurante/home')}>
            Voltar para Extras
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/restaurante/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              Motoboy ao Vivo
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeMotoboys.length} motoboy{activeMotoboys.length > 1 ? 's' : ''} em atividade
            </p>
          </div>
          
          {/* Route History Toggle */}
          <div className="flex items-center gap-2">
            <Route className={`w-4 h-4 ${showRouteHistory ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <Switch
              id="show-route"
              checked={showRouteHistory}
              onCheckedChange={setShowRouteHistory}
            />
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative min-h-[300px]">
        {selectedMotoboy && selectedMotoboy.offer_lat && selectedMotoboy.offer_lng ? (
          <LiveMotoboyMap
            motoboyLat={selectedMotoboy.location?.lat || selectedMotoboy.offer_lat}
            motoboyLng={selectedMotoboy.location?.lng || selectedMotoboy.offer_lng}
            restaurantLat={selectedMotoboy.offer_lat}
            restaurantLng={selectedMotoboy.offer_lng}
            motoboyName={selectedMotoboy.motoboy_name}
            restaurantName={selectedMotoboy.offer_description}
            routeHistory={selectedMotoboy.routeHistory}
            showRouteHistory={showRouteHistory}
            hasMotoboyLocation={!!selectedMotoboy.location}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <div className="text-center p-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Sem coordenadas do local do extra
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O extra não possui localização cadastrada
              </p>
            </div>
          </div>
        )}

        {/* Floating Card with Motoboy Info */}
        {selectedMotoboy && (
          <Card className="absolute bottom-4 left-4 right-4 shadow-2xl border-0 bg-background/95 backdrop-blur-sm">
            <CardContent className="p-4">
              {/* GPS Status Alert */}
              {(() => {
                const gpsStatus = getGpsStatus(selectedMotoboy.location);
                if (gpsStatus === 'inactive') {
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <WifiOff className="w-4 h-4 text-amber-500" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">GPS desativado</p>
                        <p className="text-[10px] text-amber-500/80">Última posição há mais de 2 minutos</p>
                      </div>
                    </div>
                  );
                }
                if (gpsStatus === 'unknown') {
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-muted/50 border border-border/50">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Sem dados de GPS</p>
                        <p className="text-[10px] text-muted-foreground/80">Aguardando motoboy ativar localização</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="flex items-start gap-3">
                {/* Motoboy Avatar */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                  getGpsStatus(selectedMotoboy.location) === 'active'
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                    : getGpsStatus(selectedMotoboy.location) === 'inactive'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                      : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}>
                  <User className="w-7 h-7 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg truncate">{selectedMotoboy.motoboy_name}</h3>
                    {getGpsStatus(selectedMotoboy.location) === 'active' ? (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        <Signal className="w-3 h-3 mr-1" />
                        GPS ativo
                      </Badge>
                    ) : getGpsStatus(selectedMotoboy.location) === 'inactive' ? (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                        <WifiOff className="w-3 h-3 mr-1" />
                        GPS inativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground border-muted">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Sem GPS
                      </Badge>
                    )}
                  </div>

                  {/* Extra info */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{selectedMotoboy.offer_description}</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Tempo</p>
                      <p className="text-sm font-bold text-foreground">
                        {getTimeSinceCheckin(selectedMotoboy.accepted_at)}
                      </p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Distância</p>
                      <p className="text-sm font-bold text-foreground">
                        {getDistance !== null ? `${getDistance.toFixed(1)} km` : '-'}
                      </p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Atualizado</p>
                      <p className="text-sm font-bold text-foreground">
                        {getLastUpdateTime(selectedMotoboy.location?.updated_at)}
                      </p>
                    </div>
                  </div>


                  {/* Horário */}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      Horário: {formatTime(selectedMotoboy.time_start)} - {formatTime(selectedMotoboy.time_end)}
                    </span>
                  </div>
                </div>

                {/* Call Button */}
                {selectedMotoboy.motoboy_phone && (
                  <Button
                    size="icon"
                    className="shrink-0 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => window.open(`tel:${selectedMotoboy.motoboy_phone}`, '_self')}
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Motoboy Selector (if multiple) */}
        {activeMotoboys.length > 1 && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {activeMotoboys.map((motoboy) => {
              const gpsStatus = getGpsStatus(motoboy.location);
              return (
                <Button
                  key={motoboy.offer_id}
                  size="sm"
                  variant={selectedMotoboy?.offer_id === motoboy.offer_id ? 'default' : 'outline'}
                  className={`shadow-lg gap-2 ${
                    gpsStatus === 'inactive' ? 'border-amber-500/50' : ''
                  }`}
                  onClick={() => setSelectedMotoboy(motoboy)}
                >
                  <div className="relative">
                    <User className="w-4 h-4" />
                    <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${
                      gpsStatus === 'active' ? 'bg-emerald-500' :
                      gpsStatus === 'inactive' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  {motoboy.motoboy_name.split(' ')[0]}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMotoboy;
