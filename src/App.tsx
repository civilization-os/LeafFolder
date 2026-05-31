import { useState, useEffect, useCallback } from 'react'
import type { Workspace, Folder } from './types'
import Sidebar from './components/Sidebar'
import WorkspaceSettings from './components/WorkspaceSettings'
import FolderGrid from './components/FolderGrid'
import DrivePickerDialog from './components/DrivePickerDialog'
import TitleBar from './components/TitleBar'
import { useI18n } from './locales/I18nContext'
import { ConfirmProvider } from './locales/ConfirmContext'

type Page = 'folders' | 'settings'

export default function App() {
  const { t } = useI18n()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [page, setPage] = useState<Page>('folders')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDrivePicker, setShowDrivePicker] = useState(false)

  const loadWorkspaces = useCallback(async () => {
    const ws = await window.api.getWorkspaces()
    setWorkspaces(ws)
    if (ws.length > 0 && activeWorkspaceId === null) {
      setActiveWorkspaceId(ws[0].id)
    }
  }, [activeWorkspaceId])

  const loadFolders = useCallback(async (workspaceId: number) => {
    const f = await window.api.getFolders(workspaceId)
    setFolders(f)
  }, [])

  useEffect(() => {
    loadWorkspaces().then(() => {
      window.api.getSetting('default_drive').then(drive => {
        if (!drive) setShowDrivePicker(true)
      })
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeWorkspaceId) {
      loadFolders(activeWorkspaceId)
    }
  }, [activeWorkspaceId, loadFolders])

  const handleSelectWorkspace = (id: number) => {
    setActiveWorkspaceId(id)
  }

  const handleSelectWorkspaceAndPage = (id: number, p: Page) => {
    setActiveWorkspaceId(id)
    setPage(p)
  }

  const handleRefresh = () => {
    if (activeWorkspaceId) loadFolders(activeWorkspaceId)
  }

  const handleSelectDrive = async (drive: string) => {
    await window.api.setSetting('default_drive', drive)
    setShowDrivePicker(false)
  }

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)

  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="app-container">
        <TitleBar />
        <div className="app-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-secondary loading-state" style={{ minHeight: 'auto' }}>{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <ConfirmProvider>
    <div className="app-container">
      <TitleBar
        title={activeWorkspace?.name || t('app.title')}
        showSearch={page === 'folders'}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="app-layout">
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          activePage={page}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectWorkspaceAndPage={handleSelectWorkspaceAndPage}
          onPageChange={setPage}
          onWorkspacesChange={loadWorkspaces}
        />
        <div className="main-content">
          <div className="main-body">
            {page === 'folders' && activeWorkspaceId && (
              <FolderGrid
                folders={filteredFolders}
                workspaceId={activeWorkspaceId}
                onRefresh={handleRefresh}
              />
            )}
            {page === 'settings' && activeWorkspace && (
              <WorkspaceSettings workspace={activeWorkspace} onUpdate={async () => {
                const ws = await window.api.getWorkspaces()
                setWorkspaces(ws)
                if (ws.length > 0 && !ws.find(w => w.id === activeWorkspaceId)) {
                  setActiveWorkspaceId(ws[0].id)
                } else if (ws.length === 0) {
                  setActiveWorkspaceId(null)
                }
                setPage('folders')
              }} />
            )}
            {!activeWorkspaceId && (
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <div className="empty-state-title">{t('common.no_workspace_selected')}</div>
                <div className="empty-state-desc">{t('common.no_workspace_hint')}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showDrivePicker && (
        <DrivePickerDialog onSelect={handleSelectDrive} onSkip={() => setShowDrivePicker(false)} />
      )}
    </div>
    </ConfirmProvider>
  )
}
