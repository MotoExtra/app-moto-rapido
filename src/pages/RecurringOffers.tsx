import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RecurringOfferCard from "@/components/restaurant/RecurringOfferCard";
import CreateRecurringModal from "@/components/restaurant/CreateRecurringModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RecurringOffer {
  id: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  days_of_week: number[];
  is_active: boolean;
  payment: string | null;
  includes_meal: boolean;
  delivery_range: string;
}

const RecurringOffers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [offers, setOffers] = useState<RecurringOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantCity, setRestaurantCity] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchOffers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login/restaurante");
        return;
      }

      setRestaurantId(user.id);

      // Get restaurant city
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("city")
        .eq("id", user.id)
        .single();

      if (restaurant) {
        setRestaurantCity(restaurant.city);
      }

      const { data, error } = await supabase
        .from("recurring_offers" as any)
        .select("*")
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOffers((data as unknown as RecurringOffer[]) || []);
    } catch (error) {
      console.error("Error fetching recurring offers:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as recorrências.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("recurring_offers" as any)
        .update({ is_active: isActive } as any)
        .eq("id", id);

      if (error) throw error;

      setOffers(offers.map((o) => 
        o.id === id ? { ...o, is_active: isActive } : o
      ));

      toast({
        title: isActive ? "Recorrência ativada" : "Recorrência pausada",
        description: isActive 
          ? "Os extras serão criados automaticamente."
          : "Os extras não serão criados até você reativar.",
      });
    } catch (error) {
      console.error("Error toggling recurring offer:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a recorrência.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("recurring_offers" as any)
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setOffers(offers.filter((o) => o.id !== deleteId));
      setDeleteId(null);

      toast({
        title: "Recorrência excluída",
        description: "A recorrência foi removida com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting recurring offer:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a recorrência.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const activeCount = offers.filter((o) => o.is_active).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b"
      >
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/restaurante/home")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Extras Recorrentes</h1>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo
          </Button>
        </div>
      </motion.header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">
                    {offers.length} recorrências
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {activeCount} ativas
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3"
        >
          💡 Extras recorrentes são criados automaticamente toda semana nos dias configurados. 
          Você não precisa criar manualmente!
        </motion.p>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-20 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : offers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              Nenhuma recorrência criada
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Crie extras que se repetem automaticamente toda semana.
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Criar primeira recorrência
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {offers.map((offer) => (
                <RecurringOfferCard
                  key={offer.id}
                  offer={offer}
                  onToggleActive={handleToggleActive}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {restaurantId && (
        <CreateRecurringModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          restaurantId={restaurantId}
          restaurantCity={restaurantCity}
          onCreated={fetchOffers}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Novos extras não serão criados 
              automaticamente, mas os já criados permanecerão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecurringOffers;
