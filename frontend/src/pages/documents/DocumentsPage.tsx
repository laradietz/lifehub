import { useEffect, useState } from "react"

import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Select } from "@/components/ui/Select"
import { Skeleton } from "@/components/ui/Skeleton"
import { DocumentFormModal } from "@/pages/documents/DocumentFormModal"
import { DocumentItem } from "@/pages/documents/DocumentItem"
import { extractErrorMessage } from "@/services/api"
import { documentService } from "@/services/documentService"
import type { Document, DocumentCategory, DocumentPayload } from "@/types/document"
import { DOCUMENT_CATEGORY_LABEL } from "@/utils/documentMeta"

export function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "">("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function loadDocuments() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await documentService.list(categoryFilter ? { category: categoryFilter } : undefined)
      setDocuments(data)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos cargar tus documentos."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter])

  async function handleCreateOrUpdate(payload: DocumentPayload) {
    if (editingDocument) {
      await documentService.update(editingDocument.id, payload)
    } else {
      await documentService.create(payload)
    }
    await loadDocuments()
  }

  async function handleDelete() {
    if (!deletingDocument) return
    setIsDeleting(true)
    try {
      await documentService.remove(deletingDocument.id)
      setDeletingDocument(null)
      await loadDocuments()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Documentos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            DNI, pasaporte, seguros, garantías y todo lo que necesitás guardar a mano.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDocument(null)
            setIsFormOpen(true)
          }}
        >
          Nuevo documento
        </Button>
      </div>

      <div className="max-w-xs">
        <Select
          label="Filtrar por categoría"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as DocumentCategory | "")}
        >
          <option value="">Todas</option>
          {Object.entries(DOCUMENT_CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <Card className="px-5 py-2">
        {isLoading ? (
          <div className="flex flex-col gap-4 py-3">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="text-2xl">📄</span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No tenés documentos</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Guardá tu DNI, pólizas de seguro o garantías para tenerlos siempre a mano.
            </p>
          </div>
        ) : (
          <ul>
            {documents.map((document) => (
              <DocumentItem
                key={document.id}
                document={document}
                onEdit={(item) => {
                  setEditingDocument(item)
                  setIsFormOpen(true)
                }}
                onDelete={setDeletingDocument}
                onChanged={loadDocuments}
              />
            ))}
          </ul>
        )}
      </Card>

      <DocumentFormModal
        isOpen={isFormOpen}
        document={editingDocument}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingDocument)}
        title="Eliminar documento"
        description={`¿Seguro que querés eliminar "${deletingDocument?.name}"? Esto también borra el archivo adjunto.`}
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingDocument(null)}
      />
    </div>
  )
}
