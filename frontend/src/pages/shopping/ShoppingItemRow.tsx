import type { ShoppingItem } from "@/types/shopping"

interface ShoppingItemRowProps {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onDelete: (item: ShoppingItem) => void
}

export function ShoppingItemRow({ item, onToggle, onDelete }: ShoppingItemRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.is_purchased}
        aria-label={item.is_purchased ? "Marcar como pendiente" : "Marcar como comprado"}
        onClick={() => onToggle(item)}
        className="focus-ring flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-white transition-colors data-[checked=true]:border-brand-600 data-[checked=true]:bg-brand-600 dark:border-slate-600"
        data-checked={item.is_purchased}
      >
        {item.is_purchased && (
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true">
            <path d="M13.7 3.7 6 11.4 2.3 7.7 3.7 6.3 6 8.6l6.3-6.3z" />
          </svg>
        )}
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
        className="focus-ring shrink-0 text-xs font-medium text-slate-400 hover:text-red-600 dark:hover:text-red-400"
      >
        Eliminar
      </button>
    </li>
  )
}
