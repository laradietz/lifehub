import { Card } from "@/components/ui/Card"
import type { ShoppingSuggestion } from "@/types/shopping"

interface ShoppingSuggestionsProps {
  suggestions: ShoppingSuggestion[]
  onAdd: (itemName: string) => void
}

export function ShoppingSuggestions({ suggestions, onAdd }: ShoppingSuggestionsProps) {
  const highlighted = suggestions.filter((suggestion) => suggestion.suggested)
  if (highlighted.length === 0) return null

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quizás necesites comprar</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Según tu historial de compras — es solo una sugerencia, no una certeza.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {highlighted.map((suggestion) => (
          <li key={suggestion.item_name} className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-700 dark:text-slate-200">{suggestion.item_name}</span>
            <button
              type="button"
              onClick={() => onAdd(suggestion.item_name)}
              className="focus-ring text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              + Agregar a la lista
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
