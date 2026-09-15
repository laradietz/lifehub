import type { Reminder } from "@/types/reminder"
import type { Task } from "@/types/task"

export interface DashboardSummary {
  today: {
    tasks_due_today: number
    tasks_overdue: number
    reminders_due_today: number
    pending_tasks_total: number
  }
  upcoming_reminders: Reminder[]
  week_tasks: Task[]
  finance: {
    currency: string
    income_this_month: string
    expenses_this_month: string
    balance: string
    top_expense_category: string | null
    subscriptions_monthly_total: string
  }
}
