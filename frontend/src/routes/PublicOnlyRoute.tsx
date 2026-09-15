import { Navigate, Outlet } from "react-router-dom"

import { Spinner } from "@/components/ui/Spinner"
import { useAuthStore } from "@/store/authStore"

export function PublicOnlyRoute() {
  const status = useAuthStore((state) => state.status)

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400">
        <Spinner size="md" />
      </div>
    )
  }

  if (status === "authenticated") {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
