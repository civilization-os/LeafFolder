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
        <span className="dialog-icon">💾</span>
        <div className="dialog-title" style={{ marginBottom: 8 }}>{t('drive_picker.title')}</div>
        <div className="dialog-body">
          {t('drive_picker.description')}
        </div>

        {showCustom ? (
          <div className="mb-4">
            <div className="text-secondary mb-2 text-sm">
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
          <div className="drive-list">
            {drives.map(d => (
              <button
                key={d.letter}
                onClick={() => setSelected(d.letter)}
                type="button"
                className={`drive-item ${selected === d.letter ? 'selected' : ''}`}
              >
                <span className="drive-letter">
                  {d.letter.replace(':', '')}
                </span>
                <div className="drive-info">
                  <div className="drive-info-name">{t('drive_picker.drive', { letter: d.letter.replace(':', '') })}</div>
                  <div className="drive-info-size">{formatSize(d.size)}</div>
                </div>
                {selected === d.letter && (
                  <span className="drive-check">✓</span>
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
