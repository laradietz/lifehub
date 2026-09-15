export type CategoryType =
  | "task"
  | "reminder"
  | "expense"
  | "income"
  | "shopping"
  | "document"
  | "vehicle"
  | "subscription"
  | "home"

export interface Category {
  id: string
  type: CategoryType
  name: string
  color: string | null
  icon: string | null
  is_system: boolean
}
