import { ArrowRight, ArrowLeft, Workflow, Database, FileText, Lock, RefreshCw } from 'lucide-react'
import type { SourceBinding } from '../table/types'
import { Dropzone } from '../table/Dropzone'

// Step 2 — assets. Reflects the source binding set in the editor: pinned author files
// (read-only), a runtime upload dropzone, or a connected data-source folder.
export function AssetsStep({
  assetsSource,
  onNext,
  onBack,
}: {
  assetsSource: SourceBinding
  onNext: () => void
  onBack: () => void
}) {
  const { kind, provisioning, files = [], scope } = assetsSource
  const authorUpload = kind === 'document-upload' && provisioning === 'author-fixed'
  const runtimeUpload = kind === 'document-upload' && provisioning !== 'author-fixed'
  const isData = kind === 'data-source'
  const cleanLabel = assetsSource.label.replace(/^(Data source|Workflow): /, '')
  const filesLabel = scope ? (scope.files === 'all' ? 'all files' : `${scope.files.length} files`) : ''

  return (
    <div>
      <h2 className="section-title">Add your assets</h2>
      <p className="section-sub">
        {authorUpload && 'These assets are set by the workflow — the same for every run.'}
        {runtimeUpload && 'Upload brand guidelines, product details or past top-performing emails — the copy will draw on them.'}
        {isData && `Assets come from ${scope!.connectorName} › ${scope!.container} — ${filesLabel}${scope!.live ? ', kept up to date' : ''}.`}
        {!authorUpload && !runtimeUpload && !isData && `Assets come from ${cleanLabel}.`}
      </p>

      {authorUpload && (
        <div className="pinned">
          <div className="pinned-head">
            <Lock size={13} /> Using {files.length} assets · set by the workflow
          </div>
          {files.map((f) => (
            <div key={f.id} className="pinned-file">
              <FileText size={14} /> {f.name}
            </div>
          ))}
          <div className="pinned-note">Runtime users can't change these.</div>
        </div>
      )}

      {runtimeUpload && <Dropzone title="Drag assets here, or browse" subtitle="PDF, DOCX, images · upload as many as you like" onUpload={onNext} />}

      {isData && (
        <div className="file-chip">
          <span className="file-ico">
            <Database size={16} />
          </span>
          <span className="file-name">
            <strong>Connected to {scope!.connectorName} › {scope!.container}</strong>
            <br />
            <span className="muted" style={{ fontSize: 13 }}>
              {filesLabel}
              {scope!.live ? ' · always current' : ' · snapshot'}
            </span>
          </span>
          {scope!.live && (
            <span className="live-pill">
              <RefreshCw size={12} /> Live
            </span>
          )}
        </div>
      )}

      {!authorUpload && !runtimeUpload && !isData && (
        <div className="file-chip">
          <span className="file-ico">
            <Workflow size={16} />
          </span>
          <span className="file-name">
            <strong>Pulling from {cleanLabel}</strong>
          </span>
        </div>
      )}

      <div className="btn-row">
        <button className="btn ghost" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </button>
        <button className="btn primary" onClick={onNext}>
          Compose email <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
