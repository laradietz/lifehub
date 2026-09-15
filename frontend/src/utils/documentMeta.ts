import type { DocumentCategory } from "@/types/document"

export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  id: "DNI",
  passport: "Pasaporte",
  license: "Licencia",
  insurance: "Seguro",
  warranty: "Garantía",
  contract: "Contrato",
  invoice: "Factura",
  other: "Otro",
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
