import { ArrowRight, ArrowLeft, FileText, Workflow, Database } from 'lucide-react'
import type { TableState, TableColumn, TableRow } from './types'
import type { WorkflowCopy } from './workflows'
import { Dropzone } from './Dropzone'
import { TableView } from './TableView'

export interface BoundSource {
  label: string
  dataSource?: boolean
}

// Step 2 — uploads (or another workflow / data source) fill the table's ROWS.
export interface FiveView {
  columns: TableColumn[]
  rows: TableRow[]
  compact?: boolean
  striped?: boolean
  searchable?: boolean
  query: string
  onQuery: (v: string) => void
  rowActions?: Array<{ id: string; label: string }>
  total: number
}

export function TableStep2({
  state,
  copy,
  selectedIds,
  boundSource,
  five,
  onScore,
  onAddMore,
  onToggle,
  onSend,
  onBack,
}: {
  state: TableState
  copy: WorkflowCopy
  selectedIds: string[]
  boundSource?: BoundSource
  five?: FiveView
  onScore: () => void
  onAddMore: () => void
  onToggle: (id: string) => void
  onSend: () => void
  onBack: () => void
}) {
  if (!state.rowsFileCount) {
    return (
      <div>
        <h2 className="section-title">{copy.step2Title}</h2>
        <p className="section-sub">
          {boundSource ? `${copy.itemColumn}s come from ${boundSource.label.replace(/^(Data source|Workflow): /, '')} — each entry becomes a row.` : copy.step2Sub}
        </p>
        {boundSource ? (
          <div className="file-chip">
            <span className="file-ico">
              {boundSource.dataSource ? <Database size={16} /> : <Workflow size={16} />}
            </span>
            <span className="file-name">
              <strong>{boundSource.dataSource ? 'Connected to' : 'Pulling from'} {boundSource.label.replace(/^(Data source|Workflow): /, '')}</strong>
              <br />
              <span className="muted" style={{ fontSize: 13 }}>Each entry becomes a row</span>
            </span>
            <button className="btn ghost">Change source</button>
          </div>
        ) : (
          <Dropzone title={copy.uploadTitle} subtitle={copy.uploadSub} onUpload={onScore} />
        )}
        <div className="btn-row">
          <button className="btn ghost" onClick={onBack}>
            <ArrowLeft size={15} /> Back
          </button>
          <button className="btn primary" onClick={onScore}>
            {boundSource ? `Pull ${copy.itemNoun}` : copy.scoreCta} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="field-label">
        {copy.itemColumn}s <span className="req">*</span>
      </label>
      <div className="file-chip">
        <span className="file-ico">
          <FileText size={16} />
        </span>
        <span className="file-name">
          <strong>{copy.uploadedLabel}</strong>
          <br />
          <span className="muted" style={{ fontSize: 13 }}>PDF, DOCX</span>
        </span>
        <button className="btn ghost" onClick={onAddMore}>
          Add more
        </button>
      </div>

      {five ? (
        <>
          {five.searchable && (
            <input
              className="fl-search"
              placeholder="Search candidates…"
              value={five.query}
              onChange={(e) => five.onQuery(e.target.value)}
            />
          )}
          <TableView
            columns={five.columns}
            rows={five.rows}
            itemColumn={copy.itemColumn}
            selectable
            selectedIds={selectedIds}
            onToggle={onToggle}
            compact={five.compact}
            striped={five.striped}
            rowActions={five.rowActions}
          />
          <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
            Showing {five.rows.length} of {five.total}
            {` · ${selectedIds.length} shortlisted`}
          </div>
        </>
      ) : (
        <TableView columns={state.columns} rows={state.rows} itemColumn={copy.itemColumn} selectable selectedIds={selectedIds} onToggle={onToggle} />
      )}

      <div className="btn-row">
        <button className="btn ghost" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </button>
        <button className="btn primary" disabled={selectedIds.length === 0} onClick={onSend}>
          {copy.sendCta} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
