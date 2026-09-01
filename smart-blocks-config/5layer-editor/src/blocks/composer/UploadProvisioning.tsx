import { Plus, FileText, X } from 'lucide-react'
import type { FileRef, Provisioning } from '../table/types'
import { AUTHOR_UPLOAD_FILES } from './fixtures'

// After "User upload" — decide WHO provides the files: the author (pinned) or the runtime user.
export function UploadProvisioning({
  mode,
  files,
  onMode,
  onAddFiles,
  onRemoveFile,
}: {
  mode: Provisioning
  files: FileRef[]
  onMode: (m: Provisioning) => void
  onAddFiles: (f: FileRef[]) => void
  onRemoveFile: (id: string) => void
}) {
  return (
    <div className="prov">
      <div className="prov-label">Who provides the files?</div>
      <button type="button" className={`prov-opt${mode === 'author-fixed' ? ' on' : ''}`} onClick={() => onMode('author-fixed')}>
        <span className="prov-opt-title">You — same files every time</span>
        <span className="prov-opt-sub">Pinned into the workflow. Every run uses these.</span>
      </button>
      <button type="button" className={`prov-opt${mode === 'runtime' ? ' on' : ''}`} onClick={() => onMode('runtime')}>
        <span className="prov-opt-title">The person running the app</span>
        <span className="prov-opt-sub">They upload their own files on every run.</span>
      </button>

      {mode === 'author-fixed' && (
        <div className="prov-upload">
          {files.length === 0 ? (
            <button type="button" className="btn ghost" onClick={() => onAddFiles(AUTHOR_UPLOAD_FILES)}>
              <Plus size={15} /> Add the permanent files
            </button>
          ) : (
            <div className="prov-files">
              {files.map((f) => (
                <span key={f.id} className="prov-file">
                  <FileText size={13} /> {f.name}
                  <X size={13} className="prov-file-x" onClick={() => onRemoveFile(f.id)} />
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
