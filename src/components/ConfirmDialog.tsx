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
        <span className="dialog-icon">⚠️</span>
        <div className="dialog-title" style={{ fontSize: 15, marginBottom: 8 }}>{title}</div>
        <div className="dialog-body" style={{ marginBottom: 20 }}>
          {message}
        </div>
        <div className="dialog-actions" style={{ justifyContent: 'center' }}>
          {cancelLabel !== undefined && (
            <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel || 'Cancel'}</button>
          )}
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
