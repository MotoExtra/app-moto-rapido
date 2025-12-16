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
  ate10: string;
  de11a20: string;
  acima20: string;
}

// Parse existing payment string to structured data
const parsePaymentString = (payment: string): PaymentData => {
  const data: PaymentData = { fixo: "", ate10: "", de11a20: "", acima20: "" };
  
  if (!payment) return data;
  
  // Try to extract "XX fixo"
  const fixoMatch = payment.match(/(\d+(?:[.,]\d+)?)\s*fixo/i);
  if (fixoMatch) {
    data.fixo = fixoMatch[1].replace(",", ".");
  }
  
  // Try to extract values after "+" signs (R$ XX)
  const valuesMatch = payment.match(/\+\s*R?\$?\s*(\d+(?:[.,]\d+)?)/gi);
  if (valuesMatch) {
    valuesMatch.forEach((match, index) => {
      const valueMatch = match.match(/(\d+(?:[.,]\d+)?)/);
      if (valueMatch) {
        const val = valueMatch[1].replace(",", ".");
        if (index === 0) data.ate10 = val;
        else if (index === 1) data.de11a20 = val;
        else if (index === 2) data.acima20 = val;
      }
    });
  }
  
  return data;
};

// Build payment string from structured data
const buildPaymentString = (data: PaymentData): string => {
  const parts: string[] = [];
  
  if (data.fixo) {
    parts.push(`${data.fixo} fixo`);
  }
  
  if (data.ate10) {
    parts.push(`R$ ${data.ate10}`);
  }
  
  if (data.de11a20) {
    parts.push(`R$ ${data.de11a20}`);
  }
  
  if (data.acima20) {
    parts.push(`R$ ${data.acima20}`);
  }
  
  return parts.join(" + ");
};

const PaymentFieldsStructured = ({ value, onChange }: PaymentFieldsStructuredProps) => {
  const [paymentData, setPaymentData] = useState<PaymentData>(() => parsePaymentString(value));
  
  // Sync with external value on mount
  useEffect(() => {
    const parsed = parsePaymentString(value);
    setPaymentData(parsed);
  }, []);
  
  // Update parent when data changes
  const handleFieldChange = (field: keyof PaymentData, fieldValue: string) => {
    // Only allow numbers and dots/commas
    const sanitized = fieldValue.replace(/[^0-9.,]/g, "").replace(",", ".");
    
    const newData = { ...paymentData, [field]: sanitized };
    setPaymentData(newData);
    onChange(buildPaymentString(newData));
  };
  
  const previewString = buildPaymentString(paymentData);
  const hasAnyValue = paymentData.fixo || paymentData.ate10 || paymentData.de11a20 || paymentData.acima20;

  return (
    <div className="space-y-4">
      {/* Valor Fixo */}
      <div className="space-y-2">
        <Label htmlFor="payment-fixo" className="text-sm font-medium">
          💰 Valor Fixo (R$)
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
          <Input
            id="payment-fixo"
            type="text"
            inputMode="decimal"
            placeholder="80"
            value={paymentData.fixo}
            onChange={(e) => handleFieldChange("fixo", e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground">Valor fixo pago independente de entregas</p>
      </div>

      {/* Valores por faixa */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">📦 Valor por Entrega (por faixa)</Label>
        
        <div className="grid grid-cols-3 gap-3">
          {/* 1-10 entregas */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-ate10" className="text-xs text-muted-foreground">
              1-10 entregas
            </Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
              <Input
                id="payment-ate10"
                type="text"
                inputMode="decimal"
                placeholder="3"
                value={paymentData.ate10}
                onChange={(e) => handleFieldChange("ate10", e.target.value)}
                className="pl-8 text-sm h-9"
              />
            </div>
          </div>

          {/* 11-20 entregas */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-de11a20" className="text-xs text-muted-foreground">
              11-20 entregas
            </Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
              <Input
                id="payment-de11a20"
                type="text"
                inputMode="decimal"
                placeholder="4"
                value={paymentData.de11a20}
                onChange={(e) => handleFieldChange("de11a20", e.target.value)}
                className="pl-8 text-sm h-9"
              />
            </div>
          </div>

          {/* 21+ entregas */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-acima20" className="text-xs text-muted-foreground">
              21+ entregas
            </Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
              <Input
                id="payment-acima20"
                type="text"
                inputMode="decimal"
                placeholder="5"
                value={paymentData.acima20}
                onChange={(e) => handleFieldChange("acima20", e.target.value)}
                className="pl-8 text-sm h-9"
              />
            </div>
          </div>
        </div>
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
