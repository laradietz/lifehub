import type { Priority, RecurrenceType } from "@/types/task"

export interface Reminder {
  id: string
  name: string
  description: string | null
  due_date: string
  priority: Priority
  category_id: string | null
  recurrence: RecurrenceType
  advance_notice_days: number[]
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface ReminderFormValues {
  name: string
  description: string
  due_date: string
  priority: Priority
  category_id: string
  recurrence: RecurrenceType
  advance_notice_days: number[]
}

export interface ReminderPayload {
  name?: string
  description?: string | null
  due_date?: string
  priority?: Priority
  category_id?: string | null
  recurrence?: RecurrenceType
  advance_notice_days?: number[]
  is_completed?: boolean
}
