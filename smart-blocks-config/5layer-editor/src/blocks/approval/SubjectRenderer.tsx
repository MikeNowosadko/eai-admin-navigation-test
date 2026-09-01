import type { ResolvedSubject } from './types'
import { AvatarStack } from './ui'
import { initialsOf } from './ui'

// The subject has two renderings: a compact chip and a full table.

export function SubjectChip({
  subject,
  onClick,
}: {
  subject: ResolvedSubject
  onClick?: () => void
}) {
  const people = subject.items.slice(0, 4).map((it) => ({ name: it.label, initials: initialsOf(it.label) }))
  return (
    <div className={`subject-chip${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <AvatarStack people={people} />
      <span className="txt">{subject.summary}</span>
    </div>
  )
}

// Read-only full table (verdict / per-item views, or when not selecting).
export function SubjectTable({ subject }: { subject: ResolvedSubject }) {
  return (
    <table className="ctable">
      <thead>
        <tr>
          {subject.columns.map((c) => (
            <th key={c.key}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {subject.items.map((it) => (
          <tr key={it.id}>
            {subject.columns.map((c) => (
              <td key={c.key}>{String(it.fields[c.key] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
