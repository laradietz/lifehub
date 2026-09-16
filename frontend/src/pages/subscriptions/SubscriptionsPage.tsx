import { Plus, Repeat } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SearchInput } from "@/components/ui/SearchInput"
import { Skeleton } from "@/components/ui/Skeleton"
import { useCategories } from "@/hooks/useCategories"
import { extractErrorMessage } from "@/services/api"
import { subscriptionService } from "@/services/subscriptionService"
import { SubscriptionFormModal } from "@/pages/subscriptions/SubscriptionFormModal"
import { SubscriptionItem } from "@/pages/subscriptions/SubscriptionItem"
import { toast } from "@/store/toastStore"
import type { Subscription, SubscriptionPayload, SubscriptionSummary } from "@/types/subscription"
import { formatCurrency } from "@/utils/currency"
import { formatDate } from "@/utils/taskMeta"

export function SubscriptionsPage() {
  const { categories } = useCategories("subscription")
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [deletingSubscription, setDeletingSubscription] = useState<Subscription | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function loadAll() {
    setIsLoading(true)
    try {
      const [list, summaryData] = await Promise.all([
        subscriptionService.list({ include_inactive: includeInactive }),
        subscriptionService.summary(),
      ])
      setSubscriptions(list)
      setSummary(summaryData)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive])

  async function handleSubmit(payload: SubscriptionPayload) {
    if (editingSubscription) {
      await subscriptionService.update(editingSubscription.id, payload)
      toast.success("Suscripción actualizada.")
    } else {
      await subscriptionService.create(payload)
      toast.success("Suscripción creada.")
    }
    await loadAll()
  }

  async function handleToggleActive(subscription: Subscription) {
    await subscriptionService.update(subscription.id, { is_active: !subscription.is_active })
    await loadAll()
  }

  async function handleDelete() {
    if (!deletingSubscription) return
    setIsDeleting(true)
    try {
      await subscriptionService.remove(deletingSubscription.id)
      setDeletingSubscription(null)
      toast.success("Suscripción eliminada.")
      await loadAll()
    } catch (err) {
      toast.error(extractErrorMessage(err, "No pudimos eliminar la suscripción."))
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredSubscriptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return subscriptions
    return subscriptions.filter((subscription) => subscription.name.toLowerCase().includes(query))
  }, [subscriptions, search])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Suscripciones</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Netflix, Spotify, gimnasio y todo lo que se cobra solo.</p>
        </div>
        <Button
          onClick={() => {
            setEditingSubscription(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nueva suscripción
        </Button>
      </div>

      {isLoading && !summary ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        summary && (
          <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Suscripciones este mes</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(summary.monthly_total, summary.currency)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {formatCurrency(summary.annual_total, summary.currency)} estimado al año
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Próximo cobro</p>
              {summary.next_billing ? (
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {summary.next_billing.name} — {formatDate(summary.next_billing.next_billing_date)}
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No tenés suscripciones activas.</p>
              )}
            </div>
          </Card>
        )
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
            className="size-4 rounded border-slate-300 text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-600"
          />
          Mostrar canceladas
        </label>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar suscripciones..." className="sm:w-64" />
      </div>

      <Card className="px-5 py-2">
        {isLoading ? (
          <div className="flex flex-col gap-4 py-3">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-12 w-full" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-950/60 dark:text-brand-300">
              <Repeat className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No tenés suscripciones</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Agregá Netflix, Spotify o tu gimnasio para llevar la cuenta.</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Ninguna suscripción coincide con "{search}"
            </p>
          </div>
        ) : (
          <ul>
            {filteredSubscriptions.map((subscription) => (
              <SubscriptionItem
                key={subscription.id}
                subscription={subscription}
                categories={categories}
                onToggleActive={handleToggleActive}
                onEdit={(item) => {
                  setEditingSubscription(item)
                  setIsFormOpen(true)
                }}
                onDelete={setDeletingSubscription}
              />
            ))}
          </ul>
        )}
      </Card>

      <SubscriptionFormModal
        isOpen={isFormOpen}
        subscription={editingSubscription}
        defaultCurrency={summary?.currency ?? "USD"}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingSubscription)}
        title="Eliminar suscripción"
        description={`¿Seguro que querés eliminar "${deletingSubscription?.name}"?`}
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingSubscription(null)}
      />
    </div>
  )
}
