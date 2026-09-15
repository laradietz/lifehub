import { type FormEvent, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { extractErrorMessage } from "@/services/api"
import { authService } from "@/services/authService"

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const navigate = useNavigate()

  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await authService.confirmPasswordReset(token, password)
      navigate("/login", { replace: true, state: { resetSuccess: true } })
    } catch (err) {
      setError(extractErrorMessage(err, "El enlace es inválido o expiró."))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="error">El enlace de recuperación no es válido. Solicitá uno nuevo.</Alert>
        <Link to="/forgot-password" className="focus-ring text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Solicitar nuevo enlace
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Elegí una nueva contraseña</h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="Mínimo 8 caracteres."
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Actualizar contraseña
        </Button>
      </form>
    </div>
  )
}
