import { Search, X } from "lucide-react"
import type { InputHTMLAttributes } from "react"

import { cn } from "@/utils/cn"

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({ value, onChange, className, placeholder = "Buscar...", ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="focus-ring h-10 w-full rounded-lg border border-slate-300 bg-white pr-9 pl-9 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange("")}
          className="focus-ring absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
