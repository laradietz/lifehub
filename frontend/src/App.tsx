import { Suspense, lazy, useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { Spinner } from "@/components/ui/Spinner"
import { Toaster } from "@/components/ui/Toaster"
import { AppLayout } from "@/layouts/AppLayout"
import { AuthLayout } from "@/layouts/AuthLayout"
import { useThemeSync } from "@/hooks/useThemeSync"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { PublicOnlyRoute } from "@/routes/PublicOnlyRoute"
import { useAuthStore } from "@/store/authStore"

// Code-splitting por ruta (ver AUDITORIA.md, hallazgo P5): antes todas las paginas
// se empaquetaban juntas en el bundle inicial, asi que alguien que solo entraba a
// /login ya descargaba el codigo de las 12 paginas autenticadas. Cada import()
// se separa en su propio chunk que solo se pide cuando esa ruta se visita.
const LoginPage = lazy(() => import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() =>
  import("@/pages/auth/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })),
)
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })))
const TasksPage = lazy(() => import("@/pages/tasks/TasksPage").then((m) => ({ default: m.TasksPage })))
const RemindersPage = lazy(() => import("@/pages/reminders/RemindersPage").then((m) => ({ default: m.RemindersPage })))
const CalendarPage = lazy(() => import("@/pages/calendar/CalendarPage").then((m) => ({ default: m.CalendarPage })))
const FinancePage = lazy(() => import("@/pages/finance/FinancePage").then((m) => ({ default: m.FinancePage })))
const SubscriptionsPage = lazy(() =>
  import("@/pages/subscriptions/SubscriptionsPage").then((m) => ({ default: m.SubscriptionsPage })),
)
const HouseholdsPage = lazy(() => import("@/pages/households/HouseholdsPage").then((m) => ({ default: m.HouseholdsPage })))
const HouseholdDetailPage = lazy(() =>
  import("@/pages/households/HouseholdDetailPage").then((m) => ({ default: m.HouseholdDetailPage })),
)
const ShoppingPage = lazy(() => import("@/pages/shopping/ShoppingPage").then((m) => ({ default: m.ShoppingPage })))
const DocumentsPage = lazy(() => import("@/pages/documents/DocumentsPage").then((m) => ({ default: m.DocumentsPage })))
const VehiclesPage = lazy(() => import("@/pages/vehicles/VehiclesPage").then((m) => ({ default: m.VehiclesPage })))
const SettingsPage = lazy(() => import("@/pages/dashboard/SettingsPage").then((m) => ({ default: m.SettingsPage })))

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="md" className="text-brand-500" />
    </div>
  )
}

export default function App() {
  const loadCurrentUser = useAuthStore((state) => state.loadCurrentUser)

  useEffect(() => {
    void loadCurrentUser()
  }, [loadCurrentUser])

  useThemeSync()

  return (
    <>
      <Toaster />
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route element={<AuthLayout><LoginPage /></AuthLayout>} path="/login" />
            <Route element={<AuthLayout><RegisterPage /></AuthLayout>} path="/register" />
            <Route element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} path="/forgot-password" />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/households" element={<HouseholdsPage />} />
              <Route path="/households/:id" element={<HouseholdDetailPage />} />
              <Route path="/shopping" element={<ShoppingPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
