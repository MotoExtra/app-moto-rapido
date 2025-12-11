import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Share, MoreVertical, Plus, Download, Smartphone, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">App Instalado!</h1>
          <p className="text-muted-foreground">
            O MotoPay já está instalado no seu dispositivo.
          </p>
          <Button onClick={() => navigate("/home")} className="mt-4">
            Ir para o App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Instalar App</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-3 py-6">
          <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Instale o MotoPay</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Adicione o app na sua tela inicial para acesso rápido e receber notificações de novos extras!
          </p>
        </div>

        {/* Native Install Button (Android Chrome) */}
        {deferredPrompt && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <Button 
                onClick={handleInstallClick} 
                className="w-full gap-2"
                size="lg"
              >
                <Download className="w-5 h-5" />
                Instalar Agora
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Clique para adicionar à tela inicial
              </p>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {(isIOS || !isAndroid) && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">Safari</span>
                </div>
                <h3 className="font-semibold text-foreground">No iPhone/iPad (Safari)</h3>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Toque no botão Compartilhar</p>
                    <div className="mt-2 flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Share className="w-6 h-6 text-blue-500" />
                      <span className="text-sm text-muted-foreground">
                        O ícone de compartilhar na barra inferior do Safari
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Role e toque em "Adicionar à Tela de Início"</p>
                    <div className="mt-2 flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <div className="w-6 h-6 bg-gray-500 rounded flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Adicionar à Tela de Início
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Toque em "Adicionar"</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Confirme no canto superior direito da tela
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions */}
        {(isAndroid || !isIOS) && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">Chrome</span>
                </div>
                <h3 className="font-semibold text-foreground">No Android (Chrome)</h3>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Toque no menu (3 pontinhos)</p>
                    <div className="mt-2 flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <MoreVertical className="w-6 h-6 text-foreground" />
                      <span className="text-sm text-muted-foreground">
                        No canto superior direito do Chrome
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Toque em "Adicionar à tela inicial"</p>
                    <div className="mt-2 flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Download className="w-6 h-6 text-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Ou "Instalar app"
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Confirme a instalação</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Toque em "Adicionar" ou "Instalar"
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-3">Vantagens do App</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                Receba notificações de novos extras
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                Acesso rápido pela tela inicial
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                Funciona offline
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                Carregamento mais rápido
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Install;
