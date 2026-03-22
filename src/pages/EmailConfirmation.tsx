import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const RESEND_COOLDOWN = 60;

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const userType = searchParams.get("type") || "motoboy";
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);

    try {
      const redirectTo = userType === "restaurant"
        ? `${window.location.origin}/login/restaurante`
        : `${window.location.origin}/login/motoboy`;

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw error;

      toast({
        title: "E-mail reenviado!",
        description: "Verifique sua caixa de entrada e spam.",
      });
      setCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      toast({
        title: "Erro ao reenviar",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const loginPath = userType === "restaurant" ? "/login/restaurante" : "/login/motoboy";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto">
            <img src={logo} alt="MotoExtra" className="h-24 w-auto" />
          </div>

          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Mail className="w-10 h-10 text-primary" />
          </div>

          <CardTitle className="text-2xl">Verifique seu e-mail</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Enviamos um link de confirmação para:
          </p>
          <p className="text-center font-semibold text-foreground text-lg break-all">
            {email}
          </p>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                1
              </div>
              <p className="text-sm">Abra seu aplicativo de e-mail</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                2
              </div>
              <p className="text-sm">Clique no link de confirmação que enviamos</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                3
              </div>
              <p className="text-sm">Volte aqui e faça login normalmente</p>
            </div>
          </div>

          {/* Spam warning */}
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg p-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              Não encontrou? Verifique a pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong>.
            </p>
          </div>

          {/* Resend button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reenviando...
              </>
            ) : cooldown > 0 ? (
              `Reenviar e-mail (${cooldown}s)`
            ) : (
              "Reenviar e-mail"
            )}
          </Button>

          {/* Go to login */}
          <Button
            className="w-full"
            onClick={() => navigate(loginPath)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Já confirmei, ir para login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmation;
