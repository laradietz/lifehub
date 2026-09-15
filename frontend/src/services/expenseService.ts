import { api } from "@/services/api"
import type { Expense, TransactionPayload } from "@/types/finance"

export const expenseService = {
  async list(): Promise<Expense[]> {
    const { data } = await api.get<Expense[]>("/expenses")
    return data
  },

  async create(payload: TransactionPayload): Promise<Expense> {
    const { data } = await api.post<Expense>("/expenses", payload)
    return data
  },

  async update(id: string, payload: TransactionPayload): Promise<Expense> {
    const { data } = await api.patch<Expense>(`/expenses/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/expenses/${id}`)
  },
}
