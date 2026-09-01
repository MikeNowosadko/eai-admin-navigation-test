import { Upload } from 'lucide-react'

export function Dropzone({
  title,
  subtitle,
  onUpload,
}: {
  title: string
  subtitle: string
  onUpload: () => void
}) {
  return (
    <div className="dropzone" onClick={onUpload}>
      <div className="dz-ico">
        <Upload size={22} />
      </div>
      <div className="dz-title">{title}</div>
      <div className="dz-sub">{subtitle}</div>
      <button
        className="btn ghost"
        onClick={(e) => {
          e.stopPropagation()
          onUpload()
        }}
      >
        Browse files
      </button>
    </div>
  )
}
