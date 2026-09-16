import { api } from "@/services/api"
import type { Event, EventPayload } from "@/types/event"

export const eventService = {
  async list(params?: { start_after?: string; start_before?: string; household_id?: string }): Promise<Event[]> {
    const { data } = await api.get<Event[]>("/events", { params })
    return data
  },

  async create(payload: EventPayload): Promise<Event> {
    const { data } = await api.post<Event>("/events", payload)
    return data
  },

  async update(id: string, payload: EventPayload): Promise<Event> {
    const { data } = await api.patch<Event>(`/events/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/events/${id}`)
  },
}
