import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Camera, Package, Clock, Save, Loader2, Pencil, Trash2, Plus, Bike, MapPin, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ES_CITIES } from "@/lib/cities";
import type { User } from "@supabase/supabase-js";

interface ProfileData {
  name: string;
  phone: string;
  city: string;
  experience_years: number;
  has_thermal_bag: boolean;
  cnh: string;
  vehicle_plate: string;
  avatar_url: string;
}

interface MyOffer {
  id: string;
  restaurant_name: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  is_accepted: boolean;
}


const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [myOffers, setMyOffers] = useState<MyOffer[]>([]);
  const [cityPreferences, setCityPreferences] = useState<string[]>([]);
  const [savingCities, setSavingCities] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    phone: "",
    city: "",
    experience_years: 0,
    has_thermal_bag: false,
    cnh: "",
    vehicle_plate: "",
    avatar_url: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login/motoboy");
        return;
      }

      setUser(user);
      await fetchProfile(user.id);
      await fetchMyOffers(user.id);
      await fetchCityPreferences(user.id);
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name || "",
          phone: data.phone || "",
          city: data.city || "",
          experience_years: data.experience_years || 0,
          has_thermal_bag: data.has_thermal_bag || false,
          cnh: data.cnh || "",
          vehicle_plate: data.vehicle_plate || "",
          avatar_url: data.avatar_url || "",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seu perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOffers = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("id, restaurant_name, description, address, time_start, time_end, is_accepted")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMyOffers(data || []);
    } catch (error) {
      console.error("Erro ao buscar meus extras:", error);
    }
  };

  const fetchCityPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("motoboy_city_preferences")
        .select("city")
        .eq("user_id", userId);

      if (error) throw error;

      setCityPreferences(data?.map(p => p.city) || []);
    } catch (error) {
      console.error("Erro ao buscar preferências de cidade:", error);
    }
  };

  const handleCityToggle = (city: string) => {
    setCityPreferences(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const saveCityPreferences = async () => {
    if (!user) return;
    
    setSavingCities(true);
    try {
      // Delete existing preferences
      await supabase
        .from("motoboy_city_preferences")
        .delete()
        .eq("user_id", user.id);

      // Insert new preferences
      if (cityPreferences.length > 0) {
        const { error } = await supabase
          .from("motoboy_city_preferences")
          .insert(cityPreferences.map(city => ({
            user_id: user.id,
            city
          })));

        if (error) throw error;
      }

      toast({
        title: "Preferências salvas!",
        description: cityPreferences.length > 0 
          ? `Você receberá extras de ${cityPreferences.length} cidade(s).`
          : "Você receberá extras de todas as cidades.",
      });
    } catch (error) {
      console.error("Erro ao salvar preferências:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências.",
        variant: "destructive",
      });
    } finally {
      setSavingCities(false);
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: "Sucesso",
        description: "Foto atualizada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a foto.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate required fields
    if (!profile.name.trim() || !profile.phone.trim() || !profile.city.trim()) {
      toast({
        title: "Erro",
        description: "Nome, telefone e cidade são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          city: profile.city.trim(),
          experience_years: profile.experience_years,
          has_thermal_bag: profile.has_thermal_bag,
          cnh: profile.cnh.trim(),
          vehicle_plate: profile.vehicle_plate.trim().toUpperCase(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar className="w-28 h-28 border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url} alt={profile.name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(profile.name || "M")}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Toque para alterar a foto
          </p>
        </div>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder="Sua cidade"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Veículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cnh">CNH</Label>
              <Input
                id="cnh"
                value={profile.cnh}
                onChange={(e) => setProfile({ ...profile, cnh: e.target.value })}
                placeholder="Número da CNH"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plate">Placa do veículo</Label>
              <Input
                id="plate"
                value={profile.vehicle_plate}
                onChange={(e) => setProfile({ ...profile, vehicle_plate: e.target.value })}
                placeholder="ABC-1234"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Anos de experiência</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                max="50"
                value={profile.experience_years}
                onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="thermal-bag" className="text-base">Bag térmica</Label>
                <p className="text-sm text-muted-foreground">Você possui bag térmica?</p>
              </div>
              <Switch
                id="thermal-bag"
                checked={profile.has_thermal_bag}
                onCheckedChange={(checked) => setProfile({ ...profile, has_thermal_bag: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* City Preferences */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              Cidades de Interesse
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Selecione as cidades onde você deseja receber extras. Se nenhuma for selecionada, você verá extras de todas as cidades.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {ES_CITIES.map((city) => (
                <div 
                  key={city}
                  className={`flex items-center space-x-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                    cityPreferences.includes(city) 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                  }`}
                  onClick={() => handleCityToggle(city)}
                >
                  <Checkbox 
                    id={`city-${city}`}
                    checked={cityPreferences.includes(city)}
                    onCheckedChange={() => handleCityToggle(city)}
                  />
                  <Label 
                    htmlFor={`city-${city}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {city}
                  </Label>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {cityPreferences.length === 0 
                  ? "Todas as cidades selecionadas"
                  : `${cityPreferences.length} cidade(s) selecionada(s)`}
              </p>
              <Button
                size="sm"
                onClick={saveCityPreferences}
                disabled={savingCities}
              >
                {savingCities ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Salvar cidades
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salvar alterações
            </>
          )}
        </Button>

        {/* My Extras Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-blue-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Bike className="w-4 h-4 text-blue-600" />
                </div>
                Meus Extras
              </CardTitle>
              <Button
                size="sm"
                onClick={() => navigate("/ofertar-extra")}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {myOffers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Você ainda não criou nenhum extra</p>
                <p className="text-xs mt-1">Oferte extras para outros motoboys!</p>
              </div>
            ) : (
              myOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm truncate">{offer.restaurant_name}</h4>
                        {offer.is_accepted ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                            Aceito
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">
                            Disponível
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{offer.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {offer.time_start} - {offer.time_end}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          {offer.address}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-600"
                        onClick={() => navigate(`/editar-extra/${offer.id}`)}
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                        onClick={() => handleDeleteOffer(offer.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="flex items-center justify-around p-2">
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/home")}
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs">Ofertas</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/extras-aceitos")}
          >
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-xs">Extras Aceitos</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/ranking")}
          >
            <Star className="w-5 h-5 mb-1" />
            <span className="text-xs">Ranking</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Profile;
