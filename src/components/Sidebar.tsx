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
      window.api.getCategories(ws.id).then(cats => ({ wsId: ws.id, cats })))
    ).then(results => {
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
      <div className="sidebar-nav">
        <button
          className={`nav-item ${workspaces.length > 0 ? '' : ''}`}
          onClick={() => { if (workspaces[0]) onSelectWorkspaceAndPage(workspaces[0].id, 'folders') }}
        >
          <svg className="nav-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="4" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M1 6h14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {t('sidebar.all_folders')}
        </button>

        <div className="nav-section-title">{t('sidebar.workspaces')}</div>

        {workspaces.length === 0 && (
          <div className="nav-item" style={{ cursor: 'default', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            {t('sidebar.no_workspaces')}
          </div>
        )}

        {workspaces.map(ws => (
          <div
            key={ws.id}
            className={`ws-item ${activeWorkspaceId === ws.id ? 'active' : ''}`}
            onClick={() => onSelectWorkspaceAndPage(ws.id, 'folders')}
          >
            <span className="ws-item-name">
              {ws.name}
            </span>
            <div className="ws-item-badges">
              {(categoriesByWs[ws.id] || []).slice(0, 3).map(cat => (
                <span
                  key={cat.id}
                  className="ws-item-badge"
                  style={{ background: `${cat.color}18`, color: cat.color }}
                >
                  {cat.name}
                </span>
              ))}
              {(categoriesByWs[ws.id] || []).length > 3 && (
                <span className="ws-item-badge-more">
                  +{categoriesByWs[ws.id].length - 3}
                </span>
              )}
            </div>
            <button
              className="btn-icon btn-ghost btn-sm ws-item-settings"
              onClick={(e) => { e.stopPropagation(); onSelectWorkspaceAndPage(ws.id, 'settings') }}
              title={t('sidebar.settings')}
            >
              ⚙
            </button>
          </div>
        ))}

        {showNew ? (
          <div className="ws-form">
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
                className="flex-1"
                style={{ fontSize: 'var(--text-sm)' }}
              />
              <button className="btn-ghost btn-icon" onClick={handleSelectDir} title={t('sidebar.browse')}>📁</button>
            </div>
            <div className="text-tertiary text-xs" style={{ paddingLeft: 2 }}>{t('settings.default_drive_hint')}</div>
            <div className="ws-form-footer">
              <button className="btn btn-primary flex-1" onClick={handleCreate}>{t('sidebar.create')}</button>
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
      <div className="sidebar-lang">
        <button
          className={`lang-btn ${lang === 'zh' ? 'active' : ''}`}
          onClick={() => setLang('zh')}
        >
          中
        </button>
        <button
          className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
          onClick={() => setLang('en')}
        >
          EN
        </button>
      </div>
    </div>
  )
}
