import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"

import { NotificationBell } from "@/components/NotificationBell"
import { Logo } from "@/components/ui/Logo"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/utils/cn"

const NAV_ITEMS = [
  { to: "/", label: "Hoy", icon: "🏠", end: true },
  { to: "/tasks", label: "Tareas", icon: "✅" },
  { to: "/reminders", label: "Recordatorios", icon: "🔔" },
  { to: "/calendar", label: "Calendario", icon: "📅" },
  { to: "/finance", label: "Finanzas", icon: "💰" },
  { to: "/subscriptions", label: "Suscripciones", icon: "🔁" },
  { to: "/households", label: "Hogar", icon: "🏡" },
  { to: "/shopping", label: "Compras", icon: "🛒" },
  { to: "/documents", label: "Documentos", icon: "📄" },
  { to: "/vehicles", label: "Vehículos", icon: "🚗" },
  { to: "/settings", label: "Configuración", icon: "⚙️" },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )
          }
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <Logo className="px-2" />
        <div className="mt-8 flex-1">
          <NavList />
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span aria-hidden="true">↩</span>
          Cerrar sesión
        </button>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white px-4 py-6 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMobileNavOpen(false)}
                className="focus-ring rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="mt-8 flex-1">
              <NavList onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span aria-hidden="true">↩</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6 lg:justify-end">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMobileNavOpen(true)}
            className="focus-ring rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                {(user?.full_name ?? user?.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:inline">
                {user?.full_name ?? user?.email}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
