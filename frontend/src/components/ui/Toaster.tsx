import { CheckCircle2, Info, X, XCircle } from "lucide-react"

import { type ToastVariant, useToastStore } from "@/store/toastStore"
import { cn } from "@/utils/cn"

const ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const CONTAINER_CLASSES: Record<ToastVariant, string> = {
  success: "border-emerald-200 dark:border-emerald-900",
  error: "border-red-200 dark:border-red-900",
  info: "border-brand-200 dark:border-brand-900",
}

const ICON_CLASSES: Record<ToastVariant, string> = {
  success: "text-emerald-500",
  error: "text-red-500",
  info: "text-brand-500",
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-100 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((item) => {
        const Icon = ICON[item.variant]
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-lg dark:bg-slate-900 dark:text-slate-200",
              CONTAINER_CLASSES[item.variant],
            )}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", ICON_CLASSES[item.variant])} aria-hidden="true" />
            <p className="flex-1">{item.message}</p>
            <button
              type="button"
              aria-label="Cerrar notificación"
              onClick={() => dismiss(item.id)}
              className="focus-ring shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
