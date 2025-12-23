import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Bike, History, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

type EmptyStateType = 'available' | 'in_progress' | 'history' | 'all';

interface EmptyStateProps {
  type: EmptyStateType;
}

const emptyStateConfig = {
  all: {
    icon: Package,
    title: "Nenhum extra criado",
    description: "Crie seu primeiro extra para encontrar motoboys disponíveis",
    showButton: true,
    iconColor: "text-primary"
  },
  available: {
    icon: Package,
    title: "Nenhum extra disponível",
    description: "Todos os seus extras foram aceitos ou crie um novo",
    showButton: true,
    iconColor: "text-amber-500"
  },
  in_progress: {
    icon: Bike,
    title: "Nenhum extra em andamento",
    description: "Quando um motoboy aceitar seu extra, ele aparecerá aqui",
    showButton: false,
    iconColor: "text-emerald-500"
  },
  history: {
    icon: History,
    title: "Nenhum histórico",
    description: "Extras finalizados aparecerão aqui",
    showButton: false,
    iconColor: "text-muted-foreground"
  }
};

export const EmptyState = ({ type }: EmptyStateProps) => {
  const navigate = useNavigate();
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
          type === 'available' ? 'bg-amber-500/10' :
          type === 'in_progress' ? 'bg-emerald-500/10' :
          type === 'history' ? 'bg-muted' :
          'bg-primary/10'
        }`}>
          <Icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>
        <h3 className="font-semibold mb-2">{config.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {config.description}
        </p>
        {config.showButton && (
          <Button onClick={() => navigate("/restaurante/criar-extra")}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Extra
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
