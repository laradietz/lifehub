import {
  Calendar,
  Car,
  CircleCheckBig,
  CreditCard,
  FileText,
  Home,
  House,
  LogOut,
  Menu,
  Receipt,
  Repeat,
  Settings,
  ShoppingCart,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"

import { NotificationBell } from "@/components/NotificationBell"
import { Logo } from "@/components/ui/Logo"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/utils/cn"

const NAV_ITEMS = [
  { to: "/", label: "Hoy", icon: Home, end: true },
  { to: "/tasks", label: "Tareas", icon: CircleCheckBig },
  { to: "/reminders", label: "Recordatorios", icon: Receipt },
  { to: "/calendar", label: "Calendario", icon: Calendar },
  { to: "/finance", label: "Finanzas", icon: CreditCard },
  { to: "/subscriptions", label: "Suscripciones", icon: Repeat },
  { to: "/households", label: "Hogar", icon: House },
  { to: "/shopping", label: "Compras", icon: ShoppingCart },
  { to: "/documents", label: "Documentos", icon: FileText },
  { to: "/vehicles", label: "Vehículos", icon: Car },
  { to: "/settings", label: "Configuración", icon: Settings },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "focus-ring group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity duration-150",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {item.label}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!mobileNavOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [mobileNavOpen])

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
          className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LogOut className="size-[18px]" aria-hidden="true" />
          Cerrar sesión
        </button>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="animate-modal-in absolute inset-y-0 left-0 flex w-72 flex-col bg-white px-4 py-6 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMobileNavOpen(false)}
                className="focus-ring rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-8 flex-1">
              <NavList onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut className="size-[18px]" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6 lg:justify-end">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Abrir menú"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
            className="focus-ring rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
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
