export type HouseholdRole = "owner" | "member"
export type HouseholdMemberStatus = "pending" | "accepted"

export interface HouseholdMember {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: HouseholdRole
  status: HouseholdMemberStatus
  created_at: string
}

export interface Household {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
  members: HouseholdMember[]
}

export interface HouseholdPayload {
  name?: string
}

export interface InviteMemberPayload {
  email: string
}

export interface PendingInvitation {
  id: string
  household_id: string
  household_name: string
  role: HouseholdRole
  created_at: string
}
