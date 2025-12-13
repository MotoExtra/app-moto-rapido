import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPayment(payment: string | null | undefined): string {
  if (!payment) return '';
  
  // Se já tem R$ em algum lugar, retorna como está para evitar duplicação
  if (payment.includes('R$')) return payment;
  
  // Regex que encontra números (inteiros ou decimais com , ou .)
  // e adiciona "R$" antes de cada número
  return payment.replace(/(\d+(?:[.,]\d+)?)/g, 'R$ $1');
}
