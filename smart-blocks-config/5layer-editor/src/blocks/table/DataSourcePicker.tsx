import { Fragment, type ReactNode } from 'react'
import { Database, Check } from 'lucide-react'
import type { DataSource } from './workflows'
import { DATA_SOURCES } from './workflows'

// Pick a data source / connector. `renderScope` (if given) shows under the selected one —
// e.g. a folder/files scope picker.
export function DataSourcePicker({
  selectedId,
  onSelect,
  renderScope,
}: {
  selectedId?: string
  onSelect: (s: DataSource) => void
  renderScope?: ReactNode
}) {
  return (
    <div className="wf-picker">
      <div className="wf-picker-label">Connect a data source — we'll pull rows from it:</div>
      {DATA_SOURCES.map((s) => {
        const on = s.id === selectedId
        return (
          <Fragment key={s.id}>
            <button type="button" className={`wf-row${on ? ' on' : ''}`} onClick={() => onSelect(s)}>
              <span className={`wf-check${on ? ' on' : ''}`}>{on && <Check size={12} strokeWidth={3} />}</span>
              <span className="wf-ico">
                <Database size={15} />
              </span>
              <span className="wf-text">
                <span className="wf-name">{s.name}</span>
                <span className="wf-out">{s.detail}</span>
              </span>
              <span className="wf-connect">{on ? 'Connected' : 'Connect'}</span>
            </button>
            {on && renderScope}
          </Fragment>
        )
      })}
    </div>
  )
}
