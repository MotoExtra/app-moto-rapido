import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentFieldsStructuredProps {
  value: string;
  onChange: (value: string) => void;
}

interface PaymentData {
  fixo: string;
  porEntrega: string;
}

// Parse existing payment string to structured data
const parsePaymentString = (payment: string): PaymentData => {
  const data: PaymentData = { fixo: "", porEntrega: "" };
  
  if (!payment) return data;
  
  // Try to extract "XX fixo"
  const fixoMatch = payment.match(/(\d+(?:[.,]\d+)?)\s*fixo/i);
  if (fixoMatch) {
    data.fixo = fixoMatch[1].replace(",", ".");
  }
  
  // Extract everything after "fixo + " or just the values if no fixo
  const afterFixo = payment.replace(/(\d+(?:[.,]\d+)?)\s*fixo\s*\+?\s*/i, "").trim();
  if (afterFixo) {
    data.porEntrega = afterFixo;
  }
  
  return data;
};

// Build payment string from structured data
const buildPaymentString = (data: PaymentData): string => {
  const parts: string[] = [];
  
  if (data.fixo) {
    parts.push(`R$ ${data.fixo} fixo`);
  }
  
  if (data.porEntrega) {
    // Add R$ to numbers that don't already have it
    const formattedEntrega = data.porEntrega
      .split('+')
      .map(part => {
        const trimmed = part.trim();
        // If it already has R$, keep as is; otherwise add R$ before numbers
        if (trimmed.toLowerCase().includes('r$')) {
          return trimmed;
        }
        // Extract number and format with R$
        const num = trimmed.replace(/[^0-9.,]/g, '');
        return num ? `R$ ${num}` : trimmed;
      })
      .join(' + ');
    parts.push(formattedEntrega);
  }
  
  return parts.join(" + ");
};

const PaymentFieldsStructured = ({ value, onChange }: PaymentFieldsStructuredProps) => {
  const [paymentData, setPaymentData] = useState<PaymentData>(() => parsePaymentString(value));
  const [showCustomFixo, setShowCustomFixo] = useState(false);
  const [customFixoError, setCustomFixoError] = useState("");
  
  const fixoOptions = ["80", "90", "100", "110", "120"];
  
  // Sync with external value changes
  useEffect(() => {
    const parsed = parsePaymentString(value);
    setPaymentData(parsed);
    // Check if current value is custom (not in predefined options)
    if (parsed.fixo && !fixoOptions.includes(parsed.fixo)) {
      setShowCustomFixo(true);
    }
  }, [value]);
  
  // Update parent when data changes
  const handleFixoChange = (fieldValue: string) => {
    // Only allow numbers and dots/commas
    const sanitized = fieldValue.replace(/[^0-9.,]/g, "").replace(",", ".");
    setCustomFixoError("");
    
    const newData = { ...paymentData, fixo: sanitized };
    setPaymentData(newData);
    onChange(buildPaymentString(newData));
  };

  const handleFixoButtonClick = (val: string) => {
    setShowCustomFixo(false);
    setCustomFixoError("");
    handleFixoChange(val);
  };

  const handleCustomFixoChange = (fieldValue: string) => {
    const sanitized = fieldValue.replace(/[^0-9.,]/g, "").replace(",", ".");
    const numValue = parseFloat(sanitized);
    
    if (sanitized && numValue < 80) {
      setCustomFixoError("Mínimo R$ 80");
    } else {
      setCustomFixoError("");
    }
    
    const newData = { ...paymentData, fixo: sanitized };
    setPaymentData(newData);
    onChange(buildPaymentString(newData));
  };

  const handlePorEntregaChange = (fieldValue: string) => {
    const newData = { ...paymentData, porEntrega: fieldValue };
    setPaymentData(newData);
    onChange(buildPaymentString(newData));
  };
  
  const previewString = buildPaymentString(paymentData);
  const hasAnyValue = paymentData.fixo || paymentData.porEntrega;
  const isCustomValue = showCustomFixo || (paymentData.fixo && !fixoOptions.includes(paymentData.fixo));

  return (
    <div className="space-y-4">
      {/* Valor Fixo - Botões de seleção rápida */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          💰 Valor Fixo
        </Label>
        <div className="flex flex-wrap gap-2">
          {fixoOptions.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleFixoButtonClick(val)}
              className={`
                px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200
                min-w-[72px] border-2
                ${paymentData.fixo === val && !isCustomValue
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                  : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent'
                }
              `}
            >
              R$ {val}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setShowCustomFixo(true);
              handleFixoChange("");
            }}
            className={`
              px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200
              min-w-[72px] border-2
              ${isCustomValue
                ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent'
              }
            `}
          >
            Outro
          </button>
        </div>
        
        {/* Campo de valor personalizado */}
        <AnimatePresence mode="wait">
          {isCustomValue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="80"
                  value={paymentData.fixo}
                  onChange={(e) => handleCustomFixoChange(e.target.value)}
                  className={`w-24 ${customFixoError ? 'border-destructive' : ''}`}
                />
                {customFixoError && (
                  <span className="text-xs text-destructive">{customFixoError}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <p className="text-xs text-muted-foreground">Valor fixo pago independente de entregas</p>
      </div>

      {/* Valor por Entrega - campo único */}
      <div className="space-y-2">
        <Label htmlFor="payment-entrega" className="text-sm font-medium">
          📦 Valor por Entrega
        </Label>
        <Input
          id="payment-entrega"
          type="text"
          placeholder="R$ 3 + R$ 4 + R$ 5"
          value={paymentData.porEntrega}
          onChange={(e) => handlePorEntregaChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Ex: R$ 3 + R$ 4 + R$ 5 (por distância de entregas)</p>
      </div>

      {/* Preview em tempo real */}
      <AnimatePresence mode="wait">
        {hasAnyValue && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg bg-gradient-to-r from-green-500/10 via-green-500/5 to-green-500/10 border border-green-500/20 p-3">
              <p className="text-xs text-muted-foreground mb-1">Prévia do pagamento:</p>
              <motion.p 
                key={previewString}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="font-semibold text-green-600 dark:text-green-400"
              >
                💰 {previewString || "—"}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentFieldsStructured;
