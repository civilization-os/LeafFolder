import { useState, useEffect } from 'react'
import { useI18n } from '../locales/I18nContext'

interface Props {
  onSelect: (drive: string) => void
  onSkip: () => void
}

export default function DrivePickerDialog({ onSelect, onSkip }: Props) {
  const { t } = useI18n()
  const [drives, setDrives] = useState<{ letter: string; size: number }[]>([])
  const [selected, setSelected] = useState('')
  const [customDrive, setCustomDrive] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    window.api.getAvailableDrives().then(list => {
      setDrives(list)
      if (list.length > 0) {
        setSelected(list[0].letter)
      } else {
        setShowCustom(true)
      }
    })
  }, [])

  const formatSize = (bytes: number) => {
    if (bytes <= 0) return ''
    const gb = bytes / 1024 / 1024 / 1024
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    return `${(bytes / 1024 / 1024).toFixed(0)} MB`
  }

  const handleConfirm = () => {
    const drive = showCustom ? customDrive.replace(':', '').toUpperCase() + ':' : selected
    if (/^[A-Z]:$/.test(drive)) onSelect(drive)
  }

  return (
    <div className="dialog-overlay">
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>💾</div>
        <div className="dialog-title" style={{ marginBottom: 8 }}>{t('drive_picker.title')}</div>
        <div className="text-secondary" style={{ fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
          {t('drive_picker.description')}
        </div>

        {showCustom ? (
          <div style={{ marginBottom: 20 }}>
            <div className="text-secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              未检测到盘符，请手动输入：
            </div>
            <input
              value={customDrive}
              onChange={e => setCustomDrive(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              placeholder="D"
              style={{ width: 80, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
              maxLength={1}
              autoFocus
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {drives.map(d => (
              <button
                key={d.letter}
                onClick={() => setSelected(d.letter)}
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 'var(--radius-md)', border: `1px solid ${selected === d.letter ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected === d.letter ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', width: 32 }}>
                  {d.letter.replace(':', '')}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t('drive_picker.drive', { letter: d.letter.replace(':', '') })}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatSize(d.size)}</div>
                </div>
                {selected === d.letter && (
                  <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onSkip} type="button">{t('drive_picker.skip')}</button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={showCustom ? !/^[A-Z]$/i.test(customDrive) : !selected}
            type="button"
          >
            {t('dialog.select')}
          </button>
        </div>
      </div>
    </div>
  )
}
