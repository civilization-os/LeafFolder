import { useState, useEffect } from 'react'
import type { Workspace, Category } from '../types'
import { useI18n } from '../locales/I18nContext'
import { useConfirm } from '../locales/ConfirmContext'
import type { Lang } from '../locales'

interface Props {
  workspaces: Workspace[]
  activeWorkspaceId: number | null
  activePage: string
  onSelectWorkspace: (id: number) => void
  onSelectWorkspaceAndPage: (id: number, page: 'folders' | 'settings') => void
  onPageChange: (page: 'folders' | 'settings') => void
  onWorkspacesChange: () => void
}

export default function Sidebar({
  workspaces,
  activeWorkspaceId,
  activePage,
  onSelectWorkspace,
  onSelectWorkspaceAndPage,
  onPageChange,
  onWorkspacesChange,
}: Props) {
  const { t, lang, setLang } = useI18n()
  const { confirm } = useConfirm()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')
  const [categoriesByWs, setCategoriesByWs] = useState<Record<number, Category[]>>({})

  useEffect(() => {
    Promise.all(workspaces.map(ws =>
      window.api.getCategories(ws.id).then(cats => ({ wsId: ws.id, cats }))
    )).then(results => {
      const map: Record<number, Category[]> = {}
      for (const { wsId, cats } of results) map[wsId] = cats
      setCategoriesByWs(map)
    })
  }, [workspaces])

  const handleCreate = async () => {
    if (!newName.trim()) return
    let dirPath = newPath.trim()
    if (!dirPath) {
      let drive = await window.api.getSetting('default_drive')
      if (!drive) {
        drive = await window.api.detectDefaultDrive()
        if (drive) await window.api.setSetting('default_drive', drive)
      }
      dirPath = drive ? `${drive}\\.profile\\workspace\\${newName.trim()}` : `C:\\.profile\\workspace\\${newName.trim()}`
      setNewPath(dirPath)
    }
    const ws = await window.api.createWorkspace(newName.trim(), dirPath)
    setShowNew(false)
    setNewName('')
    setNewPath('')
    onWorkspacesChange()
    onSelectWorkspace(ws.id as unknown as number)
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await confirm({ title: t('form.delete'), message: t('workspace.delete_confirm'), danger: true, confirmLabel: t('form.delete'), cancelLabel: t('sidebar.cancel') })
    if (!ok) return
    await window.api.deleteWorkspace(id)
    onWorkspacesChange()
  }

  const handleSelectDir = async () => {
    const dir = await window.api.selectDirectory()
    if (dir) setNewPath(dir)
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4a2 2 0 012-2h2.586a1 1 0 01.707.293L8.707 3.707A1 1 0 009.414 4H12a2 2 0 012 2v5a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" fill="currentColor" />
        </svg>
        {t('app.title')}
      </div>

      <div className="sidebar-nav">
        <div className="nav-item active" onClick={() => { if (workspaces[0]) onSelectWorkspaceAndPage(workspaces[0].id, 'folders') }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="4" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M1 6h14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {t('sidebar.all_folders')}
        </div>

        <div className="nav-section-title">{t('sidebar.workspaces')}</div>

        {workspaces.length === 0 && (
          <div className="nav-item" style={{ cursor: 'default', color: 'var(--text-tertiary)', fontSize: 11 }}>
            {t('sidebar.no_workspaces')}
          </div>
        )}

        {workspaces.map(ws => (
          <div
            key={ws.id}
            className={`nav-item ${activeWorkspaceId === ws.id ? 'active' : ''}`}
            onClick={() => onSelectWorkspaceAndPage(ws.id, 'folders')}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ws.name}
            </span>
            <div style={{ display: 'flex', gap: 3, marginRight: 4, flexShrink: 0, flexWrap: 'wrap', maxWidth: 100, justifyContent: 'flex-end' }}>
              {(categoriesByWs[ws.id] || []).slice(0, 3).map(cat => (
                <span key={cat.id} style={{
                  fontSize: 9, padding: '0 4px', borderRadius: 3, lineHeight: '16px',
                  background: `${cat.color}20`, color: cat.color, whiteSpace: 'nowrap',
                }}>{cat.name}</span>
              ))}
              {(categoriesByWs[ws.id] || []).length > 3 && (
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', lineHeight: '16px' }}>+{categoriesByWs[ws.id].length - 3}</span>
              )}
            </div>
            <button
              className="btn-icon btn-ghost"
              onClick={(e) => { e.stopPropagation(); onSelectWorkspaceAndPage(ws.id, 'settings') }}
              title={t('sidebar.settings')}
              style={{ flexShrink: 0, opacity: 0.6 }}
            >
              ⚙
            </button>
          </div>
        ))}

        {showNew ? (
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              placeholder={t('sidebar.workspace_name')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="input-group">
              <input
                placeholder={t('sidebar.path_optional')}
                value={newPath}
                onChange={e => setNewPath(e.target.value)}
                style={{ flex: 1, fontSize: 11 }}
              />
              <button className="btn btn-ghost btn-icon" onClick={handleSelectDir} title={t('sidebar.browse')}>📁</button>
            </div>
            <div className="text-tertiary" style={{ fontSize: 10, paddingLeft: 2 }}>{t('settings.default_drive_hint')}</div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 1 }}>{t('sidebar.create')}</button>
              <button className="btn btn-ghost" onClick={() => setShowNew(false)}>{t('sidebar.cancel')}</button>
            </div>
          </div>
        ) : (
          <button
            className="nav-item"
            style={{ color: 'var(--accent)' }}
            onClick={() => setShowNew(true)}
          >
            + {t('sidebar.new_workspace')}
          </button>
        )}
      </div>

      {/* Language switcher */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 4,
      }}>
        <LangBtn current={lang} lang="zh" setLang={setLang} label="中" />
        <LangBtn current={lang} lang="en" setLang={setLang} label="EN" />
      </div>
    </div>
  )
}

function LangBtn({ current, lang, setLang, label }: { current: Lang; lang: Lang; setLang: (l: Lang) => void; label: string }) {
  return (
    <button
      onClick={() => setLang(lang)}
      style={{
        flex: 1,
        padding: '4px 0',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: 'pointer',
        background: current === lang ? 'var(--accent)' : 'transparent',
        color: current === lang ? '#fff' : 'var(--text-tertiary)',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}
