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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Loader2, Package, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Restaurant {
  id: string;
  fantasy_name: string;
  address: string;
  city: string;
  phone: string;
}

const CreateOffer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    offerDate: new Date() as Date | undefined,
    timeStart: "",
    timeEnd: "",
    deliveryRange: "",
    needsBag: false,
    payment: "",
    observations: "",
  });

  useEffect(() => {
    const fetchRestaurant = async () => {
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
      setFormData(prev => ({
        ...prev,
        address: data.address,
      }));
    };

    fetchRestaurant();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!restaurant) return;

    if (!formData.address || !formData.offerDate || !formData.timeStart || !formData.timeEnd || !formData.deliveryRange) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
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
          address: formData.address,
          offer_date: format(formData.offerDate!, "yyyy-MM-dd"),
          time_start: formData.timeStart,
          time_end: formData.timeEnd,
          delivery_range: formData.deliveryRange,
          needs_bag: formData.needsBag,
          payment: formData.payment || null,
          observations: formData.observations || null,
          phone: restaurant.phone,
          created_by: restaurant.id,
          offer_type: "restaurant",
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
        },
      }).then((result) => {
        console.log("Notificações enviadas:", result);
      }).catch((err) => {
        console.error("Erro ao enviar notificações:", err);
      });

      toast({
        title: "Extra criado!",
        description: "Seu extra está disponível para motoboys.",
      });
      navigate("/restaurante/home");
    } catch (error) {
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
                <Label htmlFor="address">Endereço de Saída *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Endereço do restaurante"
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
                <Label htmlFor="deliveryRange">Raio de Entrega *</Label>
                <Select 
                  value={formData.deliveryRange} 
                  onValueChange={(value) => setFormData({ ...formData, deliveryRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o raio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Até 3km">Até 3km</SelectItem>
                    <SelectItem value="Até 5km">Até 5km</SelectItem>
                    <SelectItem value="Até 10km">Até 10km</SelectItem>
                    <SelectItem value="Até 15km">Até 15km</SelectItem>
                    <SelectItem value="Acima de 15km">Acima de 15km</SelectItem>
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="needsBag"
                  checked={formData.needsBag}
                  onCheckedChange={(checked) => setFormData({ ...formData, needsBag: checked === true })}
                />
                <Label htmlFor="needsBag" className="text-sm font-normal">
                  Requer bag térmica
                </Label>
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
