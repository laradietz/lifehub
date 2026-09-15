import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { extractErrorMessage } from "@/services/api"
import { authService } from "@/services/authService"

const RESEND_COOLDOWN_SECONDS = 30

export function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<"request" | "confirm">("request")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown === 0) return
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function handleRequestCode(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await authService.requestPasswordReset(email)
      setStep("confirm")
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos procesar la solicitud."))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendCode() {
    if (cooldown > 0) return
    setError(null)
    try {
      await authService.requestPasswordReset(email)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos reenviar el código."))
    }
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await authService.confirmPasswordReset(email, code, newPassword)
      navigate("/login", { replace: true, state: { resetSuccess: true } })
    } catch (err) {
      setError(extractErrorMessage(err, "El código es inválido o expiró."))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === "confirm") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Revisá tu email</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Te enviamos un código de 6 dígitos a <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>. Ingresalo junto con tu nueva contraseña.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleConfirm} noValidate className="flex flex-col gap-4">
          <Input
            label="Código de 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            pattern="\d{6}"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            hint="Revisá también la carpeta de spam."
          />
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            hint="Mínimo 8 caracteres."
          />

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Cambiar contraseña
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setStep("request")}
            className="focus-ring font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← Usar otro email
          </button>
          <button
            type="button"
            onClick={() => void handleResendCode()}
            disabled={cooldown > 0}
            className="focus-ring font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-brand-400 dark:disabled:text-slate-600"
          >
            {cooldown > 0 ? `Reenviar código (${cooldown}s)` : "Reenviar código"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ingresá el email con el que te registraste y te enviamos un código para restablecer tu contraseña.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleRequestCode} noValidate className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Enviar código
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        <Link to="/login" className="focus-ring font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  )
}
