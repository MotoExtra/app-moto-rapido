import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { Clock, Loader2 } from "lucide-react";

const ACTIVATION_WAIT_MINUTES = 15;

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingActivation, setPendingActivation] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);

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

  const calculateRemainingTime = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const activationTime = new Date(created.getTime() + ACTIVATION_WAIT_MINUTES * 60 * 1000);
    const remainingMs = activationTime.getTime() - now.getTime();
    return Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPendingActivation(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is a motoboy (has profile) and NOT a restaurant
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, user_type, created_at, is_blocked, blocked_reason")
          .eq("id", data.user.id)
          .maybeSingle();

        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (restaurant) {
          await supabase.auth.signOut();
          toast({
            title: "Acesso negado",
            description: "Esta conta é de um restaurante. Use o login de restaurante.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (!profile) {
          await supabase.auth.signOut();
          toast({
            title: "Conta não encontrada",
            description: "Não encontramos um perfil de motoboy para esta conta.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Check if account is blocked
        if (profile.is_blocked) {
          await supabase.auth.signOut();
          toast({
            title: "Conta bloqueada",
            description: profile.blocked_reason || "Sua conta foi bloqueada. Entre em contato com o suporte.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Check if account is still in activation period (15 minutes)
        const remaining = calculateRemainingTime(profile.created_at);
        if (remaining > 0) {
          await supabase.auth.signOut();
          setRemainingMinutes(remaining);
          setPendingActivation(true);
          setLoading(false);
          return;
        }

        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta!",
        });
        navigate("/home");
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro no login",
        description: error.message === "Invalid login credentials" 
          ? "Email ou senha incorretos" 
          : "Ocorreu um erro ao fazer login. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update remaining time every minute
  useEffect(() => {
    if (!pendingActivation) return;

    const interval = setInterval(() => {
      setRemainingMinutes((prev) => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          setPendingActivation(false);
          toast({
            title: "Cadastro aprovado!",
            description: "Sua conta foi ativada. Você já pode fazer login.",
          });
          return 0;
        }
        return newValue;
      });
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [pendingActivation, toast]);

  if (pendingActivation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto">
              <img src={logo} alt="MotoExtra" className="h-32 w-auto" />
            </div>
            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">Cadastro em Análise</CardTitle>
            <CardDescription className="text-base">
              Seu cadastro está sendo analisado pela nossa equipe. 
              Isso leva aproximadamente <strong>{remainingMinutes} minuto{remainingMinutes !== 1 ? 's' : ''}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Aguarde a ativação da sua conta</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Você receberá uma notificação assim que seu cadastro for aprovado.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setPendingActivation(false)}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <img src={logo} alt="MotoExtra" className="h-32 w-auto" />
          </div>
          <CardTitle className="text-3xl">Entrar</CardTitle>
          <CardDescription>
            Entre com sua conta de motoboy para ver seus extras aceitos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          
          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Novo por aqui?
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/cadastro/motoboy")}
            >
              Criar conta de motoboy
            </Button>
            
            <button
              type="button"
              onClick={() => navigate("/login/restaurante")}
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Sou restaurante
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
