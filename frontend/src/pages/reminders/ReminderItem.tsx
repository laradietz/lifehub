import { Check, Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/Badge"
import type { Category } from "@/types/category"
import type { Reminder } from "@/types/reminder"
import { daysUntil, formatDate, PRIORITY_LABEL, PRIORITY_TONE } from "@/utils/taskMeta"

interface ReminderItemProps {
  reminder: Reminder
  categories: Category[]
  onToggleComplete: (reminder: Reminder) => void
  onEdit: (reminder: Reminder) => void
  onDelete: (reminder: Reminder) => void
}

function dueLabel(dueDate: string): { text: string; tone: "red" | "amber" | "slate" } {
  const days = daysUntil(dueDate)
  if (days < 0) return { text: `Venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`, tone: "red" }
  if (days === 0) return { text: "Vence hoy", tone: "red" }
  if (days <= 7) return { text: `Vence en ${days} día${days === 1 ? "" : "s"}`, tone: "amber" }
  return { text: `Vence el ${formatDate(dueDate)}`, tone: "slate" }
}

export function ReminderItem({ reminder, categories, onToggleComplete, onEdit, onDelete }: ReminderItemProps) {
  const category = categories.find((item) => item.id === reminder.category_id)
  const due = dueLabel(reminder.due_date)

  return (
    <li className="flex items-start gap-3 rounded-lg border-b border-slate-100 px-2 py-3 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
      <button
        type="button"
        role="checkbox"
        aria-checked={reminder.is_completed}
        aria-label={reminder.is_completed ? "Marcar como pendiente" : "Marcar como resuelto"}
        onClick={() => onToggleComplete(reminder)}
        className="focus-ring mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-white transition-colors data-[checked=true]:border-brand-600 data-[checked=true]:bg-brand-600 dark:border-slate-600"
        data-checked={reminder.is_completed}
      >
        {reminder.is_completed && <Check className="size-3" aria-hidden="true" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-sm font-medium ${reminder.is_completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}
          >
            {reminder.name}
          </p>
          <Badge tone={PRIORITY_TONE[reminder.priority]}>{PRIORITY_LABEL[reminder.priority]}</Badge>
          {category && <Badge tone="slate">{category.name}</Badge>}
        </div>
        {reminder.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{reminder.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          {!reminder.is_completed && (
            <span className={due.tone === "red" ? "font-medium text-red-600 dark:text-red-400" : due.tone === "amber" ? "font-medium text-amber-600 dark:text-amber-400" : ""}>
              {due.text}
            </span>
          )}
          {reminder.advance_notice_days.length > 0 && !reminder.is_completed && (
            <span>Avisar: {reminder.advance_notice_days.join(", ")} días antes</span>
          )}
          <button
            type="button"
            onClick={() => onEdit(reminder)}
            className="focus-ring flex items-center gap-1 font-medium hover:text-slate-600 dark:hover:text-slate-300"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(reminder)}
            className="focus-ring flex items-center gap-1 font-medium hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Eliminar
          </button>
        </div>
      </div>
    </li>
  )
}
