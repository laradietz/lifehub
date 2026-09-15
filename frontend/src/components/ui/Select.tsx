import { type ReactNode, type SelectHTMLAttributes, forwardRef, useId } from "react"

import { cn } from "@/utils/cn"

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, id, required, children, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id ?? generatedId

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={cn(
            "focus-ring h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {hint && <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
    )
  },
)
Select.displayName = "Select"
