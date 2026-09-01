import { Check, RefreshCw } from 'lucide-react'
import { DATA_SOURCE_FOLDERS } from '../table/workflows'

// After a connector is picked — scope it to a specific folder + files, pinned & kept live.
export function DataSourceScopePicker({
  folderId,
  fileIds,
  live,
  onFolder,
  onToggleFile,
  onLive,
}: {
  folderId: string
  fileIds: string[]
  live: boolean
  onFolder: (id: string) => void
  onToggleFile: (id: string) => void
  onLive: (v: boolean) => void
}) {
  const folder = DATA_SOURCE_FOLDERS.find((f) => f.id === folderId) ?? DATA_SOURCE_FOLDERS[0]
  return (
    <div className="scope">
      <div className="scope-label">Which folder?</div>
      <select className="select-sm" value={folder.id} onChange={(e) => onFolder(e.target.value)} style={{ width: '100%' }}>
        {DATA_SOURCE_FOLDERS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.path}
          </option>
        ))}
      </select>

      <div className="scope-label" style={{ marginTop: 10 }}>
        Which files? <span className="muted">({fileIds.length}/{folder.files.length})</span>
      </div>
      <div className="scope-files">
        {folder.files.map((file) => {
          const on = fileIds.includes(file.id)
          return (
            <button key={file.id} type="button" className={`scope-file${on ? ' on' : ''}`} onClick={() => onToggleFile(file.id)}>
              <span className={`clarify-ind multi${on ? '' : ''}`} style={on ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: '#fff' } : undefined}>
                {on && <Check size={10} strokeWidth={3} />}
              </span>
              {file.name}
            </button>
          )
        })}
      </div>

      <label className="toggle" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={live} onChange={(e) => onLive(e.target.checked)} />
        <RefreshCw size={13} /> Keep up to date automatically
      </label>
    </div>
  )
}
