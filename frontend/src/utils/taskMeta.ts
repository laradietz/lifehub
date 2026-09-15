import type { Priority, RecurrenceType, TaskStatus } from "@/types/task"

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
}

export const PRIORITY_TONE: Record<Priority, "slate" | "blue" | "amber" | "red"> = {
  low: "slate",
  medium: "blue",
  high: "amber",
  urgent: "red",
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
}

export const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  none: "No se repite",
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
  custom: "Personalizada",
}

export function formatDate(value: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return ""
  // Un string "YYYY-MM-DD" (sin hora, como el due_date de un recordatorio) no debe
  // interpretarse como medianoche UTC: en huso horarios negativos eso corre la fecha
  // mostrada un dia para atras. Lo forzamos a medianoche LOCAL en su lugar.
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return date.toLocaleDateString("es-AR", options ?? { day: "2-digit", month: "short", year: "numeric" })
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate).getTime() < Date.now()
}

export function daysUntil(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + (dueDate.length === 10 ? "T00:00:00" : ""))
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
