import { useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { Toaster } from "@/components/ui/Toaster"
import { AppLayout } from "@/layouts/AppLayout"
import { AuthLayout } from "@/layouts/AuthLayout"
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage"
import { CalendarPage } from "@/pages/calendar/CalendarPage"
import { LoginPage } from "@/pages/auth/LoginPage"
import { RegisterPage } from "@/pages/auth/RegisterPage"
import { DashboardPage } from "@/pages/dashboard/DashboardPage"
import { SettingsPage } from "@/pages/dashboard/SettingsPage"
import { DocumentsPage } from "@/pages/documents/DocumentsPage"
import { FinancePage } from "@/pages/finance/FinancePage"
import { HouseholdDetailPage } from "@/pages/households/HouseholdDetailPage"
import { HouseholdsPage } from "@/pages/households/HouseholdsPage"
import { useThemeSync } from "@/hooks/useThemeSync"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { RemindersPage } from "@/pages/reminders/RemindersPage"
import { ShoppingPage } from "@/pages/shopping/ShoppingPage"
import { SubscriptionsPage } from "@/pages/subscriptions/SubscriptionsPage"
import { TasksPage } from "@/pages/tasks/TasksPage"
import { VehiclesPage } from "@/pages/vehicles/VehiclesPage"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { PublicOnlyRoute } from "@/routes/PublicOnlyRoute"
import { useAuthStore } from "@/store/authStore"

export default function App() {
  const loadCurrentUser = useAuthStore((state) => state.loadCurrentUser)

  useEffect(() => {
    void loadCurrentUser()
  }, [loadCurrentUser])

  useThemeSync()

  return (
    <>
      <Toaster />
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
    </>
  )
}
