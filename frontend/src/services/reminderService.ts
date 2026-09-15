import { api } from "@/services/api"
import type { Reminder, ReminderPayload } from "@/types/reminder"

export const reminderService = {
  async list(params?: { include_completed?: boolean }): Promise<Reminder[]> {
    const { data } = await api.get<Reminder[]>("/reminders", { params })
    return data
  },

  async create(payload: ReminderPayload): Promise<Reminder> {
    const { data } = await api.post<Reminder>("/reminders", payload)
    return data
  },

  async update(id: string, payload: ReminderPayload): Promise<Reminder> {
    const { data } = await api.patch<Reminder>(`/reminders/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/reminders/${id}`)
  },
}
