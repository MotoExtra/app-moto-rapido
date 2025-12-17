import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Share, MoreVertical, Plus, Download, Smartphone, CheckCircle2, Zap, Bell, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

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
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

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
      <div className="min-h-screen bg-gradient-to-b from-primary/20 to-background flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-center space-y-4"
        >
          <motion.div 
            className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">App Instalado!</h1>
          <p className="text-muted-foreground">
            O MotoExtra já está instalado no seu dispositivo.
          </p>
          <Button onClick={() => navigate("/home")} className="mt-4" size="lg">
            Ir para o App
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 py-6"
        >
          <motion.div 
            className="relative w-24 h-24 mx-auto"
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
              <img src={logo} alt="MotoExtra" className="w-16 h-16 object-contain" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-foreground">Instale o MotoExtra</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
              Adicione o app na sua tela inicial para acesso rápido e notificações de novos extras!
            </p>
          </motion.div>
        </motion.div>

        {/* Native Install Button (Android Chrome) */}
        <AnimatePresence>
          {deferredPrompt && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="border-primary bg-gradient-to-r from-primary/10 to-primary/5 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent animate-pulse" />
                <CardContent className="p-5 relative">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      onClick={handleInstallClick} 
                      className="w-full gap-3 h-14 text-lg font-semibold shadow-lg"
                      size="lg"
                    >
                      <Download className="w-6 h-6" />
                      Instalar Agora
                    </Button>
                  </motion.div>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    ⚡ Instalação rápida em um clique
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform-specific instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* iOS Instructions */}
          {isIOS && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🍎</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">iPhone / iPad</h3>
                  <p className="text-xs text-gray-300">Usando Safari</p>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <InstallStep 
                  number={1}
                  title="Toque no botão Compartilhar"
                  icon={<Share className="w-6 h-6 text-blue-500" />}
                  description="Ícone na barra inferior do Safari"
                />
                <InstallStep 
                  number={2}
                  title='Role e toque em "Adicionar à Tela de Início"'
                  icon={<Plus className="w-5 h-5 text-white" />}
                  iconBg="bg-gray-500"
                  description="Procure na lista de opções"
                />
                <InstallStep 
                  number={3}
                  title='Toque em "Adicionar"'
                  description="No canto superior direito"
                  isLast
                />
              </CardContent>
            </Card>
          )}

          {/* Android Instructions */}
          {isAndroid && !deferredPrompt && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Android</h3>
                  <p className="text-xs text-green-100">Usando Chrome</p>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <InstallStep 
                  number={1}
                  title="Toque no menu (⋮)"
                  icon={<MoreVertical className="w-6 h-6 text-foreground" />}
                  description="3 pontinhos no canto superior direito"
                />
                <InstallStep 
                  number={2}
                  title='Toque em "Adicionar à tela inicial"'
                  icon={<Download className="w-5 h-5 text-foreground" />}
                  description='Ou "Instalar app"'
                />
                <InstallStep 
                  number={3}
                  title='Confirme tocando em "Adicionar"'
                  description="A instalação começará automaticamente"
                  isLast
                />
              </CardContent>
            </Card>
          )}

          {/* Show both if not on mobile */}
          {!isIOS && !isAndroid && (
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4 flex items-center gap-3">
                  <span className="text-2xl">🍎</span>
                  <h3 className="font-semibold text-white">No iPhone/iPad (Safari)</h3>
                </div>
                <CardContent className="p-4 space-y-3">
                  <InstallStep number={1} title="Toque em Compartilhar" icon={<Share className="w-5 h-5 text-blue-500" />} />
                  <InstallStep number={2} title='"Adicionar à Tela de Início"' icon={<Plus className="w-4 h-4 text-white" />} iconBg="bg-gray-500" />
                  <InstallStep number={3} title="Confirme" isLast />
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <h3 className="font-semibold text-white">No Android (Chrome)</h3>
                </div>
                <CardContent className="p-4 space-y-3">
                  <InstallStep number={1} title="Toque no menu (⋮)" icon={<MoreVertical className="w-5 h-5" />} />
                  <InstallStep number={2} title='"Adicionar à tela inicial"' icon={<Download className="w-5 h-5" />} />
                  <InstallStep number={3} title="Confirme a instalação" isLast />
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-muted/80 to-muted/40 border-muted-foreground/10">
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Vantagens do App
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <BenefitItem icon={<Bell className="w-5 h-5" />} text="Notificações instantâneas" />
                <BenefitItem icon={<Smartphone className="w-5 h-5" />} text="Acesso rápido" />
                <BenefitItem icon={<Wifi className="w-5 h-5" />} text="Funciona offline" />
                <BenefitItem icon={<Zap className="w-5 h-5" />} text="Super rápido" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="h-6" />
      </div>
    </div>
  );
};

const InstallStep = ({ 
  number, 
  title, 
  description, 
  icon, 
  iconBg = "bg-muted",
  isLast = false 
}: { 
  number: number; 
  title: string; 
  description?: string; 
  icon?: React.ReactNode;
  iconBg?: string;
  isLast?: boolean;
}) => (
  <motion.div 
    className="flex gap-3"
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: number * 0.1 }}
  >
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md">
        {number}
      </div>
      {!isLast && <div className="w-0.5 h-full bg-border mt-1" />}
    </div>
    <div className="flex-1 pb-4">
      <p className="font-medium text-foreground">{title}</p>
      {icon && (
        <div className={`mt-2 inline-flex items-center gap-2 p-2 ${iconBg} rounded-lg`}>
          {icon}
        </div>
      )}
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  </motion.div>
);

const BenefitItem = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <motion.div 
    className="flex items-center gap-2 p-3 bg-background/60 rounded-xl"
    whileHover={{ scale: 1.02 }}
  >
    <div className="text-primary">{icon}</div>
    <span className="text-sm font-medium text-foreground">{text}</span>
  </motion.div>
);

export default Install;
