import { api } from "@/services/api"
import type { Income, TransactionPayload } from "@/types/finance"

export const incomeService = {
  async list(): Promise<Income[]> {
    const { data } = await api.get<Income[]>("/incomes")
    return data
  },

  async create(payload: TransactionPayload): Promise<Income> {
    const { data } = await api.post<Income>("/incomes", payload)
    return data
  },

  async update(id: string, payload: TransactionPayload): Promise<Income> {
    const { data } = await api.patch<Income>(`/incomes/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/incomes/${id}`)
  },
}
