import { Plus, ShoppingCart, Trash2 } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"

import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Input } from "@/components/ui/Input"
import { Skeleton } from "@/components/ui/Skeleton"
import { useHouseholds } from "@/hooks/useHouseholds"
import { ShoppingItemRow } from "@/pages/shopping/ShoppingItemRow"
import { ShoppingListFormModal } from "@/pages/shopping/ShoppingListFormModal"
import { ShoppingSuggestions } from "@/pages/shopping/ShoppingSuggestions"
import { extractErrorMessage } from "@/services/api"
import { shoppingService } from "@/services/shoppingService"
import { useAuthStore } from "@/store/authStore"
import { toast } from "@/store/toastStore"
import type { ShoppingItem, ShoppingList, ShoppingListPayload, ShoppingSuggestion } from "@/types/shopping"

export function ShoppingPage() {
  const currentUser = useAuthStore((state) => state.user)
  const { households } = useHouseholds()

  const [lists, setLists] = useState<ShoppingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ShoppingSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newItemName, setNewItemName] = useState("")
  const [isAddingItem, setIsAddingItem] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeletingList, setIsDeletingList] = useState(false)

  async function loadLists() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await shoppingService.listLists()
      setLists(data)
      setSelectedListId((current) => current ?? data[0]?.id ?? null)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos cargar tus listas de compras."))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadSuggestions() {
    try {
      setSuggestions(await shoppingService.suggestions())
    } catch {
      setSuggestions([])
    }
  }

  useEffect(() => {
    void loadLists()
    void loadSuggestions()
  }, [])

  const selectedList = lists.find((list) => list.id === selectedListId) ?? null
  const household = selectedList?.household_id
    ? households.find((item) => item.id === selectedList.household_id)
    : null
  const canManageList = selectedList !== null && currentUser !== null && selectedList.user_id === currentUser.id

  async function handleCreateList(payload: ShoppingListPayload) {
    const created = await shoppingService.createList(payload)
    toast.success("Lista creada.")
    await loadLists()
    setSelectedListId(created.id)
  }

  async function handleDeleteList() {
    if (!selectedList) return
    setIsDeletingList(true)
    try {
      await shoppingService.removeList(selectedList.id)
      setSelectedListId(null)
      setIsDeleteConfirmOpen(false)
      toast.success("Lista eliminada.")
      await loadLists()
    } catch (err) {
      toast.error(extractErrorMessage(err, "No pudimos eliminar la lista."))
    } finally {
      setIsDeletingList(false)
    }
  }

  async function handleAddItem(event: FormEvent) {
    event.preventDefault()
    if (!selectedList || !newItemName.trim()) return
    setIsAddingItem(true)
    try {
      await shoppingService.addItem(selectedList.id, { name: newItemName.trim() })
      setNewItemName("")
      await loadLists()
    } catch (err) {
      toast.error(extractErrorMessage(err, "No pudimos agregar el ítem."))
    } finally {
      setIsAddingItem(false)
    }
  }

  async function handleAddSuggestion(itemName: string) {
    if (!selectedList) return
    await shoppingService.addItem(selectedList.id, { name: itemName })
    await loadLists()
  }

  async function handleToggleItem(item: ShoppingItem) {
    if (!selectedList) return
    await shoppingService.updateItem(selectedList.id, item.id, { is_purchased: !item.is_purchased })
    await Promise.all([loadLists(), loadSuggestions()])
  }

  async function handleDeleteItem(item: ShoppingItem) {
    if (!selectedList) return
    await shoppingService.removeItem(selectedList.id, item.id)
    await loadLists()
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Compras</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Listas personales y compartidas con tu hogar.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva lista
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : lists.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-5 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-950/60 dark:text-brand-300">
            <ShoppingCart className="size-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Todavía no tenés listas</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Creá tu primera lista de compras para empezar.</p>
        </Card>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => setSelectedListId(list.id)}
                className={`focus-ring shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedListId === list.id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {list.name}
              </button>
            ))}
          </div>

          <ShoppingSuggestions suggestions={suggestions} onAdd={(name) => void handleAddSuggestion(name)} />

          {selectedList && (
            <Card className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedList.name}</h2>
                  {household && <Badge tone="violet">{household.name}</Badge>}
                </div>
                {canManageList && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="focus-ring flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Eliminar lista
                  </button>
                )}
              </div>

              <form onSubmit={handleAddItem} className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="Agregar ítem"
                    placeholder="Ej: Leche"
                    value={newItemName}
                    onChange={(event) => setNewItemName(event.target.value)}
                  />
                </div>
                <Button type="submit" isLoading={isAddingItem}>
                  Agregar
                </Button>
              </form>

              {selectedList.items.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  Esta lista todavía no tiene ítems.
                </p>
              ) : (
                <ul>
                  {selectedList.items.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      onToggle={(target) => void handleToggleItem(target)}
                      onDelete={(target) => void handleDeleteItem(target)}
                    />
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}

      <ShoppingListFormModal
        isOpen={isFormOpen}
        households={households}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateList}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Eliminar lista"
        description={`¿Seguro que querés eliminar "${selectedList?.name}"? Esta acción no se puede deshacer.`}
        isConfirming={isDeletingList}
        onConfirm={handleDeleteList}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  )
}
