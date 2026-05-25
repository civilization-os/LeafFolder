import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
        <div className="dialog-title" style={{ fontSize: 15, marginBottom: 8 }}>{title}</div>
        <div className="text-secondary" style={{ fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
          {message}
        </div>
        <div className="dialog-actions" style={{ justifyContent: 'center' }}>
          {cancelLabel !== undefined && (
            <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel || '取消'}</button>
          )}
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel || '确定'}
          </button>
        </div>
      </div>
    </div>
  )
}
