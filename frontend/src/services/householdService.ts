import { api } from "@/services/api"
import type {
  Household,
  HouseholdMember,
  HouseholdPayload,
  InviteMemberPayload,
  PendingInvitation,
} from "@/types/household"

export const householdService = {
  async list(): Promise<Household[]> {
    const { data } = await api.get<Household[]>("/households")
    return data
  },

  async get(id: string): Promise<Household> {
    const { data } = await api.get<Household>(`/households/${id}`)
    return data
  },

  async create(payload: HouseholdPayload): Promise<Household> {
    const { data } = await api.post<Household>("/households", payload)
    return data
  },

  async update(id: string, payload: HouseholdPayload): Promise<Household> {
    const { data } = await api.patch<Household>(`/households/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/households/${id}`)
  },

  async invite(id: string, payload: InviteMemberPayload): Promise<HouseholdMember> {
    const { data } = await api.post<HouseholdMember>(`/households/${id}/members`, payload)
    return data
  },

  async removeMember(householdId: string, memberId: string): Promise<void> {
    await api.delete(`/households/${householdId}/members/${memberId}`)
  },

  async leave(id: string): Promise<void> {
    await api.post(`/households/${id}/leave`)
  },

  async listPendingInvitations(): Promise<PendingInvitation[]> {
    const { data } = await api.get<PendingInvitation[]>("/households/invitations/pending")
    return data
  },

  async acceptInvitation(memberId: string): Promise<HouseholdMember> {
    const { data } = await api.post<HouseholdMember>(`/households/invitations/${memberId}/accept`)
    return data
  },

  async declineInvitation(memberId: string): Promise<void> {
    await api.post(`/households/invitations/${memberId}/decline`)
  },
}
