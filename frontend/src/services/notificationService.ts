import { api } from "@/services/api"
import type { Notification } from "@/types/notification"

export const notificationService = {
  async list(params?: { unread_only?: boolean; limit?: number }): Promise<Notification[]> {
    const { data } = await api.get<Notification[]>("/notifications", { params })
    return data
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>("/notifications/unread-count")
    return data.count
  },

  async markRead(id: string): Promise<Notification> {
    const { data } = await api.patch<Notification>(`/notifications/${id}/read`)
    return data
  },

  async markAllRead(): Promise<number> {
    const { data } = await api.post<{ updated: number }>("/notifications/read-all")
    return data.updated
  },
}
