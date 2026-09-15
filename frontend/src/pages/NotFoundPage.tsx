import { Link } from "react-router-dom"

import { Button } from "@/components/ui/Button"

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">404</p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        La página que buscás no existe o fue movida.
      </p>
      <Link to="/">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  )
}
