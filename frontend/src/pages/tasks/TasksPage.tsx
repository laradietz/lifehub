import { CircleCheckBig, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SearchInput } from "@/components/ui/SearchInput"
import { Skeleton } from "@/components/ui/Skeleton"
import { useCategories } from "@/hooks/useCategories"
import { useHouseholds } from "@/hooks/useHouseholds"
import { extractErrorMessage } from "@/services/api"
import { taskService } from "@/services/taskService"
import { TaskFormModal } from "@/pages/tasks/TaskFormModal"
import { TaskItem } from "@/pages/tasks/TaskItem"
import { toast } from "@/store/toastStore"
import type { Task, TaskPayload, TaskStatus } from "@/types/task"

type FilterValue = "all" | TaskStatus

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completadas" },
]

export function TasksPage() {
  const { categories } = useCategories("task")
  const { households } = useHouseholds()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<FilterValue>("all")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function loadTasks() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await taskService.list(filter === "all" ? undefined : { status: filter })
      setTasks(data)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos cargar las tareas."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function handleCreateOrUpdate(payload: TaskPayload) {
    if (editingTask) {
      await taskService.update(editingTask.id, payload)
      toast.success("Tarea actualizada.")
    } else {
      await taskService.create(payload)
      toast.success("Tarea creada.")
    }
    await loadTasks()
  }

  async function handleToggleComplete(task: Task) {
    const nextStatus: TaskStatus = task.status === "completed" ? "pending" : "completed"
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)))
    try {
      await taskService.update(task.id, { status: nextStatus })
      if (nextStatus === "completed") toast.success("¡Tarea completada!")
      await loadTasks()
    } catch (err) {
      toast.error(extractErrorMessage(err, "No pudimos actualizar la tarea."))
      await loadTasks()
    }
  }

  async function handleSetInProgress(task: Task) {
    await taskService.update(task.id, { status: "in_progress" })
    await loadTasks()
  }

  async function handleDelete() {
    if (!deletingTask) return
    setIsDeleting(true)
    try {
      await taskService.remove(deletingTask.id)
      setDeletingTask(null)
      toast.success("Tarea eliminada.")
      await loadTasks()
    } catch (err) {
      toast.error(extractErrorMessage(err, "No pudimos eliminar la tarea."))
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return tasks
    return tasks.filter(
      (task) => task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query),
    )
  }, [tasks, search])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tareas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Organizá lo que tenés que hacer.</p>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nueva tarea
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`focus-ring shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === item.value
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar tareas..." className="sm:w-64" />
      </div>

      <Card className="px-5 py-2">
        {isLoading ? (
          <div className="flex flex-col gap-4 py-3">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-950/60 dark:text-brand-300">
              <CircleCheckBig className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {filter === "all" ? "No tenés tareas todavía" : "No hay tareas en esta categoría"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Creá tu primera tarea para empezar a organizarte.</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Ninguna tarea coincide con "{search}"
            </p>
          </div>
        ) : (
          <ul>
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                categories={categories}
                households={households}
                onToggleComplete={handleToggleComplete}
                onSetInProgress={handleSetInProgress}
                onEdit={(item) => {
                  setEditingTask(item)
                  setIsFormOpen(true)
                }}
                onDelete={setDeletingTask}
              />
            ))}
          </ul>
        )}
      </Card>

      <TaskFormModal
        isOpen={isFormOpen}
        task={editingTask}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingTask)}
        title="Eliminar tarea"
        description={`¿Seguro que querés eliminar "${deletingTask?.title}"? Esta acción no se puede deshacer.`}
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingTask(null)}
      />
    </div>
  )
}
