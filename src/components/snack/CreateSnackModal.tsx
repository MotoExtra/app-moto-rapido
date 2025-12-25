import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateSnackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userCity: string;
  userPhone: string;
  onSuccess: () => void;
}

export function CreateSnackModal({
  open,
  onOpenChange,
  userId,
  userCity,
  userPhone,
  onSuccess,
}: CreateSnackModalProps) {
  const [offering, setOffering] = useState("");
  const [wanting, setWanting] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!offering.trim() || !wanting.trim()) {
      toast.error("Preencha o que você tem e o que deseja");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("snack_exchanges").insert({
        user_id: userId,
        offering: offering.trim(),
        wanting: wanting.trim(),
        description: description.trim() || null,
        city: userCity,
        phone: userPhone,
      });

      if (error) throw error;

      toast.success("Oferta de troca criada!");
      setOffering("");
      setWanting("");
      setDescription("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating snack exchange:", error);
      toast.error("Erro ao criar oferta de troca");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🍔 Nova Troca de Lanche
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offering" className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-xs">🟢</span>
              O que você tem?
            </Label>
            <Input
              id="offering"
              placeholder="Ex: Açaí do Açaí Mania"
              value={offering}
              onChange={(e) => setOffering(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wanting" className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">🔵</span>
              O que você quer?
            </Label>
            <Input
              id="wanting"
              placeholder="Ex: Qualquer coisa salgada"
              value={wanting}
              onChange={(e) => setWanting(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Observações (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Detalhes adicionais..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p>📍 Cidade: <strong>{userCity}</strong></p>
            <p>📱 Contato: <strong>{userPhone}</strong></p>
            <p className="mt-1">⏰ A oferta expira automaticamente em 8 horas</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Publicar Troca
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
