import { Workflow, Check } from 'lucide-react'
import type { WorkflowRef } from './fixtures'

// Pick another workflow — its OUTPUT becomes this table's input.
// Each workflow entry becomes a row. The list is relevant to the active workflow.
export function WorkflowPicker({
  workflows,
  selectedId,
  onSelect,
}: {
  workflows: WorkflowRef[]
  selectedId?: string
  onSelect: (w: WorkflowRef) => void
}) {
  return (
    <div className="wf-picker">
      <div className="wf-picker-label">Its output becomes this input — each entry is a row:</div>
      {workflows.map((w) => {
        const on = w.id === selectedId
        return (
          <button key={w.id} type="button" className={`wf-row${on ? ' on' : ''}`} onClick={() => onSelect(w)}>
            <span className={`wf-check${on ? ' on' : ''}`}>{on && <Check size={12} strokeWidth={3} />}</span>
            <span className="wf-ico">
              <Workflow size={15} />
            </span>
            <span className="wf-text">
              <span className="wf-name">{w.name}</span>
              <span className="wf-out">
                → {w.entryCount} {w.outputSummary} · via {w.via}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
