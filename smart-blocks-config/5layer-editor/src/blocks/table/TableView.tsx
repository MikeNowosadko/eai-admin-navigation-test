import { Check, Info } from 'lucide-react'
import type { TableColumn, TableRow } from './types'

// The evaluation table: a Candidate column + the rubric-derived score columns (+ Total).
export function TableView({
  columns,
  rows,
  itemColumn = 'Candidate',
  selectable,
  selectedIds,
  onToggle,
  emptyHint,
  compact,
  striped,
  rowActions,
}: {
  columns: TableColumn[]
  rows: TableRow[]
  itemColumn?: string
  selectable?: boolean
  selectedIds?: string[]
  onToggle?: (id: string) => void
  emptyHint?: string
  compact?: boolean
  striped?: boolean
  rowActions?: Array<{ id: string; label: string }>
}) {
  const isEmpty = rows.length === 0
  const hasActions = (rowActions?.length ?? 0) > 0
  return (
    <table className={`dtable${compact ? ' compact' : ''}${striped ? ' striped' : ''}`}>
      <thead>
        <tr>
          {selectable && <th style={{ width: 34 }}></th>}
          <th>{itemColumn}</th>
          {columns.map((c) => (
            <th key={c.key} className="num">
              {c.label}
            </th>
          ))}
          {hasActions && <th></th>}
        </tr>
      </thead>
      <tbody>
        {isEmpty ? (
          <>
            {[0, 1].map((i) => (
              <tr key={i} className="skeleton-row">
                <td>
                  <span className="sk-avatar" />
                  <span className="sk-bar" />
                </td>
                {columns.map((c) => (
                  <td key={c.key} className="num muted">
                    —
                  </td>
                ))}
              </tr>
            ))}
            {emptyHint && (
              <tr>
                <td colSpan={columns.length + 1} className="empty-hint">
                  <Info size={14} /> {emptyHint}
                </td>
              </tr>
            )}
          </>
        ) : (
          rows.map((r) => {
            const on = selectedIds?.includes(r.id)
            return (
              <tr key={r.id} className={on ? 'selected' : ''}>
                {selectable && (
                  <td>
                    <div className={`check${on ? ' on' : ''}`} onClick={() => onToggle?.(r.id)}>
                      {on && <Check size={13} />}
                    </div>
                  </td>
                )}
                <td>
                  <span className="reviewer-cell">
                    <span className={`avatar a${(r.label.charCodeAt(0) + 1) % 4}`} style={{ width: 26, height: 26, fontSize: 11 }}>
                      {r.initials}
                    </span>
                    <strong style={{ fontWeight: 600 }}>{r.label}</strong>
                  </span>
                </td>
                {columns.map((c) => (
                  <td key={c.key} className={`num${c.type === 'total' ? ' total' : ''}`}>
                    {String(r.cells[c.key] ?? '—')}
                  </td>
                ))}
                {hasActions && (
                  <td className="num">
                    {rowActions!.map((a) => (
                      <button key={a.id} className="rowaction">{a.label}</button>
                    ))}
                  </td>
                )}
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
