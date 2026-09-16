import { ArrowRight, House, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/Skeleton"
import { HouseholdFormModal } from "@/pages/households/HouseholdFormModal"
import { extractErrorMessage } from "@/services/api"
import { householdService } from "@/services/householdService"
import { toast } from "@/store/toastStore"
import type { HouseholdPayload, PendingInvitation } from "@/types/household"
import { useHouseholds } from "@/hooks/useHouseholds"

export function HouseholdsPage() {
  const { households, isLoading, reload } = useHouseholds()
  const [pending, setPending] = useState<PendingInvitation[]>([])
  const [isLoadingPending, setIsLoadingPending] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  async function loadPending() {
    setIsLoadingPending(true)
    try {
      const data = await householdService.listPendingInvitations()
      setPending(data)
    } finally {
      setIsLoadingPending(false)
    }
  }

  useEffect(() => {
    void loadPending()
  }, [])

  async function handleCreate(payload: HouseholdPayload) {
    await householdService.create(payload)
    toast.success("Hogar creado.")
    await reload()
  }

  async function handleAccept(invitation: PendingInvitation) {
    setError(null)
    setRespondingId(invitation.id)
    try {
      await householdService.acceptInvitation(invitation.id)
      toast.success(`Te sumaste a ${invitation.household_name}.`)
      await Promise.all([loadPending(), reload()])
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos aceptar la invitación."))
    } finally {
      setRespondingId(null)
    }
  }

  async function handleDecline(invitation: PendingInvitation) {
    setError(null)
    setRespondingId(invitation.id)
    try {
      await householdService.declineInvitation(invitation.id)
      toast.info("Invitación rechazada.")
      await loadPending()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos rechazar la invitación."))
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hogar</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Compartí tareas y listas de compras con quien vivís.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo hogar
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!isLoadingPending && pending.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Invitaciones pendientes</h2>
          <ul className="flex flex-col gap-3">
            {pending.map((invitation) => (
              <li key={invitation.id} className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  Te invitaron a sumarte a <span className="font-medium">{invitation.household_name}</span>
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    isLoading={respondingId === invitation.id}
                    onClick={() => void handleAccept(invitation)}
                  >
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={respondingId === invitation.id}
                    onClick={() => void handleDecline(invitation)}
                  >
                    Rechazar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="px-5 py-2">
        {isLoading ? (
          <div className="flex flex-col gap-4 py-3">
            {[1, 2].map((key) => (
              <Skeleton key={key} className="h-12 w-full" />
            ))}
          </div>
        ) : households.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-950/60 dark:text-brand-300">
              <House className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Todavía no tenés hogares</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Creá uno para compartir tareas y listas de compras.
            </p>
          </div>
        ) : (
          <ul>
            {households.map((household) => (
              <li
                key={household.id}
                className="flex items-center justify-between gap-3 rounded-lg border-b border-slate-100 px-2 py-3 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{household.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {household.members.length} {household.members.length === 1 ? "miembro" : "miembros"}
                  </p>
                </div>
                <Link
                  to={`/households/${household.id}`}
                  className="focus-ring flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Ver
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <HouseholdFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleCreate} />
    </div>
  )
}
