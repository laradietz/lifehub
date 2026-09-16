import { type ReactNode, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  title: string
  description?: string
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: "sm" | "md"
}

export function Modal({ title, description, isOpen, onClose, children, size = "md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Mueve el foco adentro del modal al abrir y lo devuelve a quien lo disparó al
    // cerrar (ej. el botón "Nueva tarea") -- sin esto, un usuario de teclado pierde
    // de vista dónde está el foco apenas se abre o se cierra un modal.
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    // El botón "Cerrar" del header es el primer foco DOM del panel, pero no es el
    // mejor lugar para arrancar -- preferimos el primer campo real del formulario.
    const focusable = Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])
    const firstFocusable = focusable.find((el) => el.getAttribute("aria-label") !== "Cerrar") ?? focusable[0]
    ;(firstFocusable ?? panel)?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key !== "Tab" || !panel) return

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`animate-modal-in focus-ring relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 ${size === "sm" ? "max-w-sm" : "max-w-lg"}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="focus-ring rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
