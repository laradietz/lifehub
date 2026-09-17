import { Check, Trash2 } from "lucide-react"
import { memo } from "react"

import type { ShoppingItem } from "@/types/shopping"

interface ShoppingItemRowProps {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onDelete: (item: ShoppingItem) => void
}

function ShoppingItemRowComponent({ item, onToggle, onDelete }: ShoppingItemRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-lg border-b border-slate-100 px-2 py-2.5 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.is_purchased}
        aria-label={item.is_purchased ? "Marcar como pendiente" : "Marcar como comprado"}
        onClick={() => onToggle(item)}
        className="focus-ring flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-white transition-colors data-[checked=true]:border-brand-600 data-[checked=true]:bg-brand-600 dark:border-slate-600"
        data-checked={item.is_purchased}
      >
        {item.is_purchased && <Check className="size-3" aria-hidden="true" />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            item.is_purchased ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"
          }`}
        >
          {item.name}
          {item.quantity !== 1 && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">
              {item.quantity}
              {item.unit ? ` ${item.unit}` : ""}
            </span>
          )}
        </p>
        {item.notes && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.notes}</p>}
      </div>

      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label="Eliminar ítem"
        className="focus-ring shrink-0 rounded p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </li>
  )
}

export const ShoppingItemRow = memo(ShoppingItemRowComponent)
