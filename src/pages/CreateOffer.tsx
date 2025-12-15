import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Loader2, Package, CalendarIcon, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface Restaurant {
  id: string;
  fantasy_name: string;
  address: string;
  city: string;
  phone: string;
}

interface LastOffer {
  address: string;
  time_start: string;
  time_end: string;
  delivery_range: string;
  delivery_quantity: string | null;
  needs_bag: boolean;
  can_become_permanent: boolean;
  includes_meal: boolean;
  payment: string | null;
  observations: string | null;
}

// Helper to parse address into structured fields
const parseAddress = (address: string) => {
  // Try to parse format: "Rua X, 123 - Bairro, Cidade, ES, Brasil"
  const match = address.match(/^(.+?),\s*(\d+[A-Za-z]?)\s*-\s*(.+?),/);
  if (match) {
    return { rua: match[1], numero: match[2], bairro: match[3] };
  }
  // Fallback: put everything in rua
  return { rua: address, numero: "", bairro: "" };
};

const CreateOffer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playSuccess, playError } = useNotificationSound();
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [lastOffer, setLastOffer] = useState<LastOffer | null>(null);
  const [formData, setFormData] = useState({
    rua: "",
    numero: "",
    bairro: "",
    offerDate: new Date() as Date | undefined,
    timeStart: "",
    timeEnd: "",
    deliveryRange: "",
    deliveryQuantity: "",
    needsBag: false,
    canBecomePermanent: false,
    includesMeal: false,
    payment: "",
    observations: "",
  });

  useEffect(() => {
    const fetchRestaurantAndLastOffer = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login/restaurante");
        return;
      }

      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error || !data) {
        navigate("/login/restaurante");
        return;
      }

      setRestaurant(data);
      // Parse restaurant address into structured fields
      const parsedAddress = parseAddress(data.address || "");
      setFormData(prev => ({
        ...prev,
        rua: parsedAddress.rua,
        numero: parsedAddress.numero,
        bairro: parsedAddress.bairro,
      }));

      // Fetch last offer created by this restaurant
      const { data: lastOfferData } = await supabase
        .from("offers")
        .select("address, time_start, time_end, delivery_range, delivery_quantity, needs_bag, can_become_permanent, includes_meal, payment, observations")
        .eq("created_by", session.user.id)
        .eq("offer_type", "restaurant")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastOfferData) {
        setLastOffer(lastOfferData);
      }
    };

    fetchRestaurantAndLastOffer();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!restaurant) return;

    if (!formData.rua || !formData.numero || !formData.bairro || !formData.offerDate || !formData.timeStart || !formData.timeEnd) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios (rua, número, bairro, data e horários).",
        variant: "destructive",
      });
      return;
    }

    // Concatenate address for geocoding
    const fullAddress = `${formData.rua}, ${formData.numero} - ${formData.bairro}, ${restaurant.city}, ES, Brasil`;

    // Validate that date/time is not in the past
    const now = new Date();
    const [startHours, startMinutes] = formData.timeStart.split(':').map(Number);
    const offerStartTime = new Date(formData.offerDate);
    offerStartTime.setHours(startHours, startMinutes, 0, 0);

    if (offerStartTime <= now) {
      toast({
        title: "Data/hora inválida",
        description: "O horário de início do extra já passou. Escolha uma data ou horário futuro.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: newOffer, error } = await supabase
        .from("offers")
        .insert({
          restaurant_name: restaurant.fantasy_name,
          description: `Extra de ${restaurant.fantasy_name}`,
          address: fullAddress,
          offer_date: format(formData.offerDate!, "yyyy-MM-dd"),
          time_start: formData.timeStart,
          time_end: formData.timeEnd,
          delivery_range: formData.deliveryRange,
          delivery_quantity: formData.deliveryQuantity || null,
          needs_bag: formData.needsBag,
          can_become_permanent: formData.canBecomePermanent,
          includes_meal: formData.includesMeal,
          payment: formData.payment || null,
          observations: formData.observations || null,
          phone: restaurant.phone,
          created_by: restaurant.id,
          offer_type: "restaurant",
          city: restaurant.city,
          radius: 5,
          is_accepted: false,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao criar extra",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Notifica motoboys sobre novo extra (não bloqueia)
      supabase.functions.invoke("notify-new-offer", {
        body: {
          restaurant_name: restaurant.fantasy_name,
          description: `Extra de ${restaurant.fantasy_name}`,
          time_start: formData.timeStart,
          time_end: formData.timeEnd,
          city: restaurant.city,
        },
      }).then((result) => {
        console.log("Notificações enviadas:", result);
      }).catch((err) => {
        console.error("Erro ao enviar notificações:", err);
      });

      playSuccess();
      toast({
        title: "Extra criado!",
        description: "Seu extra está disponível para motoboys.",
      });
      navigate("/restaurante/home");
    } catch (error) {
      playError();
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/restaurante/home")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Criar Extra</h1>
            <p className="text-sm text-muted-foreground">{restaurant.fantasy_name}</p>
          </div>
        </div>

        {/* Repeat Last Offer Button */}
        {lastOffer && (
          <Card 
            className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
            onClick={() => {
              const parsedAddress = parseAddress(lastOffer.address);
              setFormData(prev => ({
                ...prev,
                rua: parsedAddress.rua,
                numero: parsedAddress.numero,
                bairro: parsedAddress.bairro,
                timeStart: lastOffer.time_start,
                timeEnd: lastOffer.time_end,
                deliveryRange: lastOffer.delivery_range,
                deliveryQuantity: lastOffer.delivery_quantity || "",
                needsBag: lastOffer.needs_bag || false,
                canBecomePermanent: lastOffer.can_become_permanent || false,
                includesMeal: lastOffer.includes_meal || false,
                payment: lastOffer.payment || "",
                observations: lastOffer.observations || "",
              }));
              toast({
                title: "Dados preenchidos!",
                description: "Ajuste a data e confira os detalhes.",
              });
            }}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Repetir último extra</p>
                <p className="text-sm text-muted-foreground truncate">
                  {lastOffer.time_start} - {lastOffer.time_end} • {lastOffer.delivery_range}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Extra</CardTitle>
            <CardDescription>
              Preencha as informações para encontrar motoboys disponíveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rua">Rua/Logradouro *</Label>
                <Input
                  id="rua"
                  value={formData.rua}
                  onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                  placeholder="Ex: Rua das Flores"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="Ex: 123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Ex: Centro"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={restaurant?.city || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Data do Extra *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.offerDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.offerDate ? (
                        format(formData.offerDate, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.offerDate}
                      onSelect={(date) => setFormData({ ...formData, offerDate: date })}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeStart">Horário Início *</Label>
                  <Input
                    id="timeStart"
                    type="time"
                    value={formData.timeStart}
                    onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeEnd">Horário Fim *</Label>
                  <Input
                    id="timeEnd"
                    type="time"
                    value={formData.timeEnd}
                    onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryRange">Raio de Entrega</Label>
                <Select 
                  value={formData.deliveryRange} 
                  onValueChange={(value) => setFormData({ ...formData, deliveryRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o raio (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Menos de 5km">Menos de 5km</SelectItem>
                    <SelectItem value="5 a 10km">5 a 10km</SelectItem>
                    <SelectItem value="Mais de 10km">Mais de 10km</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment">Forma de Pagamento</Label>
                <Input
                  id="payment"
                  value={formData.payment}
                  onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
                  placeholder="Ex: R$ 30/hora ou R$ 5/entrega"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryQuantity">Quantidade de Entregas</Label>
                <Select 
                  value={formData.deliveryQuantity} 
                  onValueChange={(value) => setFormData({ ...formData, deliveryQuantity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a quantidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Menos de 10 entregas">Menos de 10 entregas</SelectItem>
                    <SelectItem value="10 a 20 entregas">10 a 20 entregas</SelectItem>
                    <SelectItem value="Mais de 20 entregas">Mais de 20 entregas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Requisito: Bag Térmica */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span>🎒</span>
                  <span>Requisito</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="needsBag" className="text-base font-medium cursor-pointer">
                      {formData.needsBag ? "Requer bag térmica" : "Não requer bag térmica"}
                    </Label>
                    <p className={`text-sm ${formData.needsBag ? "text-amber-600" : "text-green-600"}`}>
                      {formData.needsBag ? "Motoboy precisa ter bag" : "Bag não é necessária"}
                    </p>
                  </div>
                  <Switch
                    id="needsBag"
                    checked={formData.needsBag}
                    onCheckedChange={(checked) => setFormData({ ...formData, needsBag: checked })}
                  />
                </div>
              </div>

              {/* Benefícios do Extra */}
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span>✨</span>
                  <span>Benefícios do Extra</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💼</span>
                    <div className="space-y-0.5">
                      <Label htmlFor="canBecomePermanent" className="text-sm font-medium cursor-pointer">
                        Possibilidade de fixo
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Pode virar trabalho permanente
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="canBecomePermanent"
                    checked={formData.canBecomePermanent}
                    onCheckedChange={(checked) => setFormData({ ...formData, canBecomePermanent: checked })}
                  />
                </div>

                <div className="border-t pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🍔</span>
                    <div className="space-y-0.5">
                      <Label htmlFor="includesMeal" className="text-sm font-medium cursor-pointer">
                        Direito a um lanche
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Inclui refeição no trabalho
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="includesMeal"
                    checked={formData.includesMeal}
                    onCheckedChange={(checked) => setFormData({ ...formData, includesMeal: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Informações adicionais para o motoboy"
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Publicar Extra"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateOffer;
