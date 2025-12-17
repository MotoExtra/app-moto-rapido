import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const LoginRestaurant = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is a restaurant
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (restaurant) {
          navigate("/restaurante/home");
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message === "Invalid login credentials" 
            ? "Email ou senha incorretos" 
            : error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check if user is a restaurant
        const { data: restaurant, error: restaurantError } = await supabase
          .from("restaurants")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (restaurantError || !restaurant) {
          await supabase.auth.signOut();
          toast({
            title: "Acesso negado",
            description: "Esta conta não é de um restaurante. Use o login de motoboy.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta!",
        });
        navigate("/restaurante/home");
      }
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/onboarding")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="MotoPay" className="h-20 mb-4" />
          <div className="flex items-center gap-2 text-primary">
            <Store className="w-6 h-6" />
            <span className="text-lg font-semibold">Área do Restaurante</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Entre com sua conta de restaurante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@restaurante.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/cadastro/restaurante")}
                  className="text-primary hover:underline font-medium"
                >
                  Cadastre-se
                </button>
              </p>
              
              <button
                type="button"
                onClick={() => navigate("/login/motoboy")}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
              >
                Sou motoboy
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginRestaurant;
