import { useState, useEffect } from 'react'
import { useI18n } from '../locales/I18nContext'

interface Props {
  title?: string
  showSearch?: boolean
  searchQuery?: string
  onSearchChange?: (q: string) => void
}

export default function TitleBar({ title, showSearch, searchQuery = '', onSearchChange }: Props) {
  const { t } = useI18n()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.isMaximized().then(setIsMaximized)
    const cleanup = window.api.onMaximizedChanged(setIsMaximized)
    return cleanup
  }, [])

  const handleMinimize = () => window.api.minimizeWindow()
  const handleMaximize = () => window.api.maximizeWindow()
  const handleClose = () => window.api.closeWindow()

  return (
    <div className="titlebar">
      {/* Left: brand + context */}
      <div className="titlebar-left">
        <div className="titlebar-brand">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4a2 2 0 012-2h2.586a1 1 0 01.707.293L8.707 3.707A1 1 0 009.414 4H12a2 2 0 012 2v5a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" fill="currentColor" />
          </svg>
          <span>LeafFolder</span>
        </div>
        {title && (
          <>
            <span className="titlebar-sep" />
            <span className="titlebar-context">{title}</span>
          </>
        )}
      </div>

      {/* Right: search + window controls */}
      <div className="titlebar-right">
        {showSearch && (
          <div className="titlebar-search">
            <input
              placeholder={t('folder.search')}
              value={searchQuery}
              onChange={e => onSearchChange?.(e.target.value)}
            />
          </div>
        )}
        <div className="titlebar-controls">
          <button className="titlebar-btn" onClick={handleMinimize} aria-label="Minimize">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
            </svg>
          </button>
          <button className="titlebar-btn" onClick={handleMaximize} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="1.5" y="3" width="5.5" height="5.5" rx="0.8" fill="none" stroke="currentColor" strokeWidth="1.1"/>
                <rect x="3" y="1.5" width="5.5" height="5.5" rx="0.8" fill="var(--bg-primary)" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="1" y="1" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
            )}
          </button>
          <button className="titlebar-btn titlebar-close" onClick={handleClose} aria-label="Close">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
