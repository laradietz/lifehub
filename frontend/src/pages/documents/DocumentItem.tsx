import { type ChangeEvent, useRef, useState } from "react"

import { Badge } from "@/components/ui/Badge"
import { extractErrorMessage } from "@/services/api"
import { documentService } from "@/services/documentService"
import type { Document } from "@/types/document"
import { daysUntil, formatDate } from "@/utils/taskMeta"
import { DOCUMENT_CATEGORY_LABEL, formatFileSize } from "@/utils/documentMeta"

interface DocumentItemProps {
  document: Document
  onEdit: (document: Document) => void
  onDelete: (document: Document) => void
  onChanged: () => void
}

function expiryLabel(expiryDate: string | null): { text: string; tone: "red" | "amber" | "slate" } | null {
  if (!expiryDate) return null
  const days = daysUntil(expiryDate)
  if (days < 0) return { text: `Venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`, tone: "red" }
  if (days === 0) return { text: "Vence hoy", tone: "red" }
  if (days <= 30) return { text: `Vence en ${days} día${days === 1 ? "" : "s"}`, tone: "amber" }
  return { text: `Vence el ${formatDate(expiryDate)}`, tone: "slate" }
}

export function DocumentItem({ document, onEdit, onDelete, onChanged }: DocumentItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const expiry = expiryLabel(document.expiry_date)

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      await documentService.uploadFile(document.id, file)
      onChanged()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos subir el archivo."))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleRemoveFile() {
    setIsUploading(true)
    setError(null)
    try {
      await documentService.removeFile(document.id)
      onChanged()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos quitar el archivo."))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDownload() {
    if (!document.file_name) return
    try {
      await documentService.downloadFile(document.id, document.file_name)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos descargar el archivo."))
    }
  }

  return (
    <li className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{document.name}</p>
        <Badge tone="slate">{DOCUMENT_CATEGORY_LABEL[document.category]}</Badge>
        {expiry && (
          <span
            className={`text-xs font-medium ${
              expiry.tone === "red"
                ? "text-red-600 dark:text-red-400"
                : expiry.tone === "amber"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {expiry.text}
          </span>
        )}
      </div>

      {document.notes && <p className="text-sm text-slate-500 dark:text-slate-400">{document.notes}</p>}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
        {document.file_name ? (
          <>
            <span className="text-slate-600 dark:text-slate-300">
              📎 {document.file_name}
              {document.file_size !== null && ` (${formatFileSize(document.file_size)})`}
            </span>
            <button type="button" onClick={() => void handleDownload()} className="focus-ring font-medium hover:text-slate-600 dark:hover:text-slate-300">
              Descargar
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => void handleRemoveFile()}
              className="focus-ring font-medium hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
            >
              Quitar archivo
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="focus-ring font-medium hover:text-slate-600 disabled:opacity-50 dark:hover:text-slate-300"
          >
            {isUploading ? "Subiendo…" : "Adjuntar archivo"}
          </button>
        )}
        <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => void handleFileSelected(event)} />

        <button type="button" onClick={() => onEdit(document)} className="focus-ring font-medium hover:text-slate-600 dark:hover:text-slate-300">
          Editar
        </button>
        <button type="button" onClick={() => onDelete(document)} className="focus-ring font-medium hover:text-red-600 dark:hover:text-red-400">
          Eliminar
        </button>
      </div>
    </li>
  )
}
