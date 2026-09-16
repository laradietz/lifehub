import { Check, Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/Badge"
import type { Category } from "@/types/category"
import type { Household } from "@/types/household"
import type { Task } from "@/types/task"
import { formatDate, isOverdue, PRIORITY_LABEL, PRIORITY_TONE } from "@/utils/taskMeta"

interface TaskItemProps {
  task: Task
  categories: Category[]
  households: Household[]
  onToggleComplete: (task: Task) => void
  onSetInProgress: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskItem({ task, categories, households, onToggleComplete, onSetInProgress, onEdit, onDelete }: TaskItemProps) {
  const category = categories.find((item) => item.id === task.category_id)
  const household = households.find((item) => item.id === task.household_id)
  const assignee = household?.members.find((member) => member.user_id === task.assigned_to_id)
  const overdue = task.status !== "completed" && isOverdue(task.due_date)
  const completed = task.status === "completed"

  return (
    <li className="group flex items-start gap-3 rounded-lg border-b border-slate-100 px-2 py-3 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={completed ? "Marcar como pendiente" : "Marcar como completada"}
        onClick={() => onToggleComplete(task)}
        className="focus-ring mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-white transition-all data-[checked=true]:scale-100 data-[checked=true]:border-brand-600 data-[checked=true]:bg-brand-600 dark:border-slate-600"
        data-checked={completed}
      >
        {completed && <Check className="size-3" aria-hidden="true" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-medium ${completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
            {task.title}
          </p>
          <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
          {task.status === "in_progress" && <Badge tone="blue">En progreso</Badge>}
          {category && <Badge tone="slate">{category.name}</Badge>}
          {household && <Badge tone="violet">{household.name}</Badge>}
          {assignee && <Badge tone="slate">→ {assignee.full_name ?? assignee.email}</Badge>}
        </div>
        {task.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{task.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          {task.due_date && (
            <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
              {overdue ? "Venció el " : ""}
              {formatDate(task.due_date)}
            </span>
          )}
          {task.status === "pending" && (
            <button type="button" onClick={() => onSetInProgress(task)} className="focus-ring font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Marcar en progreso
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="focus-ring flex items-center gap-1 font-medium hover:text-slate-600 dark:hover:text-slate-300"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
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
