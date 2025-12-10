import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bike, Store } from "lucide-react";
import logo from "@/assets/logo.png";

const Onboarding = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<"motoboy" | "restaurant" | null>(null);

  const handleSelectType = (type: "motoboy" | "restaurant") => {
    setUserType(type);
    if (type === "motoboy") {
      navigate("/login");
    } else {
      navigate("/login/restaurante");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
            <img src={logo} alt="MotoPay" className="relative h-40 w-auto mx-auto drop-shadow-lg" />
          </div>
          <p className="text-muted-foreground text-lg">Conectando motoboys a oportunidades</p>
        </div>

        <div className="space-y-4">
          <Card 
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
            onClick={() => handleSelectType("motoboy")}
          >
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Bike className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <CardTitle>Sou Motoboy</CardTitle>
                  <CardDescription>Encontre oportunidades de extras</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
            onClick={() => handleSelectType("restaurant")}
          >
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-accent/10 rounded-full">
                  <Store className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <CardTitle>Sou Restaurante</CardTitle>
                  <CardDescription>Publique extras para motoboys</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Ao continuar, você concorda com nossos{" "}
          <a href="/termos" className="text-primary underline">
            Termos de Uso
          </a>{" "}
          e{" "}
          <a href="/privacidade" className="text-primary underline">
            Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
