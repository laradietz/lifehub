import { Badge } from "@/components/ui/Badge"
import type { HouseholdMember } from "@/types/household"
import { ROLE_LABEL, STATUS_LABEL, STATUS_TONE } from "@/utils/householdMeta"

interface MemberRowProps {
  member: HouseholdMember
  currentUserId?: string
  canRemove: boolean
  onRemove: (member: HouseholdMember) => void
}

export function MemberRow({ member, currentUserId, canRemove, onRemove }: MemberRowProps) {
  const isSelf = member.user_id === currentUserId

  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          {(member.full_name ?? member.email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {member.full_name ?? member.email}
            {isSelf && <span className="ml-1 text-xs font-normal text-slate-400">(vos)</span>}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone="slate">{ROLE_LABEL[member.role]}</Badge>
        <Badge tone={STATUS_TONE[member.status]}>{STATUS_LABEL[member.status]}</Badge>
        {canRemove && member.role !== "owner" && (
          <button
            type="button"
            onClick={() => onRemove(member)}
            className="focus-ring text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Quitar
          </button>
        )}
      </div>
    </li>
  )
}
