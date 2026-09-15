import { type FormEvent, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { extractErrorMessage } from "@/services/api"
import { useAuthStore } from "@/store/authStore"

export function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? "/"

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login({ email, password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos iniciar sesión. Intenta nuevamente."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Bienvenido de nuevo. Ingresa tus credenciales para continuar.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Link to="/forgot-password" className="focus-ring self-end text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Ingresar
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        ¿No tenés cuenta?{" "}
        <Link to="/register" className="focus-ring font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Creá una gratis
        </Link>
      </p>
    </div>
  )
}
