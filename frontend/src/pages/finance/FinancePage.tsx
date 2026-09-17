import { ArrowDownAZ, ArrowUpAZ, Plus, Receipt, Wallet } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { ExpenseCategoryChart } from "@/components/charts/ExpenseCategoryChart"
import { IncomeExpenseTrendChart } from "@/components/charts/IncomeExpenseTrendChart"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SearchInput } from "@/components/ui/SearchInput"
import { Skeleton } from "@/components/ui/Skeleton"
import { useCategories } from "@/hooks/useCategories"
import { expenseService } from "@/services/expenseService"
import { financeService } from "@/services/financeService"
import { extractErrorMessage } from "@/services/api"
import { incomeService } from "@/services/incomeService"
import { TransactionFormModal } from "@/pages/finance/TransactionFormModal"
import { TransactionItem } from "@/pages/finance/TransactionItem"
import { toast } from "@/store/toastStore"
import type { Expense, FinanceSummary, Income, TransactionPayload } from "@/types/finance"
import { formatCompactCurrency, formatCurrency } from "@/utils/currency"

type Kind = "income" | "expense"
type SortKey = "date" | "amount"

function StatTile({
  label,
  value,
  fullValue,
  tone,
}: {
  label: string
  value: string
  fullValue: string
  tone?: "positive" | "negative" | "default"
}) {
  return (
    <div className="flex flex-col gap-1 overflow-hidden rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800/60">
      <span
        title={fullValue}
        className={`truncate text-lg font-bold ${
          tone === "positive"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "negative"
              ? "text-red-600 dark:text-red-400"
              : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  )
}

export function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [kind, setKind] = useState<Kind>("expense")
  const [incomes, setIncomes] = useState<Income[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortAsc, setSortAsc] = useState(false)

  const expenseCategories = useCategories("expense")
  const incomeCategories = useCategories("income")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Income | Expense | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<Income | Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function loadSummary() {
    setIsLoadingSummary(true)
    setSummaryError(null)
    try {
      setSummary(await financeService.summary())
    } catch (err) {
      setSummaryError(extractErrorMessage(err, "No pudimos cargar el resumen financiero."))
    } finally {
      setIsLoadingSummary(false)
    }
  }

  async function loadLists() {
    setIsLoadingList(true)
    setListError(null)
    try {
      const [incomeData, expenseData] = await Promise.all([incomeService.list(), expenseService.list()])
      setIncomes(incomeData)
      setExpenses(expenseData)
    } catch (err) {
      setListError(extractErrorMessage(err, "No pudimos cargar tus movimientos."))
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    void loadSummary()
    void loadLists()
  }, [])

  async function handleSubmit(payload: TransactionPayload) {
    const isEditing = Boolean(editingTransaction)
    if (kind === "income") {
      if (editingTransaction) {
        await incomeService.update(editingTransaction.id, payload)
      } else {
        await incomeService.create(payload)
      }
    } else {
      if (editingTransaction) {
        await expenseService.update(editingTransaction.id, payload)
      } else {
        await expenseService.create(payload)
      }
    }
    toast.success(
      isEditing
        ? "Movimiento actualizado."
        : kind === "income"
          ? "Ingreso registrado."
          : "Gasto registrado.",
    )
    await Promise.all([loadSummary(), loadLists()])
  }

  async function handleDelete() {
    if (!deletingTransaction) return
    setIsDeleting(true)
    try {
      if (kind === "income") {
        await incomeService.remove(deletingTransaction.id)
      } else {
        await expenseService.remove(deletingTransaction.id)
      }
      setDeletingTransaction(null)
      toast.success("Movimiento eliminado.")
      await Promise.all([loadSummary(), loadLists()])
    } catch (err) {
      toast.error(extractErrorMessage(err, "No pudimos eliminar el movimiento."))
    } finally {
      setIsDeleting(false)
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((current) => !current)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const list = kind === "income" ? incomes : expenses
  const categories = kind === "income" ? incomeCategories.categories : expenseCategories.categories
  const currency = summary?.currency ?? "USD"

  const visibleList = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? list.filter((transaction) => {
          const category = categories.find((item) => item.id === transaction.category_id)
          return (
            transaction.description?.toLowerCase().includes(query) || category?.name.toLowerCase().includes(query)
          )
        })
      : list
    const sorted = [...filtered].sort((a, b) => {
      const diff =
        sortKey === "amount"
          ? Number.parseFloat(a.amount) - Number.parseFloat(b.amount)
          : new Date(a.date).getTime() - new Date(b.date).getTime()
      return sortAsc ? diff : -diff
    })
    return sorted
  }, [list, categories, search, sortKey, sortAsc])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Finanzas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tus ingresos y gastos, mes a mes.</p>
        </div>
        <Button
          onClick={() => {
            setEditingTransaction(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          {kind === "income" ? "Nuevo ingreso" : "Nuevo gasto"}
        </Button>
      </div>

      {isLoadingSummary ? (
        <Skeleton className="h-24 w-full" />
      ) : summaryError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{summaryError}</p>
          <Button variant="secondary" onClick={() => void loadSummary()}>
            Reintentar
          </Button>
        </Card>
      ) : (
        summary && (
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile
                label="Ingresos del mes"
                value={formatCompactCurrency(summary.total_income, currency)}
                fullValue={formatCurrency(summary.total_income, currency)}
                tone="positive"
              />
              <StatTile
                label="Gastos del mes"
                value={formatCompactCurrency(summary.total_expense, currency)}
                fullValue={formatCurrency(summary.total_expense, currency)}
                tone="negative"
              />
              <StatTile
                label="Saldo"
                value={formatCompactCurrency(summary.balance, currency)}
                fullValue={formatCurrency(summary.balance, currency)}
                tone={Number.parseFloat(summary.balance) >= 0 ? "positive" : "negative"}
              />
            </div>
            {summary.top_expense_category && (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Gastaste más en{" "}
                <Badge tone="amber">{summary.top_expense_category.category_name}</Badge>
                {summary.expense_change_pct !== null && (
                  <span className="ml-2">
                    ({summary.expense_change_pct >= 0 ? "+" : ""}
                    {summary.expense_change_pct.toFixed(0)}% vs. mes anterior)
                  </span>
                )}
              </p>
            )}
          </Card>
        )
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Gastos por categoría</h2>
          {isLoadingSummary ? <Skeleton className="h-40 w-full" /> : summary && <ExpenseCategoryChart data={summary.expense_by_category} currency={currency} />}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Evolución (últimos 6 meses)</h2>
          {isLoadingSummary ? <Skeleton className="h-40 w-full" /> : summary && <IncomeExpenseTrendChart data={summary.evolution} currency={currency} />}
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900" style={{ width: "fit-content" }}>
          {(["expense", "income"] as Kind[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              className={`focus-ring rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                kind === option
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {option === "expense" ? "Gastos" : "Ingresos"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleSort("date")}
            className={`focus-ring flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${sortKey === "date" ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900 dark:bg-brand-950/60 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"}`}
          >
            Fecha
            {sortKey === "date" && (sortAsc ? <ArrowUpAZ className="size-3.5" /> : <ArrowDownAZ className="size-3.5" />)}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("amount")}
            className={`focus-ring flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${sortKey === "amount" ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900 dark:bg-brand-950/60 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"}`}
          >
            Monto
            {sortKey === "amount" && (sortAsc ? <ArrowUpAZ className="size-3.5" /> : <ArrowDownAZ className="size-3.5" />)}
          </button>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." className="w-40 sm:w-56" />
        </div>
      </div>

      <Card className="px-5 py-2">
        {isLoadingList ? (
          <div className="flex flex-col gap-4 py-3">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-12 w-full" />
            ))}
          </div>
        ) : listError ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
            <Button variant="secondary" onClick={() => void loadLists()}>
              Reintentar
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-950/60 dark:text-brand-300">
              {kind === "income" ? <Wallet className="size-6" aria-hidden="true" /> : <Receipt className="size-6" aria-hidden="true" />}
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {kind === "income" ? "No registraste ingresos todavía" : "No registraste gastos todavía"}
            </p>
          </div>
        ) : visibleList.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Ningún movimiento coincide con "{search}"</p>
          </div>
        ) : (
          <ul>
            {visibleList.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                kind={kind}
                categories={categories}
                onEdit={(item) => {
                  setEditingTransaction(item)
                  setIsFormOpen(true)
                }}
                onDelete={setDeletingTransaction}
              />
            ))}
          </ul>
        )}
      </Card>

      <TransactionFormModal
        kind={kind}
        isOpen={isFormOpen}
        transaction={editingTransaction}
        defaultCurrency={currency}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingTransaction)}
        title={kind === "income" ? "Eliminar ingreso" : "Eliminar gasto"}
        description="Esta acción no se puede deshacer."
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingTransaction(null)}
      />
    </div>
  )
}
