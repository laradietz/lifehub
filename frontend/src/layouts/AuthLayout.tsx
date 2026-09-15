import type { ReactNode } from "react"

import { Logo } from "@/components/ui/Logo"

const HIGHLIGHTS = [
  { title: "Todo en un lugar", body: "Tareas, finanzas, compras y vencimientos sin abrir cinco apps distintas." },
  { title: "Nada se te pasa", body: "Recordatorios anticipados para seguros, suscripciones y documentos." },
  { title: "Pensado para el dia a dia", body: "Un panel simple que reduce la carga mental de organizar tu vida." },
]

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <div className="mx-auto w-full max-w-sm py-10">{children}</div>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} LifeHub. Todos los derechos reservados.
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-700 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold text-white">Organiza tu vida cotidiana en un solo panel.</h2>
          <div className="mt-10 flex flex-col gap-6">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title}>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-brand-100">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
