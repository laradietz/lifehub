import type { PaymentMethod } from "@/types/finance"

export type SubscriptionFrequency = "weekly" | "monthly" | "yearly"

export interface Subscription {
  id: string
  name: string
  price: string
  currency: string
  frequency: SubscriptionFrequency
  next_billing_date: string
  category_id: string | null
  payment_method: PaymentMethod
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionPayload {
  name?: string
  price?: string
  currency?: string
  frequency?: SubscriptionFrequency
  next_billing_date?: string
  category_id?: string | null
  payment_method?: PaymentMethod
  is_active?: boolean
}

export interface SubscriptionSummary {
  currency: string
  monthly_total: string
  annual_total: string
  next_billing: Subscription | null
}
