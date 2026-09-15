import { api } from "@/services/api"
import type { FinanceSummary } from "@/types/finance"

export const financeService = {
  async summary(month?: string): Promise<FinanceSummary> {
    const { data } = await api.get<FinanceSummary>("/finance/summary", { params: month ? { month } : undefined })
    return data
  },
}
