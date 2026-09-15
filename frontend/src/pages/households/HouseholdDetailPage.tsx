import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Input } from "@/components/ui/Input"
import { Skeleton } from "@/components/ui/Skeleton"
import { HouseholdFormModal } from "@/pages/households/HouseholdFormModal"
import { MemberRow } from "@/pages/households/MemberRow"
import { extractErrorMessage } from "@/services/api"
import { householdService } from "@/services/householdService"
import { useAuthStore } from "@/store/authStore"
import type { Household, HouseholdMember, HouseholdPayload } from "@/types/household"

export function HouseholdDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)

  const [household, setHousehold] = useState<Household | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [removingMember, setRemovingMember] = useState<HouseholdMember | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  async function load() {
    if (!id) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await householdService.get(id)
      setHousehold(data)
    } catch (err) {
      setLoadError(extractErrorMessage(err, "No pudimos cargar el hogar."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const isOwner = household !== null && currentUser !== null && household.owner_id === currentUser.id

  async function handleInvite(event: FormEvent) {
    event.preventDefault()
    if (!id) return
    setInviteError(null)
    setIsInviting(true)
    try {
      await householdService.invite(id, { email: inviteEmail })
      setInviteEmail("")
      await load()
    } catch (err) {
      setInviteError(extractErrorMessage(err, "No pudimos enviar la invitación."))
    } finally {
      setIsInviting(false)
    }
  }

  async function handleRename(payload: HouseholdPayload) {
    if (!id) return
    await householdService.update(id, payload)
    await load()
  }

  async function handleDelete() {
    if (!id) return
    setIsDeleting(true)
    try {
      await householdService.remove(id)
      navigate("/households")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleLeave() {
    if (!id) return
    setIsLeaving(true)
    try {
      await householdService.leave(id)
      navigate("/households")
    } finally {
      setIsLeaving(false)
    }
  }

  async function handleRemoveMember() {
    if (!id || !removingMember) return
    setIsRemovingMember(true)
    try {
      await householdService.removeMember(id, removingMember.id)
      setRemovingMember(null)
      await load()
    } finally {
      setIsRemovingMember(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (loadError || !household) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link to="/households" className="focus-ring text-sm font-medium text-brand-600 dark:text-brand-400">
          ← Volver a Hogar
        </Link>
        <Alert variant="error">{loadError ?? "Hogar no encontrado."}</Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link to="/households" className="focus-ring text-sm font-medium text-brand-600 dark:text-brand-400">
          ← Volver a Hogar
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{household.name}</h1>
          {isOwner && (
            <Button variant="secondary" size="sm" onClick={() => setIsRenameOpen(true)}>
              Renombrar
            </Button>
          )}
        </div>
      </div>

      <Card className="px-5 py-2">
        <h2 className="pt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Miembros</h2>
        <ul>
          {household.members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserId={currentUser?.id}
              canRemove={isOwner}
              onRemove={setRemovingMember}
            />
          ))}
        </ul>
      </Card>

      {isOwner && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Invitar a alguien</h2>
          {inviteError && <Alert variant="error">{inviteError}</Alert>}
          <form onSubmit={handleInvite} className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Email"
                type="email"
                required
                placeholder="persona@ejemplo.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </div>
            <Button type="submit" isLoading={isInviting}>
              Invitar
            </Button>
          </form>
        </Card>
      )}

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Zona de peligro</h2>
        {isOwner ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Elimina el hogar para todos. Las tareas y listas compartidas dejan de estar vinculadas, pero no se borran.
            </p>
            <Button variant="danger" size="sm" className="shrink-0" onClick={() => setIsDeleteConfirmOpen(true)}>
              Eliminar hogar
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Dejás de ver las tareas y listas de este hogar.</p>
            <Button variant="danger" size="sm" className="shrink-0" onClick={() => setIsLeaveConfirmOpen(true)}>
              Abandonar hogar
            </Button>
          </div>
        )}
      </Card>

      <HouseholdFormModal
        isOpen={isRenameOpen}
        household={household}
        onClose={() => setIsRenameOpen(false)}
        onSubmit={handleRename}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Eliminar hogar"
        description={`¿Seguro que querés eliminar "${household.name}"? Esta acción no se puede deshacer.`}
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={isLeaveConfirmOpen}
        title="Abandonar hogar"
        description={`¿Seguro que querés abandonar "${household.name}"?`}
        isConfirming={isLeaving}
        onConfirm={handleLeave}
        onCancel={() => setIsLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={Boolean(removingMember)}
        title="Quitar miembro"
        description={`¿Seguro que querés quitar a "${removingMember?.full_name ?? removingMember?.email}" del hogar?`}
        isConfirming={isRemovingMember}
        onConfirm={handleRemoveMember}
        onCancel={() => setRemovingMember(null)}
      />
    </div>
  )
}
