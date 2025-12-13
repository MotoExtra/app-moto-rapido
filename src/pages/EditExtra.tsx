import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, MapPin, Clock, DollarSign, Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const EditExtra = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [formData, setFormData] = useState({
    restaurant_name: "",
    description: "",
    address: "",
    time_start: "",
    time_end: "",
    radius: 5,
    needs_bag: false,
    can_become_permanent: false,
    includes_meal: false,
    delivery_range: "",
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
        navigate("/login");
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

      setFormData({
        restaurant_name: offer.restaurant_name || "",
        description: offer.description || "",
        address: offer.address || "",
        time_start: offer.time_start || "",
        time_end: offer.time_end || "",
        radius: offer.radius || 5,
        needs_bag: offer.needs_bag || false,
        can_become_permanent: offer.can_become_permanent || false,
        includes_meal: offer.includes_meal || false,
        delivery_range: offer.delivery_range || "",
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
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("offers")
        .update(formData)
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
            <img src={logo} alt="MotoPay" className="h-10 w-auto" />
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

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva o trabalho..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              <Label htmlFor="delivery_range">Raio de Entrega *</Label>
              <Select 
                value={formData.delivery_range} 
                onValueChange={(value) => setFormData({ ...formData, delivery_range: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o raio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Menos de 10km">Menos de 10km</SelectItem>
                  <SelectItem value="De 10km a 15km">De 10km a 15km</SelectItem>
                  <SelectItem value="De 15km a 20km">De 15km a 20km</SelectItem>
                  <SelectItem value="De 20km a 30km">De 20km a 30km</SelectItem>
                  <SelectItem value="Mais de 30km">Mais de 30km</SelectItem>
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
              <Label htmlFor="delivery_range">Quantidade de Entregas *</Label>
              <Input
                id="delivery_range"
                placeholder="Ex: 15-25 entregas"
                value={formData.delivery_range}
                onChange={(e) => setFormData({ ...formData, delivery_range: e.target.value })}
                required
              />
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
            <div className="flex items-center justify-between">
              <Label htmlFor="needs_bag">Precisa de bag térmica?</Label>
              <Switch
                id="needs_bag"
                checked={formData.needs_bag}
                onCheckedChange={(checked) => setFormData({ ...formData, needs_bag: checked })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="can_become_permanent"
                checked={formData.can_become_permanent}
                onCheckedChange={(checked) => setFormData({ ...formData, can_become_permanent: checked === true })}
              />
              <Label htmlFor="can_become_permanent" className="text-sm font-normal">
                Possibilidade de ficar fixo
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includes_meal"
                checked={formData.includes_meal}
                onCheckedChange={(checked) => setFormData({ ...formData, includes_meal: checked === true })}
              />
              <Label htmlFor="includes_meal" className="text-sm font-normal">
                Direito a um lanche
              </Label>
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
          {isLoading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </form>
    </div>
  );
};

export default EditExtra;
