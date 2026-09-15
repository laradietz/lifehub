import { type FormEvent, useEffect, useState } from "react"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { extractErrorMessage } from "@/services/api"
import { authService } from "@/services/authService"
import { settingsService } from "@/services/settingsService"
import { useAuthStore } from "@/store/authStore"

const WIDGET_OPTIONS = [
  { key: "today", label: "Hoy", description: "Tareas pendientes, vencidas y recordatorios del día." },
  { key: "upcoming_due", label: "Próximos vencimientos", description: "Los recordatorios más urgentes." },
  { key: "week_summary", label: "Resumen semanal", description: "Tareas programadas para los próximos días." },
]

export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const [fullName, setFullName] = useState(user?.full_name ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [widgets, setWidgets] = useState<string[]>([])
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(true)
  const [widgetsError, setWidgetsError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSettings() {
      setIsLoadingWidgets(true)
      try {
        const settings = await settingsService.get()
        setWidgets(settings.dashboard_widgets)
      } catch (err) {
        setWidgetsError(extractErrorMessage(err, "No pudimos cargar tu configuración del dashboard."))
      } finally {
        setIsLoadingWidgets(false)
      }
    }
    void loadSettings()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSubmitting(true)
    try {
      const updated = await authService.updateMe({ full_name: fullName })
      setUser(updated)
      setSuccess(true)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar los cambios."))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleWidget(key: string, checked: boolean) {
    const next = checked ? [...widgets, key] : widgets.filter((item) => item !== key)
    setWidgets(next)
    try {
      await settingsService.update({ dashboard_widgets: next })
    } catch (err) {
      setWidgets(widgets)
      setWidgetsError(extractErrorMessage(err, "No pudimos guardar la preferencia."))
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configuración de la cuenta</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Actualizá tu información personal.</p>
      </div>

      <Card className="p-6">
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        {success && (
          <div className="mb-4">
            <Alert variant="success">Cambios guardados correctamente.</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" value={user?.email ?? ""} disabled hint="El email no se puede modificar." />
          <Input label="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <Button type="submit" isLoading={isSubmitting} className="self-start">
            Guardar cambios
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Panel de control</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Elegí qué widgets querés ver en tu dashboard.</p>

        {widgetsError && (
          <div className="mt-4">
            <Alert variant="error">{widgetsError}</Alert>
          </div>
        )}

        <div className="mt-4 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {WIDGET_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{option.label}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{option.description}</p>
              </div>
              <input
                type="checkbox"
                disabled={isLoadingWidgets}
                checked={widgets.includes(option.key)}
                onChange={(event) => void toggleWidget(option.key, event.target.checked)}
                className="mt-1 size-4 shrink-0 rounded border-slate-300 text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-600"
              />
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}
