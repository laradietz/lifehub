import { useEffect, useState } from "react"

import { notificationService } from "@/services/notificationService"
import type { Notification, NotificationType } from "@/types/notification"
import { cn } from "@/utils/cn"

const TYPE_ICON: Record<NotificationType, string> = {
  reminder: "🔔",
  document: "📄",
  vehicle: "🚗",
  event: "📅",
  task: "✅",
  subscription: "🔁",
  system: "ℹ️",
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

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
        type="button"
        aria-label="Notificaciones"
        onClick={() => (isOpen ? setIsOpen(false) : void openPanel())}
        className="focus-ring relative flex size-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-50 mt-2 flex max-h-96 w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
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
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => void handleMarkRead(notification)}
                        className={cn(
                          "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800",
                          !notification.is_read && "bg-brand-50/60 dark:bg-brand-950/20",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                            <span aria-hidden="true">{TYPE_ICON[notification.type] ?? "🔔"}</span>
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
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
