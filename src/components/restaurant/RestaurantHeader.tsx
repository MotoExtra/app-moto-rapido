import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  LogOut, 
  Settings, 
  MapPin, 
  Store,
  Navigation,
  Package,
  ChevronRight,
  HelpCircle,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface RestaurantHeaderProps {
  restaurantName: string;
  city: string;
  logoUrl: string | null;
  onLogout: () => void;
  hasActiveMotoboys?: boolean;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
};

export const RestaurantHeader = ({
  restaurantName,
  city,
  logoUrl,
  onLogout,
  hasActiveMotoboys = false,
}: RestaurantHeaderProps) => {
  const navigate = useNavigate();
  const greeting = getGreeting();
  const initials = restaurantName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const menuItems = [
    {
      icon: Package,
      label: "Meus Extras",
      onClick: () => navigate("/restaurante/home"),
      active: true,
    },
    {
      icon: Navigation,
      label: "Motoboy ao Vivo",
      onClick: () => navigate("/restaurante/motoboy-ao-vivo"),
      badge: hasActiveMotoboys,
    },
    {
      icon: Settings,
      label: "Configurações",
      onClick: () => navigate("/restaurante/perfil"),
    },
    {
      icon: HelpCircle,
      label: "Ajuda",
      onClick: () => {},
    },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden"
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-primary/85 backdrop-blur-xl" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl" />
      </div>

      <div className="relative z-10 px-4 pt-4 pb-8">
        {/* Top row: Logo + Settings + Logout */}
        <div className="flex items-center justify-between mb-6">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            src={logo}
            alt="MotoExtra"
            className="h-9 brightness-0 invert"
          />
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10"
              onClick={() => navigate("/restaurante/perfil")}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10"
              onClick={onLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main row: Greeting + Avatar with Sheet */}
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-primary-foreground/70 text-sm font-medium">
              {greeting} 👋
            </p>
            <h1 className="text-xl font-bold text-primary-foreground mt-0.5">
              {restaurantName}
            </h1>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-primary-foreground/60" />
              <span className="text-xs text-primary-foreground/60">{city}</span>
            </div>
          </motion.div>

          <Sheet>
            <SheetTrigger asChild>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Avatar className="w-14 h-14 ring-2 ring-white/30 ring-offset-2 ring-offset-primary shadow-lg">
                  <AvatarImage src={logoUrl || undefined} alt={restaurantName} />
                  <AvatarFallback className="bg-white/20 text-primary-foreground font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Active indicator dot */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-primary"
                />
              </motion.button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[300px]">
              <SheetHeader className="text-left pb-6 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={logoUrl || undefined} alt={restaurantName} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-base">{restaurantName}</SheetTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {city}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <div className="py-4 space-y-1">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={item.onClick}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                        item.active
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          item.active ? "bg-primary/20" : "bg-muted"
                        }`}>
                          <Icon className={`w-4 h-4 ${item.active ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <span className={`text-sm font-medium ${item.active ? "" : "text-foreground"}`}>
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da conta
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
};
