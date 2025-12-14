import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, MapPin, Clock, DollarSign, Briefcase, RotateCcw, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { ES_CITIES } from "@/lib/cities";

interface LastOffer {
  restaurant_name: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  radius: number;
  needs_bag: boolean;
  can_become_permanent: boolean;
  includes_meal: boolean;
  delivery_range: string;
  experience: string | null;
  payment: string | null;
  phone: string | null;
  observations: string | null;
}

const OfferExtra = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastOffer, setLastOffer] = useState<LastOffer | null>(null);
  
  const [formData, setFormData] = useState({
    offerDate: new Date() as Date | undefined,
    restaurant_name: "",
    description: "",
    address: "",
    city: "",
    time_start: "",
    time_end: "",
    radius: 5,
    needs_bag: false,
    can_become_permanent: false,
    includes_meal: false,
    delivery_range: "",
    delivery_quantity: "",
    experience: "",
    payment: "",
    phone: "",
    observations: "",
  });

  useEffect(() => {
    const fetchLastOffer = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("offers")
        .select("restaurant_name, description, address, time_start, time_end, radius, needs_bag, can_become_permanent, includes_meal, delivery_range, experience, payment, phone, observations")
        .eq("created_by", user.id)
        .eq("offer_type", "motoboy")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLastOffer(data);
      }
    };

    fetchLastOffer();
  }, []);

  const fillFromLastOffer = () => {
    if (!lastOffer) return;
    
    setFormData({
      offerDate: new Date(),
      restaurant_name: lastOffer.restaurant_name,
      description: lastOffer.description,
      address: lastOffer.address,
      city: "",
      time_start: lastOffer.time_start,
      time_end: lastOffer.time_end,
      radius: lastOffer.radius,
      needs_bag: lastOffer.needs_bag || false,
      can_become_permanent: lastOffer.can_become_permanent || false,
      includes_meal: lastOffer.includes_meal || false,
      delivery_range: lastOffer.delivery_range,
      delivery_quantity: "",
      experience: lastOffer.experience || "",
      payment: lastOffer.payment || "",
      phone: lastOffer.phone || "",
      observations: lastOffer.observations || "",
    });

    toast({
      title: "Dados preenchidos!",
      description: "Confira os detalhes antes de publicar.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para ofertar um extra.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const { error } = await supabase.from("offers").insert({
        restaurant_name: formData.restaurant_name,
        description: formData.description,
        address: formData.address,
        city: formData.city || null,
        time_start: formData.time_start,
        time_end: formData.time_end,
        radius: formData.radius,
        needs_bag: formData.needs_bag,
        can_become_permanent: formData.can_become_permanent,
        includes_meal: formData.includes_meal,
        delivery_range: formData.delivery_range,
        delivery_quantity: formData.delivery_quantity || null,
        experience: formData.experience || null,
        payment: formData.payment || null,
        phone: formData.phone || null,
        observations: formData.observations || null,
        created_by: user.id,
        offer_type: "motoboy",
        offer_date: formData.offerDate ? format(formData.offerDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        rating: 5.0,
        review_count: 0,
      });

      if (error) throw error;

      toast({
        title: "Extra ofertado!",
        description: "Seu extra foi publicado e outros motoboys poderão visualizá-lo.",
      });

      navigate("/home");
    } catch (error) {
      console.error("Erro ao ofertar extra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível ofertar o extra. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-b from-primary/15 via-primary/5 to-background border-b shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logo} alt="MotoPay" className="h-10 w-auto" />
            <h1 className="text-lg font-bold text-foreground">Ofertar Extra</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 pb-8">
        {/* Repeat Last Offer Button */}
        {lastOffer && (
          <Card 
            className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
            onClick={fillFromLastOffer}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Repetir último extra</p>
                <p className="text-sm text-muted-foreground truncate">
                  {lastOffer.restaurant_name} • {lastOffer.time_start} - {lastOffer.time_end}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-primary" />
              </div>
              Informações do Extra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurant_name">Nome do Estabelecimento *</Label>
              <Input
                id="restaurant_name"
                placeholder="Ex: Pizzaria do João"
                value={formData.restaurant_name}
                onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                required
              />
            </div>

          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço *</Label>
              <Input
                id="address"
                placeholder="Rua, número, bairro"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Select 
                value={formData.city} 
                onValueChange={(value) => setFormData({ ...formData, city: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cidade" />
                </SelectTrigger>
                <SelectContent>
                  {ES_CITIES.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_range">Raio de Entrega</Label>
              <Select 
                value={formData.delivery_range} 
                onValueChange={(value) => setFormData({ ...formData, delivery_range: value })}
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
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              Data e Horário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    {formData.offerDate ? format(formData.offerDate, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
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
                <Label htmlFor="time_start">Início *</Label>
                <Input
                  id="time_start"
                  type="time"
                  value={formData.time_start}
                  onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_end">Término *</Label>
                <Input
                  id="time_end"
                  type="time"
                  value={formData.time_end}
                  onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment">Valor/Forma de Pagamento *</Label>
              <Input
                id="payment"
                placeholder="Ex: R$ 80 fixo + R$ 3 por entrega"
                value={formData.payment}
                onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_quantity">Quantidade de Entregas</Label>
              <Select 
                value={formData.delivery_quantity} 
                onValueChange={(value) => setFormData({ ...formData, delivery_quantity: value })}
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
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
              Requisitos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Requisito: Bag Térmica */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span>🎒</span>
                <span>Requisito</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="needs_bag" className="text-base font-medium cursor-pointer">
                    {formData.needs_bag ? "Requer bag térmica" : "Não requer bag térmica"}
                  </Label>
                  <p className={`text-sm ${formData.needs_bag ? "text-amber-600" : "text-green-600"}`}>
                    {formData.needs_bag ? "Motoboy precisa ter bag" : "Bag não é necessária"}
                  </p>
                </div>
                <Switch
                  id="needs_bag"
                  checked={formData.needs_bag}
                  onCheckedChange={(checked) => setFormData({ ...formData, needs_bag: checked })}
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
                    <Label htmlFor="can_become_permanent" className="text-sm font-medium cursor-pointer">
                      Possibilidade de fixo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Pode virar trabalho permanente
                    </p>
                  </div>
                </div>
                <Switch
                  id="can_become_permanent"
                  checked={formData.can_become_permanent}
                  onCheckedChange={(checked) => setFormData({ ...formData, can_become_permanent: checked })}
                />
              </div>

              <div className="border-t pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🍔</span>
                  <div className="space-y-0.5">
                    <Label htmlFor="includes_meal" className="text-sm font-medium cursor-pointer">
                      Direito a um lanche
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Inclui refeição no trabalho
                    </p>
                  </div>
                </div>
                <Switch
                  id="includes_meal"
                  checked={formData.includes_meal}
                  onCheckedChange={(checked) => setFormData({ ...formData, includes_meal: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experiência necessária</Label>
              <Input
                id="experience"
                placeholder="Ex: Iniciante aceito"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone para contato *</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                placeholder="Informações adicionais..."
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
        >
          {isLoading ? "Publicando..." : "Publicar Extra"}
        </Button>
        </form>
      </div>
    </div>
  );
};

export default OfferExtra;
