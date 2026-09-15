export type PaymentMethod = "cash" | "card" | "transfer" | "wallet"

export interface Income {
  id: string
  amount: string
  currency: string
  date: string
  description: string | null
  category_id: string | null
  payment_method: PaymentMethod
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  amount: string
  currency: string
  date: string
  description: string | null
  category_id: string | null
  payment_method: PaymentMethod
  created_at: string
  updated_at: string
}

export interface TransactionPayload {
  amount?: string
  currency?: string
  date?: string
  description?: string | null
  category_id?: string | null
  payment_method?: PaymentMethod
}

export interface CategoryBreakdownItem {
  category_id: string | null
  category_name: string
  total: string
}

export interface MonthlyPoint {
  month: string
  income: string
  expense: string
}

export interface FinanceSummary {
  month: string
  currency: string
  total_income: string
  total_expense: string
  balance: string
  previous_month_expense: string
  expense_change_pct: number | null
  top_expense_category: CategoryBreakdownItem | null
  expense_by_category: CategoryBreakdownItem[]
  evolution: MonthlyPoint[]
}
