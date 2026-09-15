import { Navigate, Outlet, useLocation } from "react-router-dom"

import { Spinner } from "@/components/ui/Spinner"
import { useAuthStore } from "@/store/authStore"

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400">
        <Spinner size="md" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
