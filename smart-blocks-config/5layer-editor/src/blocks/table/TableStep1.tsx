import { ArrowRight, ArrowLeft, FileText, Workflow, Database } from 'lucide-react'
import type { TableState } from './types'
import type { WorkflowCopy } from './workflows'
import type { BoundSource } from './TableStep2'
import { Dropzone } from './Dropzone'
import { TableView } from './TableView'

// Step 1 — the columns come from the configured source (a rubric upload, or another source).
export function TableStep1({
  state,
  copy,
  boundSource,
  onGenerate,
  onReplace,
  onNext,
  onBack,
}: {
  state: TableState
  copy: WorkflowCopy
  boundSource?: BoundSource
  onGenerate: () => void
  onReplace: () => void
  onNext: () => void
  onBack: () => void
}) {
  if (state.phase === 'empty') {
    return (
      <div>
        <h2 className="section-title">{copy.step1Title}</h2>
        <p className="section-sub">{boundSource ? `The columns come from ${boundSource.label}.` : copy.step1Sub}</p>
        <label className="field-label">
          {copy.rubricLabel} <span className="req">*</span>
        </label>
        {boundSource ? (
          <div className="file-chip">
            <span className="file-ico">
              {boundSource.dataSource ? <Database size={16} /> : <Workflow size={16} />}
            </span>
            <span className="file-name">
              <strong>Columns from {boundSource.label.replace(/^(Data source|Workflow): /, '')}</strong>
              <br />
              <span className="muted" style={{ fontSize: 13 }}>Its criteria become your columns</span>
            </span>
            <button className="btn ghost">Change source</button>
          </div>
        ) : (
          <Dropzone title={copy.rubricDropTitle} subtitle={copy.rubricDropSub} onUpload={onGenerate} />
        )}
        <div className="btn-row">
          <button className="btn ghost" onClick={onBack}>
            <ArrowLeft size={15} /> Back
          </button>
          <button className="btn primary" onClick={onGenerate}>
            Generate table <ArrowRight size={15} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="section-title">Your evaluation table</h2>
      <p className="section-sub">Generated from your {copy.rubricLabel.toLowerCase().replace(/^your /, '')}. Add {copy.itemNoun} next to fill the rows.</p>

      <div className="file-chip">
        <span className="file-ico">
          <FileText size={16} />
        </span>
        <span className="file-name">{state.columnsFile?.name}</span>
        <button className="btn ghost" onClick={onReplace}>
          Replace
        </button>
      </div>

      <TableView columns={state.columns} rows={[]} itemColumn={copy.itemColumn} emptyHint={`Rows fill when you add ${copy.itemNoun} in the next step`} />

      <div className="btn-row">
        <button className="btn ghost" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </button>
        <button className="btn primary" onClick={onNext}>
          Add {copy.itemNoun} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
