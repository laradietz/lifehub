import { type FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { extractErrorMessage } from "@/services/api"
import { useAuthStore } from "@/store/authStore"

export function RegisterPage() {
  const register = useAuthStore((state) => state.register)
  const navigate = useNavigate()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordTooShort = password.length > 0 && password.length < 8

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await register({ email, password, full_name: fullName || undefined })
      navigate("/", { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos crear tu cuenta. Intenta nuevamente."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Creá tu cuenta</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Empezá a organizar tu vida cotidiana en minutos.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Nombre completo" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordTooShort ? "Debe tener al menos 8 caracteres." : undefined}
          hint={passwordTooShort ? undefined : "Mínimo 8 caracteres."}
        />

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        ¿Ya tenés cuenta?{" "}
        <Link to="/login" className="focus-ring font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Iniciá sesión
        </Link>
      </p>
    </div>
  )
}
