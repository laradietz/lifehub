import { api } from "@/services/api"
import type { Subscription, SubscriptionPayload, SubscriptionSummary } from "@/types/subscription"

export const subscriptionService = {
  async list(params?: { include_inactive?: boolean }): Promise<Subscription[]> {
    const { data } = await api.get<Subscription[]>("/subscriptions", { params })
    return data
  },

  async summary(): Promise<SubscriptionSummary> {
    const { data } = await api.get<SubscriptionSummary>("/subscriptions/summary")
    return data
  },

  async create(payload: SubscriptionPayload): Promise<Subscription> {
    const { data } = await api.post<Subscription>("/subscriptions", payload)
    return data
  },

  async update(id: string, payload: SubscriptionPayload): Promise<Subscription> {
    const { data } = await api.patch<Subscription>(`/subscriptions/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/subscriptions/${id}`)
  },
}
