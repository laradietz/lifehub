import { type FormEvent, useState } from "react"
import { Link } from "react-router-dom"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { authService } from "@/services/authService"
import { extractErrorMessage } from "@/services/api"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await authService.requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos procesar la solicitud."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Te enviaremos instrucciones a tu email si la cuenta existe.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {sent ? (
        <Alert variant="success">Si el email existe en LifeHub, vas a recibir instrucciones en breve.</Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Enviar instrucciones
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        <Link to="/login" className="focus-ring font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  )
}
