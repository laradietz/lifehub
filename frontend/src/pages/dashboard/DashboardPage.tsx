import { AlertTriangle, Bell, CalendarDays, Compass, ListChecks, Wallet } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/Badge"
import { Card } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/Skeleton"
import { dashboardService } from "@/services/dashboardService"
import { settingsService } from "@/services/settingsService"
import { useAuthStore } from "@/store/authStore"
import type { DashboardSummary } from "@/types/dashboard"
import { formatCompactCurrency, formatCurrency } from "@/utils/currency"
import { formatDate, PRIORITY_TONE } from "@/utils/taskMeta"
import { cn } from "@/utils/cn"

function CardHeading({ icon: Icon, title }: { icon: typeof Wallet; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
    </div>
  )
}

function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: number
  tone?: "red" | "default"
  icon?: typeof AlertTriangle
}) {
  const isAlert = tone === "red" && value > 0
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50 px-4 py-3 transition-colors dark:bg-slate-800/60">
      <div className="flex items-center justify-between">
        <span className={`text-2xl font-bold whitespace-nowrap ${isAlert ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
          {value}
        </span>
        {Icon && <Icon className={cn("size-4", isAlert ? "text-red-400" : "text-slate-300 dark:text-slate-600")} aria-hidden="true" />}
      </div>
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
  const showFinance = widgets?.includes("finance_summary") ?? true
  const showUpcoming = widgets?.includes("upcoming_due") ?? true
  const showWeek = widgets?.includes("week_summary") ?? true
  const noWidgets = widgets !== null && !showToday && !showFinance && !showUpcoming && !showWeek

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hola, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Esto es lo que tenés hoy en Vida En Orden.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : noWidgets ? (
        <Card className="animate-fade-in flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-950/60 dark:text-brand-300">
            <Compass className="size-6" aria-hidden="true" />
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
        <div className="animate-fade-in flex flex-col gap-6">
          {showToday && summary && (
            <Card className="p-5">
              <CardHeading icon={ListChecks} title="Hoy" />
              <div className="mt-3 grid grid-cols-3 gap-3">
                <StatTile label="Tareas pendientes" value={summary.today.pending_tasks_total} icon={ListChecks} />
                <StatTile label="Vencidas" value={summary.today.tasks_overdue} tone="red" icon={AlertTriangle} />
                <StatTile label="Recordatorios hoy" value={summary.today.reminders_due_today} icon={Bell} />
              </div>
            </Card>
          )}

          {showFinance && summary && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <CardHeading icon={Wallet} title="Finanzas" />
                <Link to="/finance" className="focus-ring text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  Ver más
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1 overflow-hidden rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800/60">
                  <span
                    title={formatCurrency(summary.finance.income_this_month, summary.finance.currency)}
                    className="truncate text-lg font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    {formatCompactCurrency(summary.finance.income_this_month, summary.finance.currency)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Ingresos del mes</span>
                </div>
                <div className="flex flex-col gap-1 overflow-hidden rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800/60">
                  <span
                    title={formatCurrency(summary.finance.expenses_this_month, summary.finance.currency)}
                    className="truncate text-lg font-bold text-slate-900 dark:text-slate-100"
                  >
                    {formatCompactCurrency(summary.finance.expenses_this_month, summary.finance.currency)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Gastos del mes</span>
                </div>
                <div className="flex flex-col gap-1 overflow-hidden rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800/60">
                  <span
                    title={formatCurrency(summary.finance.balance, summary.finance.currency)}
                    className={`truncate text-lg font-bold ${Number.parseFloat(summary.finance.balance) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {formatCompactCurrency(summary.finance.balance, summary.finance.currency)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Saldo</span>
                </div>
              </div>
              {summary.finance.top_expense_category && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Gastaste más en <Badge tone="amber">{summary.finance.top_expense_category}</Badge>
                </p>
              )}
            </Card>
          )}

          {showUpcoming && summary && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <CardHeading icon={Bell} title="Próximos vencimientos" />
                <Link to="/reminders" className="focus-ring text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  Ver todos
                </Link>
              </div>
              {summary.upcoming_reminders.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No tenés vencimientos próximos.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {summary.upcoming_reminders.map((reminder) => (
                    <li
                      key={reminder.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
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
              <div className="flex items-center justify-between">
                <CardHeading icon={CalendarDays} title="Resumen semanal" />
                <Link to="/tasks" className="focus-ring text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  Ver todas
                </Link>
              </div>
              {summary.week_tasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No tenés tareas programadas para los próximos días.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {summary.week_tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <span className="text-slate-700 dark:text-slate-200">{task.title}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(task.due_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
