import { type InputHTMLAttributes, forwardRef, useId } from "react"

import { cn } from "@/utils/cn"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, required, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "focus-ring h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100",
            error ? "border-red-400 dark:border-red-500" : "border-slate-300 dark:border-slate-700",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-sm text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)
Input.displayName = "Input"
