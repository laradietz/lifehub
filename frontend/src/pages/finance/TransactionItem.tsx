import { Badge } from "@/components/ui/Badge"
import type { Category } from "@/types/category"
import type { Expense, Income } from "@/types/finance"
import { formatCurrency } from "@/utils/currency"
import { PAYMENT_METHOD_LABEL } from "@/utils/financeMeta"
import { formatDate } from "@/utils/taskMeta"

interface TransactionItemProps {
  transaction: Income | Expense
  kind: "income" | "expense"
  categories: Category[]
  onEdit: (transaction: Income | Expense) => void
  onDelete: (transaction: Income | Expense) => void
}

export function TransactionItem({ transaction, kind, categories, onEdit, onDelete }: TransactionItemProps) {
  const category = categories.find((item) => item.id === transaction.category_id)

  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {transaction.description || (category ? category.name : kind === "income" ? "Ingreso" : "Gasto")}
          </p>
          {category && <Badge tone="slate">{category.name}</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span>{formatDate(transaction.date)}</span>
          <span>{PAYMENT_METHOD_LABEL[transaction.payment_method]}</span>
          <button type="button" onClick={() => onEdit(transaction)} className="focus-ring font-medium hover:text-slate-600 dark:hover:text-slate-300">
            Editar
          </button>
          <button type="button" onClick={() => onDelete(transaction)} className="focus-ring font-medium hover:text-red-600 dark:hover:text-red-400">
            Eliminar
          </button>
        </div>
      </div>
      <span className={`shrink-0 text-sm font-semibold ${kind === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
        {kind === "income" ? "+" : "-"}
        {formatCurrency(transaction.amount, transaction.currency)}
      </span>
    </li>
  )
}
