export type TaskStatus = "pending" | "in_progress" | "completed"
export type Priority = "low" | "medium" | "high" | "urgent"
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "custom"

export interface Task {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: Priority
  status: TaskStatus
  category_id: string | null
  household_id: string | null
  assigned_to_id: string | null
  recurrence: RecurrenceType
  recurrence_rule: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface TaskFormValues {
  title: string
  description: string
  due_date: string
  priority: Priority
  category_id: string
  recurrence: RecurrenceType
  tags: string
}

export interface TaskPayload {
  title?: string
  description?: string | null
  due_date?: string | null
  priority?: Priority
  status?: TaskStatus
  category_id?: string | null
  household_id?: string | null
  assigned_to_id?: string | null
  recurrence?: RecurrenceType
  tags?: string[]
}
