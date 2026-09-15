import { api } from "@/services/api"
import type { Category, CategoryType } from "@/types/category"

export const categoryService = {
  async list(type: CategoryType): Promise<Category[]> {
    const { data } = await api.get<Category[]>("/categories", { params: { type } })
    return data
  },

  async create(payload: { type: CategoryType; name: string; color?: string }): Promise<Category> {
    const { data } = await api.post<Category>("/categories", payload)
    return data
  },
}
