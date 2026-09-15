import type { PaymentMethod } from "@/types/finance"
import type { SubscriptionFrequency } from "@/types/subscription"

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  wallet: "Billetera virtual",
}

export const FREQUENCY_LABEL: Record<SubscriptionFrequency, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
}
