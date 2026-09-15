import { api } from "@/services/api"
import type {
  ShoppingItem,
  ShoppingItemPayload,
  ShoppingList,
  ShoppingListPayload,
  ShoppingSuggestion,
} from "@/types/shopping"

export const shoppingService = {
  async listLists(): Promise<ShoppingList[]> {
    const { data } = await api.get<ShoppingList[]>("/shopping/lists")
    return data
  },

  async getList(id: string): Promise<ShoppingList> {
    const { data } = await api.get<ShoppingList>(`/shopping/lists/${id}`)
    return data
  },

  async createList(payload: ShoppingListPayload): Promise<ShoppingList> {
    const { data } = await api.post<ShoppingList>("/shopping/lists", payload)
    return data
  },

  async updateList(id: string, payload: ShoppingListPayload): Promise<ShoppingList> {
    const { data } = await api.patch<ShoppingList>(`/shopping/lists/${id}`, payload)
    return data
  },

  async removeList(id: string): Promise<void> {
    await api.delete(`/shopping/lists/${id}`)
  },

  async addItem(listId: string, payload: ShoppingItemPayload): Promise<ShoppingItem> {
    const { data } = await api.post<ShoppingItem>(`/shopping/lists/${listId}/items`, payload)
    return data
  },

  async updateItem(listId: string, itemId: string, payload: ShoppingItemPayload): Promise<ShoppingItem> {
    const { data } = await api.patch<ShoppingItem>(`/shopping/lists/${listId}/items/${itemId}`, payload)
    return data
  },

  async removeItem(listId: string, itemId: string): Promise<void> {
    await api.delete(`/shopping/lists/${listId}/items/${itemId}`)
  },

  async suggestions(): Promise<ShoppingSuggestion[]> {
    const { data } = await api.get<ShoppingSuggestion[]>("/shopping/suggestions")
    return data
  },
}
