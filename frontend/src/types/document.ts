export type DocumentCategory = "id" | "passport" | "license" | "insurance" | "warranty" | "contract" | "invoice" | "other"

export interface Document {
  id: string
  name: string
  category: DocumentCategory
  expiry_date: string | null
  notes: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  created_at: string
  updated_at: string
}

export interface DocumentPayload {
  name: string
  category: DocumentCategory
  expiry_date: string | null
  notes: string | null
}
