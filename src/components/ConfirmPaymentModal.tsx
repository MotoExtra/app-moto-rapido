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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, CreditCard, Banknote, Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

interface ConfirmPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acceptedOfferId: string;
  offerPayment: string | null;
  onPaymentConfirmed: () => void;
}

const paymentMethods = [
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "transferencia", label: "Transferência", icon: CreditCard },
];

const ConfirmPaymentModal = ({
  open,
  onOpenChange,
  acceptedOfferId,
  offerPayment,
  onPaymentConfirmed,
}: ConfirmPaymentModalProps) => {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [paymentAmount, setPaymentAmount] = useState(offerPayment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleSubmit = async () => {
    if (!paymentAmount.trim()) {
      toast({
        title: "Valor obrigatório",
        description: "Por favor, informe o valor recebido.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("accepted_offers")
        .update({
          payment_confirmed: true,
          payment_confirmed_at: new Date().toISOString(),
          payment_amount: paymentAmount.trim(),
          payment_method: paymentMethod,
        } as any)
        .eq("id", acceptedOfferId);

      if (error) throw error;

      setIsConfirmed(true);
      
      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#10b981", "#059669"],
      });

      setTimeout(() => {
        toast({
          title: "Pagamento confirmado! 💰",
          description: "Comprovante digital registrado com sucesso.",
        });
        onPaymentConfirmed();
        onOpenChange(false);
        setIsConfirmed(false);
        setPaymentAmount("");
        setPaymentMethod("pix");
      }, 1500);
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível confirmar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {isConfirmed ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="w-10 h-10 text-white" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold text-green-600 dark:text-green-400"
              >
                Pagamento Confirmado!
              </motion.h3>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Confirmar Pagamento
                </DialogTitle>
                <DialogDescription>
                  Confirme que você recebeu o pagamento deste extra.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6">
                {/* Payment Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor Recebido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="amount"
                      type="text"
                      placeholder="0,00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="pl-10 text-lg font-semibold"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label>Método de Pagamento</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="grid grid-cols-3 gap-3"
                  >
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.value;
                      return (
                        <motion.label
                          key={method.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/50"
                            }
                          `}
                        >
                          <RadioGroupItem value={method.value} className="sr-only" />
                          <Icon
                            className={`w-6 h-6 ${
                              isSelected ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              isSelected ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {method.label}
                          </span>
                        </motion.label>
                      );
                    })}
                  </RadioGroup>
                </div>

                {/* Info Note */}
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  💡 O restaurante receberá uma notificação de que você confirmou o pagamento.
                  Este registro serve como comprovante digital.
                </p>
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
                  disabled={isSubmitting || !paymentAmount.trim()}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar Recebimento
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmPaymentModal;
