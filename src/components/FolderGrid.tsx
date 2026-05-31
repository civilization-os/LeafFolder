import { useState, useEffect, useCallback, useRef } from 'react'
import type { Folder, Category } from '../types'
import { useI18n } from '../locales/I18nContext'
import { useConfirm } from '../locales/ConfirmContext'
import CreateFolderDialog from './CreateFolderDialog'

interface Props {
  folders: Folder[]
  workspaceId: number
  onRefresh: () => void
}

type ViewMode = 'card' | 'list' | 'icon'

function getFolderTags(tagsJson: string, tagMap: Record<number, { name: string; color: string }>): { name: string; color: string }[] {
  try {
    const tagIds = JSON.parse(tagsJson) as number[]
    return tagIds.map(id => tagMap[id]).filter(Boolean)
  } catch { return [] }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return ''
  const gb = bytes / 1024 / 1024 / 1024
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / 1024 / 1024
  if (mb >= 1) return `${mb.toFixed(0)} MB`
  const kb = bytes / 1024
  if (kb >= 1) return `${kb.toFixed(0)} KB`
  return `${bytes} B`
}

function formatDate(dateStr: string, locale: string, t: (key: string) => string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return t('common.today')
    if (diff < 172800000) return t('common.yesterday')
    return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

interface BadgeTagProps {
  name: string
  color: string
  children?: React.ReactNode
}

function BadgeTag({ name, color, children }: BadgeTagProps) {
  return (
    <span
      className="badge"
      style={{ background: `${color}18`, color }}
    >
      {children || name}
    </span>
  )
}

export default function FolderGrid({ folders, workspaceId, onRefresh }: Props) {
  const { t, lang } = useI18n()
  const { confirm } = useConfirm()
  const [showCreate, setShowCreate] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingStats, setLoadingStats] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [tagMap, setTagMap] = useState<Record<number, { name: string; color: string }>>({})

  useEffect(() => {
    window.api.getCategories(workspaceId).then(setCategories)
  }, [workspaceId])

  useEffect(() => {
    window.api.getTags().then(tags => {
      const map: Record<number, { name: string; color: string }> = {}
      for (const t of tags) map[t.id] = { name: t.name, color: t.color }
      setTagMap(map)
    })
  }, [])

  // Clear selection when folders change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [folders])

  const handleRefreshStats = async (id: number) => {
    if (loadingStats.has(id)) return
    setLoadingStats(prev => new Set(prev).add(id))
    await window.api.refreshFolderStats(id)
    setLoadingStats(prev => { const next = new Set(prev); next.delete(id); return next })
    onRefresh()
  }

  const handleToggleStar = async (folder: Folder) => {
    await window.api.updateFolder(folder.id, { starred: folder.starred ? 0 : 1 })
    onRefresh()
  }

  const handleDelete = async (id: number) => {
    const ok = await confirm({ title: t('form.delete'), message: t('folder.delete_confirm'), danger: true, confirmLabel: t('form.delete'), cancelLabel: t('sidebar.cancel') })
    if (!ok) return
    await window.api.deleteFolder(id)
    onRefresh()
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    const ok = await confirm({ title: t('form.delete'), message: t('folder.delete_batch_confirm', { count: selectedIds.size }), danger: true, confirmLabel: t('form.delete'), cancelLabel: t('sidebar.cancel') })
    if (!ok) return
    await window.api.batchDeleteFolders(Array.from(selectedIds))
    setSelectedIds(new Set())
    onRefresh()
  }

  const handleOpen = (folder: Folder) => {
    if (folder.category_app_path) {
      window.api.openFolderWithApp(folder.path, folder.category_app_path)
    } else {
      window.api.openFolder(folder.path)
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === folders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(folders.map(f => f.id)))
    }
  }

  // Context menu
  const contextRef = useRef<Folder | null>(null)

  useEffect(() => {
    const cleanup = window.api.onContextMenuAction((action: string) => {
      const folder = contextRef.current
      if (!folder) return
      switch (action) {
        case 'open': handleOpen(folder); break
        case 'open-with-app': window.api.openFolderWithApp(folder.path, folder.category_app_path!); break
        case 'star': handleToggleStar(folder); break
        case 'refresh': handleRefreshStats(folder.id); break
        case 'delete': handleDelete(folder.id); break
      }
      contextRef.current = null
    })
    return cleanup
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, folder: Folder) => {
    e.preventDefault()
    contextRef.current = folder
    window.api.showFolderContextMenu(folder.starred === 1, folder.category_app_name || undefined)
  }, [])

  const hasSelection = selectedIds.size > 0

  const renderCardView = () => (
    <div className="folder-grid">
      {folders.map(folder => {
        const tags = getFolderTags(folder.tags, tagMap)
        return (
          <div
            key={folder.id}
            className={`folder-card ${selectedIds.has(folder.id) ? 'selected' : ''}`}
            onDoubleClick={() => handleOpen(folder)}
            onContextMenu={(e) => handleContextMenu(e, folder)}
            onClick={() => toggleSelect(folder.id)}
          >
            <div className="folder-card-actions">
              {folder.category_app_name && (
                <button
                  className="btn-icon"
                  onClick={(e) => { e.stopPropagation(); handleOpen(folder) }}
                  title={t('folder.app_launch', { app: folder.category_app_name })}
                  style={{ color: 'var(--accent-text)', fontSize: 10 }}
                >
                  ▶
                </button>
              )}
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); handleRefreshStats(folder.id) }}
                title={t('folder.stats')}
                style={{ fontSize: 11 }}
              >
                {loadingStats.has(folder.id) ? '⋯' : '⟳'}
              </button>
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); handleDelete(folder.id) }}
                title={t('form.delete')}
                style={{ color: 'var(--danger)' }}
              >
                ✕
              </button>
            </div>

            <div className="folder-card-top">
              <div
                className="folder-icon"
                style={{ background: folder.category_color ? `${folder.category_color}18` : 'var(--bg-tertiary)' }}
              >
                📁
              </div>
              <div className="folder-info">
                <div className="folder-name">
                  {folder.starred === 1 && (
                    <span className="star-btn active" style={{ marginRight: 4, fontSize: 12, verticalAlign: 'middle' }}>★</span>
                  )}
                  {folder.name}
                </div>
                <div className="folder-path" title={folder.path}>{folder.path}</div>
              </div>
            </div>

            <div className="folder-meta">
              {folder.category_name && <span className="badge">{folder.category_name}</span>}
              {folder.category_app_name && (
                <BadgeTag name={folder.category_app_name} color="#5e6ad2">▶ {folder.category_app_name}</BadgeTag>
              )}
              {tags.slice(0, 2).map(tag => (
                <BadgeTag key={tag.name} name={tag.name} color={tag.color} />
              ))}
              {tags.length > 2 && (
                <span className="text-tertiary" style={{ fontSize: 10 }}>+{tags.length - 2}</span>
              )}
              {folder.file_count > 0 && (
                <span style={{ fontSize: 'var(--text-sm)' }}>{t('folder.files', { count: folder.file_count })}</span>
              )}
              {folder.size_bytes > 0 && (
                <span style={{ fontSize: 'var(--text-sm)' }}>{formatSize(folder.size_bytes)}</span>
              )}
              <span className="folder-meta-date">{formatDate(folder.updated_at, lang, t)}</span>
            </div>

            {folder.description && (
              <div className="folder-description">{folder.description}</div>
            )}
          </div>
        )
      })}
    </div>
  )

  const renderListView = () => (
    <div className="list-view">
      <div className="list-header">
        <label className="list-checkbox" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={folders.length > 0 && selectedIds.size === folders.length} onChange={toggleAll} />
        </label>
        <span className="list-cell-name">{t('form.name')}</span>
        <span className="list-cell-cat">分类</span>
        <span className="list-cell-path">{t('form.path')}</span>
        <span className="list-cell-meta">文件</span>
        <span className="list-cell-meta">大小</span>
        <span className="list-cell-date">更新</span>
        <span className="list-cell-actions"></span>
      </div>
      {folders.map(folder => {
        const tags = getFolderTags(folder.tags, tagMap)
        return (
          <div
            key={folder.id}
            className={`list-row ${selectedIds.has(folder.id) ? 'selected' : ''}`}
            onContextMenu={(e) => handleContextMenu(e, folder)}
          >
            <label className="list-checkbox" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedIds.has(folder.id)}
                onChange={() => toggleSelect(folder.id)}
              />
            </label>
            <span className="list-cell-name" onDoubleClick={() => handleOpen(folder)}>
              <span className="list-icon">📁</span>
              {folder.starred === 1 && <span style={{ color: 'var(--warning)', fontSize: 11 }}>★</span>}
              {folder.name}
            </span>
            <span className="list-cell-cat">
              {folder.category_name && <span className="badge">{folder.category_name}</span>}
              {folder.category_app_name && (
                <BadgeTag name={folder.category_app_name} color="#5e6ad2">▶</BadgeTag>
              )}
              {tags.map(tag => (
                <BadgeTag key={tag.name} name={tag.name} color={tag.color} />
              ))}
            </span>
            <span className="list-cell-path" title={folder.path}>{folder.path}</span>
            <span className="list-cell-meta">{folder.file_count > 0 ? folder.file_count : '-'}</span>
            <span className="list-cell-meta">{formatSize(folder.size_bytes) || '-'}</span>
            <span className="list-cell-date">{formatDate(folder.updated_at, lang, t)}</span>
            <span className="list-cell-actions">
              {folder.category_app_name && (
                <button className="btn-icon btn-sm btn-ghost" onClick={() => handleOpen(folder)} title={t('folder.app_launch', { app: folder.category_app_name })} style={{ color: 'var(--accent-text)', fontSize: 10 }}>
                  ▶
                </button>
              )}
              <button className={`btn-icon btn-sm btn-ghost ${folder.starred ? 'star-active' : ''}`} onClick={() => handleToggleStar(folder)} title={folder.starred ? t('folder.unstar') : t('folder.star')} style={{ fontSize: 12 }}>
                {folder.starred ? '★' : '☆'}
              </button>
              <button className="btn-icon btn-sm btn-ghost" onClick={() => handleRefreshStats(folder.id)} title={t('folder.stats')} style={{ fontSize: 10 }}>
                {loadingStats.has(folder.id) ? '⋯' : '⟳'}
              </button>
              <button className="btn-icon btn-sm btn-ghost" onClick={() => handleDelete(folder.id)} title={t('form.delete')} style={{ color: 'var(--danger)', fontSize: 10 }}>
                ✕
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )

  const renderIconView = () => (
    <div className="icon-grid">
      {folders.map(folder => {
        const tags = getFolderTags(folder.tags, tagMap)
        return (
          <div
            key={folder.id}
            className={`icon-item ${selectedIds.has(folder.id) ? 'selected' : ''}`}
            onDoubleClick={() => handleOpen(folder)}
            onContextMenu={(e) => handleContextMenu(e, folder)}
            onClick={() => toggleSelect(folder.id)}
          >
            <div className="icon-item-icon" style={{ background: folder.category_color ? `${folder.category_color}18` : 'var(--bg-tertiary)' }}>
              {folder.starred === 1 ? '⭐' : '📁'}
            </div>
            <div className="icon-item-name" title={folder.name}>{folder.name}</div>
            {folder.category_name && <div className="icon-item-cat">{folder.category_name}</div>}
            {folder.category_app_name && (
              <div style={{ fontSize: 8, padding: '1px 4px', borderRadius: 'var(--radius-xs)', background: 'var(--accent-bg)', color: 'var(--accent-text)', marginTop: 1 }}>▶ {folder.category_app_name}</div>
            )}
            {tags.length > 0 && (
              <div className="icon-item-tags">
                {tags.slice(0, 2).map(tag => (
                  <span key={tag.name} className="icon-item-tag" style={{ background: `${tag.color}18`, color: tag.color }}>{tag.name}</span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="text-secondary" style={{ fontSize: 'var(--text-base)' }}>
            {t('folder.count', { count: folders.length })}
          </span>
          {categories.length === 0 && (
            <span className="text-tertiary" style={{ fontSize: 'var(--text-sm)' }}>
              {t('folder.create_category_first')}
            </span>
          )}
        </div>
        <div className="toolbar-right">
          <div className="view-toggle">
            <button
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')}
              title={t('folder.view_list')}
            >
              ☰
            </button>
            <button
              className={`btn ${viewMode === 'card' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('card')}
              title={t('folder.view_card')}
            >
              ▦
            </button>
            <button
              className={`btn ${viewMode === 'icon' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('icon')}
              title={t('folder.view_icon')}
            >
              ⊞
            </button>
          </div>
          <button className="btn btn-ghost" onClick={onRefresh}>↻ {t('folder.refresh')}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + {t('folder.new')}
          </button>
        </div>
      </div>

      {/* Content */}
      {folders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-title">
            {categories.length === 0 ? t('folder.no_categories') : t('folder.no_folders')}
          </div>
          <div className="empty-state-desc">
            {categories.length === 0 ? t('folder.no_categories_hint') : t('folder.no_folders_hint')}
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'card' && renderCardView()}
          {viewMode === 'list' && renderListView()}
          {viewMode === 'icon' && renderIconView()}
        </>
      )}

      {/* Selection toolbar */}
      {hasSelection && (
        <div className="selection-bar">
          <span className="text-secondary" style={{ fontSize: 'var(--text-base)' }}>
            {t('folder.selected', { count: selectedIds.size })}
          </span>
          <button className="btn btn-danger btn-sm" onClick={handleBatchDelete}>
            ✕ {t('form.delete')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
            {t('sidebar.cancel')}
          </button>
        </div>
      )}

      {showCreate && (
        <CreateFolderDialog
          workspaceId={workspaceId}
          categories={categories}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); onRefresh() }}
        />
      )}
    </div>
  )
}
