import { type FormEvent, useState } from "react"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { extractErrorMessage } from "@/services/api"
import { authService } from "@/services/authService"
import { useAuthStore } from "@/store/authStore"

export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const [fullName, setFullName] = useState(user?.full_name ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
    </div>
  )
}
