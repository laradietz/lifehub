import { Bell, Calendar, CircleCheckBig, FileText, Info, Repeat, Car as VehicleIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { notificationService } from "@/services/notificationService"
import type { Notification, NotificationType } from "@/types/notification"
import { cn } from "@/utils/cn"

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  reminder: Bell,
  document: FileText,
  vehicle: VehicleIcon,
  event: Calendar,
  task: CircleCheckBig,
  subscription: Repeat,
  system: Info,
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const bellButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
        bellButtonRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    // Mueve el foco al panel cuando se abre, para que un usuario de lector de
    // pantalla sepa que se abrió un popup en vez de quedarse en el botón
    // (ver AUDITORIA.md, hallazgo S25).
    if (isOpen) panelRef.current?.focus()
  }, [isOpen])

  async function loadUnreadCount() {
    try {
      setUnreadCount(await notificationService.unreadCount())
    } catch {
      // silencioso: no interrumpir la UI si falla el conteo periódico
    }
  }

  useEffect(() => {
    void loadUnreadCount()
    const interval = setInterval(() => void loadUnreadCount(), 60_000)
    return () => clearInterval(interval)
  }, [])

  async function openPanel() {
    setIsOpen(true)
    setIsLoading(true)
    try {
      setNotifications(await notificationService.list({ limit: 20 }))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleMarkRead(notification: Notification) {
    if (notification.is_read) return
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      await notificationService.markRead(notification.id)
    } catch {
      void loadUnreadCount()
    }
  }

  async function handleMarkAllRead() {
    const previous = notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    try {
      await notificationService.markAllRead()
    } catch {
      setNotifications(previous)
      void loadUnreadCount()
    }
  }

  const hasUnreadInPanel = notifications.some((n) => !n.is_read)

  return (
    <div className="relative">
      <button
        ref={bellButtonRef}
        type="button"
        aria-label="Notificaciones"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : void openPanel())}
        className="focus-ring relative flex size-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Bell className="size-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notificaciones"
            tabIndex={-1}
            className="animate-modal-in absolute right-0 z-50 mt-2 flex max-h-96 w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg outline-none dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notificaciones</span>
              {hasUnreadInPanel && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="focus-ring text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No tenés notificaciones.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.map((notification) => {
                    const Icon = TYPE_ICON[notification.type] ?? Bell
                    return (
                      <li key={notification.id}>
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(notification)}
                          className={cn(
                            "focus-ring flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                            !notification.is_read && "bg-brand-50/60 dark:bg-brand-950/20",
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                              <Icon className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                              {notification.title}
                            </span>
                            {!notification.is_read && <span className="size-2 shrink-0 rounded-full bg-brand-500" />}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{notification.message}</span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {formatWhen(notification.created_at)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
