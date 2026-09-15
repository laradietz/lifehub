import { api } from "@/services/api"
import type { DashboardSummary } from "@/types/dashboard"

export const dashboardService = {
  async today(): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>("/dashboard/today")
    return data
  },
}
