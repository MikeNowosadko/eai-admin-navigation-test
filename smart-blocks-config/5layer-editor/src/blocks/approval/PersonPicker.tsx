import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { PersonRef } from './types'
import { MEMBERS } from '../../fixtures'
import { Avatar, initialsOf } from './ui'

// Member directory + invite-by-email (the growth vector). Permissions kept open for v0.
export function PersonPicker({
  constrainRole,
  onPick,
  onClose,
  onInvite,
}: {
  constrainRole?: string
  onPick: (p: PersonRef) => void
  onClose: () => void
  onInvite: (p: PersonRef) => void
}) {
  const [q, setQ] = useState('')
  const candidates = useMemo(() => {
    const pool = constrainRole ? MEMBERS.filter((m) => m.role === constrainRole) : MEMBERS
    if (!q.trim()) return pool
    return pool.filter(
      (m) => m.name.toLowerCase().includes(q.toLowerCase()) || m.email?.toLowerCase().includes(q.toLowerCase()),
    )
  }, [q, constrainRole])

  const looksLikeEmail = /\S+@\S+\.\S+/.test(q.trim())
  const noExactMatch = !candidates.some((c) => c.email?.toLowerCase() === q.trim().toLowerCase())

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={onClose} />
      <div className="picker-menu">
        <input
          className="picker-search"
          autoFocus
          placeholder={constrainRole ? `Search ${constrainRole}s…` : 'Search people or type an email…'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {candidates.map((m, i) => (
          <button key={m.id} className="picker-item" onClick={() => onPick(m)}>
            <Avatar person={m} i={i} sm />
            <span>{m.name}</span>
            <span className="role-mini">{m.role}</span>
          </button>
        ))}
        {candidates.length === 0 && !looksLikeEmail && (
          <div className="picker-item muted" style={{ cursor: 'default' }}>
            No matches — type an email to invite
          </div>
        )}
        {looksLikeEmail && noExactMatch && (
          <button
            className="picker-item picker-invite"
            onClick={() => {
              const email = q.trim()
              const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              onInvite({ id: `invited-${email}`, name, email, initials: initialsOf(name) })
            }}
          >
            <UserPlus size={16} />
            <span>Invite {q.trim()}</span>
          </button>
        )}
      </div>
    </>
  )
}
