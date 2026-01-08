import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, MapPin, Clock, DollarSign, Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { ES_CITIES } from "@/lib/cities";
import { formatPhone } from "@/lib/masks";
import PaymentFieldsStructured from "@/components/PaymentFieldsStructured";

// Helper to parse address into structured fields
const parseAddress = (address: string) => {
  // Try to parse format: "Rua X, 123 - Bairro, Cidade, ES, Brasil"
  const match = address.match(/^(.+?),\s*(\d+[A-Za-z]?)\s*-\s*(.+?),\s*(.+?),\s*ES/);
  if (match) {
    return { rua: match[1], numero: match[2], bairro: match[3], city: match[4] };
  }
  // Fallback: put everything in rua
  return { rua: address, numero: "", bairro: "", city: "" };
};

const EditExtra = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [formData, setFormData] = useState({
    restaurant_name: "",
    description: "",
    rua: "",
    numero: "",
    bairro: "",
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
    const fetchOffer = async () => {
      if (!id) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login/motoboy");
        return;
      }

      const { data: offer, error } = await supabase
        .from("offers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !offer) {
        toast({
          title: "Erro",
          description: "Extra não encontrado.",
          variant: "destructive",
        });
        navigate("/home");
        return;
      }

      if (offer.created_by !== user.id) {
        toast({
          title: "Acesso negado",
          description: "Você só pode editar extras que você criou.",
          variant: "destructive",
        });
        navigate("/home");
        return;
      }

      const parsedAddress = parseAddress(offer.address || "");
      setFormData({
        restaurant_name: offer.restaurant_name || "",
        description: offer.description || "",
        rua: parsedAddress.rua,
        numero: parsedAddress.numero,
        bairro: parsedAddress.bairro,
        city: offer.city || parsedAddress.city || "",
        time_start: offer.time_start || "",
        time_end: offer.time_end || "",
        radius: offer.radius || 5,
        needs_bag: offer.needs_bag || false,
        can_become_permanent: offer.can_become_permanent || false,
        includes_meal: offer.includes_meal || false,
        delivery_range: offer.delivery_range || "",
        delivery_quantity: offer.delivery_quantity || "",
        experience: offer.experience || "",
        payment: offer.payment || "",
        phone: offer.phone || "",
        observations: offer.observations || "",
      });
      setIsFetching(false);
    };

    fetchOffer();
  }, [id, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required address fields
    if (!formData.rua || !formData.numero || !formData.bairro || !formData.city || !formData.delivery_quantity) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha rua, número, bairro, cidade e quantidade de entregas.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Concatenate address for geocoding
    const fullAddress = `${formData.rua}, ${formData.numero} - ${formData.bairro}, ${formData.city}, ES, Brasil`;

    try {
      const { error } = await supabase
        .from("offers")
        .update({
          restaurant_name: formData.restaurant_name,
          description: formData.description,
          address: fullAddress,
          city: formData.city,
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
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Extra atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      navigate("/home");
    } catch (error) {
      console.error("Erro ao atualizar extra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o extra. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <img src={logo} alt="MotoExtra" className="h-10 w-auto" />
            <h1 className="text-lg font-bold text-foreground">Editar Extra</h1>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8">
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
              <Label htmlFor="rua">Rua/Logradouro *</Label>
              <Input
                id="rua"
                placeholder="Ex: Rua das Flores"
                value={formData.rua}
                onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  placeholder="Ex: 123"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  placeholder="Ex: Centro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  required
                />
              </div>
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
              Horário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <PaymentFieldsStructured
              value={formData.payment}
              onChange={(value) => setFormData({ ...formData, payment: value })}
            />

            <div className="space-y-2">
              <Label htmlFor="delivery_quantity">Quantidade de Entregas *</Label>
              <Select 
                value={formData.delivery_quantity || ""} 
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
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                required
                maxLength={15}
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
          {isLoading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </form>
    </div>
  );
};

export default EditExtra;
