import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/Badge"
import { Card } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/Skeleton"
import { dashboardService } from "@/services/dashboardService"
import { settingsService } from "@/services/settingsService"
import { useAuthStore } from "@/store/authStore"
import type { DashboardSummary } from "@/types/dashboard"
import { formatDate, PRIORITY_TONE } from "@/utils/taskMeta"

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "red" | "default" }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
      <span className={`text-2xl font-bold ${tone === "red" && value > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
        {value}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  )
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const firstName = user?.full_name?.split(" ")[0] ?? user?.email.split("@")[0]

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [widgets, setWidgets] = useState<string[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [summaryData, settingsData] = await Promise.all([dashboardService.today(), settingsService.get()])
        setSummary(summaryData)
        setWidgets(settingsData.dashboard_widgets)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const showToday = widgets?.includes("today") ?? true
  const showUpcoming = widgets?.includes("upcoming_due") ?? true
  const showWeek = widgets?.includes("week_summary") ?? true
  const noWidgets = widgets !== null && !showToday && !showUpcoming && !showWeek

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hola, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Esto es lo que tenés hoy en LifeHub.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : noWidgets ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-2xl dark:bg-brand-950/60">
            🧭
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Tu dashboard está vacío</h2>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Elegí qué widgets querés ver desde{" "}
            <Link to="/settings" className="focus-ring font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Configuración
            </Link>
            .
          </p>
        </Card>
      ) : (
        <>
          {showToday && summary && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Hoy</h2>
              <div className="grid grid-cols-3 gap-3">
                <StatTile label="Tareas pendientes" value={summary.today.pending_tasks_total} />
                <StatTile label="Vencidas" value={summary.today.tasks_overdue} tone="red" />
                <StatTile label="Recordatorios hoy" value={summary.today.reminders_due_today} />
              </div>
            </Card>
          )}

          {showUpcoming && summary && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Próximos vencimientos</h2>
                <Link to="/reminders" className="focus-ring text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  Ver todos
                </Link>
              </div>
              {summary.upcoming_reminders.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No tenés vencimientos próximos.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {summary.upcoming_reminders.map((reminder) => (
                    <li key={reminder.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-700 dark:text-slate-200">{reminder.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge tone={PRIORITY_TONE[reminder.priority]}>{formatDate(reminder.due_date)}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {showWeek && summary && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resumen semanal</h2>
                <Link to="/tasks" className="focus-ring text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  Ver todas
                </Link>
              </div>
              {summary.week_tasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No tenés tareas programadas para los próximos días.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {summary.week_tasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-700 dark:text-slate-200">{task.title}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(task.due_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
