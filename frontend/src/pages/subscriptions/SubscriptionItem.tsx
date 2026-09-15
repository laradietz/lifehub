import { Badge } from "@/components/ui/Badge"
import type { Category } from "@/types/category"
import type { Subscription } from "@/types/subscription"
import { formatCurrency } from "@/utils/currency"
import { FREQUENCY_LABEL } from "@/utils/financeMeta"
import { formatDate } from "@/utils/taskMeta"

interface SubscriptionItemProps {
  subscription: Subscription
  categories: Category[]
  onToggleActive: (subscription: Subscription) => void
  onEdit: (subscription: Subscription) => void
  onDelete: (subscription: Subscription) => void
}

export function SubscriptionItem({ subscription, categories, onToggleActive, onEdit, onDelete }: SubscriptionItemProps) {
  const category = categories.find((item) => item.id === subscription.category_id)

  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-medium ${subscription.is_active ? "text-slate-900 dark:text-slate-100" : "text-slate-400 line-through dark:text-slate-500"}`}>
            {subscription.name}
          </p>
          <Badge tone="slate">{FREQUENCY_LABEL[subscription.frequency]}</Badge>
          {category && <Badge tone="violet">{category.name}</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          {subscription.is_active && <span>Próximo cobro: {formatDate(subscription.next_billing_date)}</span>}
          <button type="button" onClick={() => onToggleActive(subscription)} className="focus-ring font-medium hover:text-slate-600 dark:hover:text-slate-300">
            {subscription.is_active ? "Cancelar" : "Reactivar"}
          </button>
          <button type="button" onClick={() => onEdit(subscription)} className="focus-ring font-medium hover:text-slate-600 dark:hover:text-slate-300">
            Editar
          </button>
          <button type="button" onClick={() => onDelete(subscription)} className="focus-ring font-medium hover:text-red-600 dark:hover:text-red-400">
            Eliminar
          </button>
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {formatCurrency(subscription.price, subscription.currency)}
      </span>
    </li>
  )
}
