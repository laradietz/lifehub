export interface ShoppingItem {
  id: string
  shopping_list_id: string
  category_id: string | null
  name: string
  quantity: number
  unit: string | null
  notes: string | null
  is_purchased: boolean
  purchased_at: string | null
  created_at: string
  updated_at: string
}

export interface ShoppingItemPayload {
  name?: string
  quantity?: number
  unit?: string | null
  notes?: string | null
  category_id?: string | null
  is_purchased?: boolean
}

export interface ShoppingList {
  id: string
  user_id: string
  household_id: string | null
  name: string
  created_at: string
  updated_at: string
  items: ShoppingItem[]
}

export interface ShoppingListPayload {
  name?: string
  household_id?: string | null
}

export interface ShoppingSuggestion {
  item_name: string
  last_purchased_at: string
  avg_interval_days: number
  suggested: boolean
}
