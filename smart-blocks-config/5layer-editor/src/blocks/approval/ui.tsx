import type { PersonRef, ReviewerStatus } from './types'

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

export function Avatar({ person, i = 0, sm }: { person: PersonRef; i?: number; sm?: boolean }) {
  const cls = `avatar a${i % 4}${sm ? ' sm' : ''}`
  return <span className={cls}>{person.initials ?? initialsOf(person.name)}</span>
}

export function AvatarStack({ people }: { people: PersonRef[] }) {
  return (
    <span className="avatars">
      {people.map((p, i) => (
        <Avatar key={p.id ?? p.name} person={p} i={i} sm />
      ))}
    </span>
  )
}

const STATUS_LABEL: Record<ReviewerStatus, string> = {
  unassigned: '—',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  'changes-requested': 'Changes',
  declined: 'Declined',
}

export function StatusBadge({ status }: { status: ReviewerStatus }) {
  if (status === 'unassigned') return <span className="status none">—</span>
  const cls =
    status === 'approved'
      ? 'approved'
      : status === 'rejected'
        ? 'rejected'
        : status === 'changes-requested'
          ? 'changes-requested'
          : 'pending'
  return <span className={`status ${cls}`}>{STATUS_LABEL[status]}</span>
}
