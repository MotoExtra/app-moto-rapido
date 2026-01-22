import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bike, Store, ChevronRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } 
  }
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<"motoboy" | "restaurant" | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (restaurant) {
          navigate("/restaurante/home");
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, user_type")
            .eq("id", session.user.id)
            .maybeSingle();
          
          if (profile && profile.user_type === "motoboy") {
            navigate("/home");
          }
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleSelectType = (type: "motoboy" | "restaurant") => {
    setUserType(type);
    if (type === "motoboy") {
      navigate("/login/motoboy");
    } else {
      navigate("/login/restaurante");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      
      <motion.div 
        className="w-full max-w-md space-y-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo Section */}
        <motion.div variants={itemVariants} className="text-center space-y-4">
          <motion.div 
            className="relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
            <img src={logo} alt="MotoExtra" className="relative h-48 w-auto mx-auto drop-shadow-lg" />
          </motion.div>
          <p className="text-muted-foreground text-lg font-medium">
            Conectando motoboys a oportunidades
          </p>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0 px-3 py-1">
            <Users className="w-3 h-3 mr-1.5" />
            +5.000 entregas realizadas
          </Badge>
        </motion.div>

        {/* Cards Section */}
        <div className="space-y-4">
          <motion.div variants={itemVariants}>
            <Card 
              className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] border-primary/10 bg-card/95 group"
              onClick={() => handleSelectType("motoboy")}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/20">
                      <Bike className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Sou Motoboy</CardTitle>
                      <CardDescription className="text-sm">
                        Encontre oportunidades de extras
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card 
              className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:scale-[1.02] border-accent/10 bg-card/95 group"
              onClick={() => handleSelectType("restaurant")}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-accent to-accent/80 rounded-xl shadow-lg shadow-accent/20">
                      <Store className="w-7 h-7 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Sou Restaurante</CardTitle>
                      <CardDescription className="text-sm">
                        Publique extras para motoboys
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
            </Card>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p variants={itemVariants} className="text-xs text-center text-muted-foreground">
          Ao continuar, você concorda com nossos{" "}
          <a href="/termos" className="text-primary underline hover:text-primary/80 transition-colors">
            Termos de Uso
          </a>{" "}
          e{" "}
          <a href="/privacidade" className="text-primary underline hover:text-primary/80 transition-colors">
            Política de Privacidade
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Onboarding;
