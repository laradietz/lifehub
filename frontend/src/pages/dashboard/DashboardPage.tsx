import { Card } from "@/components/ui/Card"
import { useAuthStore } from "@/store/authStore"

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const firstName = user?.full_name?.split(" ")[0] ?? user?.email.split("@")[0]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hola, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tu cuenta está lista. A medida que agregues tareas, gastos y recordatorios, vas a ver un resumen acá.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-2xl dark:bg-brand-950/60">
          🧭
        </div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Todavía no hay nada para mostrar</h2>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Las tareas, finanzas, compras y vencimientos van a aparecer en este panel a medida que los vayas cargando.
          Estos módulos se habilitan en las próximas fases del proyecto.
        </p>
      </Card>
    </div>
  )
}
