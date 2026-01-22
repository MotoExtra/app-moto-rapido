import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { RefreshCw, Loader2, MapPin, Clock } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";

interface CreateRecurringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  restaurantCity: string;
  onCreated: () => void;
}

const dayOptions = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

const deliveryRanges = [
  "Até 5km",
  "Até 10km",
  "Até 15km",
  "Até 20km",
  "Centro",
  "Bairro específico",
];

const CreateRecurringModal = ({
  open,
  onOpenChange,
  restaurantId,
  restaurantCity,
  onCreated,
}: CreateRecurringModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formData, setFormData] = useState({
    description: "",
    address: "",
    timeStart: "11:00",
    timeEnd: "14:00",
    deliveryRange: "Até 5km",
    payment: "",
    includesMeal: false,
    needsBag: false,
    observations: "",
  });

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, adicione uma descrição.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.address.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o endereço.",
        variant: "destructive",
      });
      return;
    }

    if (selectedDays.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um dia da semana.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Geocode address
      const coords = await geocodeAddress(formData.address);

      const { error } = await supabase.from("recurring_offers" as any).insert({
        restaurant_id: restaurantId,
        description: formData.description.trim(),
        address: formData.address.trim(),
        city: restaurantCity,
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        time_start: formData.timeStart,
        time_end: formData.timeEnd,
        delivery_range: formData.deliveryRange,
        payment: formData.payment.trim() || null,
        includes_meal: formData.includesMeal,
        needs_bag: formData.needsBag,
        observations: formData.observations.trim() || null,
        days_of_week: selectedDays,
        is_active: true,
      } as any);

      if (error) throw error;

      toast({
        title: "Recorrência criada! ⟳",
        description: `Extras serão criados automaticamente nos dias selecionados.`,
      });

      onCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        description: "",
        address: "",
        timeStart: "11:00",
        timeEnd: "14:00",
        deliveryRange: "Até 5km",
        payment: "",
        includesMeal: false,
        needsBag: false,
        observations: "",
      });
      setSelectedDays([1, 2, 3, 4, 5]);
    } catch (error) {
      console.error("Error creating recurring offer:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a recorrência.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDaysText = selectedDays
    .map((d) => dayOptions.find((o) => o.value === d)?.short)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Criar Extra Recorrente
          </DialogTitle>
          <DialogDescription>
            Configure um extra que será criado automaticamente toda semana.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Days of week selector */}
          <div className="space-y-3">
            <Label>Dias da Semana</Label>
            <div className="flex gap-2 flex-wrap">
              {dayOptions.map((day) => {
                const isSelected = selectedDays.includes(day.value);
                return (
                  <motion.button
                    key={day.value}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleDay(day.value)}
                    className={`
                      w-11 h-11 rounded-full font-medium text-sm transition-all
                      ${isSelected
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }
                    `}
                  >
                    {day.short}
                  </motion.button>
                );
              })}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-xs text-muted-foreground">
                📅 Será criado toda: {selectedDaysText}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Extra</Label>
            <Textarea
              id="description"
              placeholder="Ex: Almoço delivery, entregas região central..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço de saída
            </Label>
            <Input
              id="address"
              placeholder="Rua, número, bairro"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeStart" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Início
              </Label>
              <Input
                id="timeStart"
                type="time"
                value={formData.timeStart}
                onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeEnd">Término</Label>
              <Input
                id="timeEnd"
                type="time"
                value={formData.timeEnd}
                onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
              />
            </div>
          </div>

          {/* Delivery Range */}
          <div className="space-y-2">
            <Label>Área de Entrega</Label>
            <Select
              value={formData.deliveryRange}
              onValueChange={(value) => setFormData({ ...formData, deliveryRange: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {deliveryRanges.map((range) => (
                  <SelectItem key={range} value={range}>
                    {range}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment */}
          <div className="space-y-2">
            <Label htmlFor="payment">Valor / Pagamento</Label>
            <Input
              id="payment"
              placeholder="Ex: R$ 80 + gorjetas"
              value={formData.payment}
              onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Refeição inclusa</Label>
                <p className="text-xs text-muted-foreground">
                  Motoboy ganha refeição durante o extra
                </p>
              </div>
              <Switch
                checked={formData.includesMeal}
                onCheckedChange={(checked) => setFormData({ ...formData, includesMeal: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Bag térmica obrigatória</Label>
                <p className="text-xs text-muted-foreground">
                  Motoboy precisa ter bag térmica
                </p>
              </div>
              <Switch
                checked={formData.needsBag}
                onCheckedChange={(checked) => setFormData({ ...formData, needsBag: checked })}
              />
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações (opcional)</Label>
            <Textarea
              id="observations"
              placeholder="Informações adicionais..."
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedDays.length === 0}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Criar Recorrência
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRecurringModal;
