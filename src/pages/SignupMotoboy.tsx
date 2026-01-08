import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, FileCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ES_CITIES } from "@/lib/cities";
import { formatPhone } from "@/lib/masks";

const SignupMotoboy = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/home");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleCnhChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: "Envie um arquivo PDF ou imagem (JPG, PNG, WEBP)",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setCnhFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.city) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!cnhFile) {
      toast({
        title: "Erro",
        description: "Por favor, envie o documento da CNH",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Erro ao criar usuário");
      }

      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${authData.user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) {
          console.error("Erro ao fazer upload da foto:", uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      // Upload CNH document
      let cnhUrl = null;
      if (cnhFile) {
        const cnhExt = cnhFile.name.split('.').pop();
        const cnhFileName = `${authData.user.id}/cnh.${cnhExt}`;

        const { error: cnhUploadError } = await supabase.storage
          .from('cnh-documents')
          .upload(cnhFileName, cnhFile, { upsert: true });

        if (cnhUploadError) {
          console.error("Erro ao fazer upload da CNH:", cnhUploadError);
          throw new Error("Erro ao enviar documento da CNH. Tente novamente.");
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('cnh-documents')
            .getPublicUrl(cnhFileName);
          cnhUrl = publicUrl;
        }
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: formData.name,
          phone: formData.phone,
          city: formData.city,
          cnh: cnhUrl,
          avatar_url: avatarUrl,
          user_type: 'motoboy',
        });

      if (profileError) throw profileError;

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Bem-vindo ao MotoExtra",
      });
      
      navigate("/home");
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro ao criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/onboarding")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Cadastro de Motoboy</CardTitle>
            <CardDescription>
              Preencha seus dados para começar a receber oportunidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="avatar">Foto de perfil</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
                <p className="text-xs text-muted-foreground">
                  Adicione uma foto de perfil para que os restaurantes possam identificá-lo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <PasswordInput
                  id="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone/WhatsApp *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  required
                  maxLength={15}
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
                <Label htmlFor="cnh" className="flex items-center gap-2">
                  Documento da CNH *
                  {cnhFile ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <FileCheck className="w-3 h-3" />
                      Arquivo selecionado
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Obrigatório
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="cnh"
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={handleCnhChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="cnh"
                    className={`flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                      cnhFile 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' 
                        : 'border-border hover:border-primary hover:bg-accent/50'
                    }`}
                  >
                    {cnhFile ? (
                      <>
                        <FileCheck className="w-5 h-5 text-emerald-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            {cnhFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(cnhFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Clique para enviar sua CNH</p>
                          <p className="text-xs text-muted-foreground">
                            PDF ou imagem (máx. 10MB)
                          </p>
                        </div>
                      </>
                    )}
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie uma foto ou PDF da sua CNH para validação. Este documento será analisado pela nossa equipe.
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Cadastrando..." : "Concluir cadastro"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Button
                variant="link"
                className="p-0 h-auto font-semibold"
                onClick={() => navigate("/login/motoboy")}
              >
                Entre aqui
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupMotoboy;
