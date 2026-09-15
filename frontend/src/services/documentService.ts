import { api } from "@/services/api"
import type { Document, DocumentCategory, DocumentPayload } from "@/types/document"

export const documentService = {
  async list(params?: { category?: DocumentCategory; expiring_within_days?: number }): Promise<Document[]> {
    const { data } = await api.get<Document[]>("/documents", { params })
    return data
  },

  async create(payload: DocumentPayload): Promise<Document> {
    const { data } = await api.post<Document>("/documents", payload)
    return data
  },

  async update(id: string, payload: Partial<DocumentPayload>): Promise<Document> {
    const { data } = await api.patch<Document>(`/documents/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/documents/${id}`)
  },

  async uploadFile(id: string, file: File): Promise<Document> {
    const formData = new FormData()
    formData.append("file", file)
    const { data } = await api.post<Document>(`/documents/${id}/file`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },

  async removeFile(id: string): Promise<Document> {
    const { data } = await api.delete<Document>(`/documents/${id}/file`)
    return data
  },

  async downloadFile(id: string, fileName: string): Promise<void> {
    const response = await api.get(`/documents/${id}/file`, { responseType: "blob" })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = window.document.createElement("a")
    link.href = url
    link.download = fileName
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
