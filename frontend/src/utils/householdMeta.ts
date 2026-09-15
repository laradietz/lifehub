import type { HouseholdMemberStatus, HouseholdRole } from "@/types/household"

export const ROLE_LABEL: Record<HouseholdRole, string> = {
  owner: "Dueño",
  member: "Miembro",
}

export const STATUS_LABEL: Record<HouseholdMemberStatus, string> = {
  pending: "Pendiente",
  accepted: "Activo",
}

export const STATUS_TONE: Record<HouseholdMemberStatus, "amber" | "green"> = {
  pending: "amber",
  accepted: "green",
}
