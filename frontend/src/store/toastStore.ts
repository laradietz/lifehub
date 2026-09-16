import { create } from "zustand"

export type ToastVariant = "success" | "error" | "info"

interface ToastItem {
  id: string
  variant: ToastVariant
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  dismiss: (id: string) => void
}

const DEFAULT_DURATION_MS = 4000

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}))

function push(variant: ToastVariant, message: string) {
  const id = crypto.randomUUID()
  useToastStore.setState((state) => ({ toasts: [...state.toasts, { id, variant, message }] }))
  setTimeout(() => useToastStore.getState().dismiss(id), DEFAULT_DURATION_MS)
}

// API imperativa (toast.success("...")) para poder llamarla desde cualquier
// handler async sin tener que enganchar el store con un hook en cada componente.
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
}
