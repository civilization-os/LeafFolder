import { useState, useEffect } from 'react'
import type { Workspace, Category } from '../types'
import { useI18n } from '../locales/I18nContext'
import { useConfirm } from '../locales/ConfirmContext'

const COLORS = ['#5e6ad2', '#e5484d', '#30a46c', '#f5a623', '#12b5e5', '#8b5cf6', '#ec4899', '#10b981']

// Default categories with sub-categories and app associations
const DEFAULT_TREE: { name: string; color: string; children?: { name: string; color: string }[] }[] = [
  {
    name: '代码', color: '#5e6ad2', children: [
      { name: '前端项目', color: '#12b5e5' },
      { name: '后端项目', color: '#30a46c' },
      { name: '桌面应用', color: '#8b5cf6' },
    ],
  },
  {
    name: '文档', color: '#f5a623', children: [
      { name: 'Markdown', color: '#e5484d' },
      { name: 'PDF', color: '#ec4899' },
    ],
  },
  {
    name: '学习', color: '#30a46c', children: [
      { name: '教程', color: '#12b5e5' },
      { name: '笔记', color: '#f5a623' },
    ],
  },
  {
    name: '个人', color: '#ec4899', children: [
      { name: '照片', color: '#10b981' },
      { name: '音乐', color: '#8b5cf6' },
    ],
  },
  {
    name: '项目', color: '#8b5cf6', children: [
      { name: '进行中', color: '#5e6ad2' },
      { name: '已完成', color: '#30a46c' },
      { name: '归档', color: '#6b7280' },
    ],
  },
]

interface Props {
  workspace: Workspace
  onUpdate: () => void
}

// Helper to build a tree from flat categories
function buildTree(cats: Category[]): (Category & { children: Category[] })[] {
  const topLevel = cats.filter(c => !c.parent_id)
  const childMap: Record<number, Category[]> = {}
  for (const c of cats) {
    if (c.parent_id) {
      if (!childMap[c.parent_id]) childMap[c.parent_id] = []
      childMap[c.parent_id].push(c)
    }
  }
  return topLevel.map(c => ({ ...c, children: childMap[c.id] || [] }))
}

export default function WorkspaceSettings({ workspace, onUpdate }: Props) {
  const { t, lang, setLang } = useI18n()
  const { confirm } = useConfirm()
  const [categories, setCategories] = useState<Category[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLORS[0])
  const [newCatParentId, setNewCatParentId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [defaultDrive, setDefaultDrive] = useState('')

  useEffect(() => {
    window.api.getCategories(workspace.id).then(setCategories)
    window.api.getSetting('default_drive').then(d => {
      if (d) setDefaultDrive(d)
    })
  }, [workspace.id])

  const tree = buildTree(categories)
  const topLevel = categories.filter(c => !c.parent_id)

  const handleSaveDrive = async () => {
    const drive = defaultDrive.replace(':', '')
    if (!/^[A-Z]$/i.test(drive)) return
    await window.api.setSetting('default_drive', drive.toUpperCase() + ':')
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    await window.api.createCategory(newCatName.trim(), workspace.id, {
      color: newCatColor,
      parentId: newCatParentId ?? undefined,
    })
    setNewCatName('')
    setNewCatColor(COLORS[0])
    setNewCatParentId(null)
    const cats = await window.api.getCategories(workspace.id)
    setCategories(cats)
    onUpdate()
  }

  const handleUpdateCategory = async (id: number) => {
    if (!editingName.trim()) return
    await window.api.updateCategory(id, { name: editingName.trim() })
    setEditingId(null)
    const cats = await window.api.getCategories(workspace.id)
    setCategories(cats)
  }

  const handleDeleteCategory = async (id: number) => {
    const ok = await confirm({
      title: t('form.delete'),
      message: t('settings.delete_category_confirm'),
      danger: true,
      confirmLabel: t('form.delete'),
      cancelLabel: t('sidebar.cancel'),
    })
    if (!ok) return
    await window.api.deleteCategory(id)
    const cats = await window.api.getCategories(workspace.id)
    setCategories(cats)
  }

  const handleChangeColor = async (id: number, color: string) => {
    await window.api.updateCategory(id, { color })
    const cats = await window.api.getCategories(workspace.id)
    setCategories(cats)
  }

  const handleSetApp = async (id: number) => {
    const result = await window.api.selectExecutable()
    if (result) {
      await window.api.updateCategory(id, { appPath: result.path, appName: result.name })
      const cats = await window.api.getCategories(workspace.id)
      setCategories(cats)
    }
  }

  const handleClearApp = async (id: number) => {
    await window.api.updateCategory(id, { appPath: null, appName: null })
    const cats = await window.api.getCategories(workspace.id)
    setCategories(cats)
  }

  // Check if a default tree category has any items not already present
  const treeMissingCount = (entry: typeof DEFAULT_TREE[number]) => {
    const existing = categories.some(c => c.name === entry.name && !c.parent_id)
    const subMissing = (entry.children || []).filter(sub => !categories.some(c => c.name === sub.name && categories.find(p => p.id === c.parent_id)?.name === entry.name))
    if (!existing) return entry.children ? entry.children.length + 1 : 1
    return subMissing.length
  }

  const handleAddDefaultTree = async (entry: typeof DEFAULT_TREE[number]) => {
    // Find or create parent
    let parent = categories.find(c => c.name === entry.name && !c.parent_id)
    if (!parent) {
      parent = await window.api.createCategory(entry.name, workspace.id, { color: entry.color }) as unknown as Category
    }
    // Create missing sub-categories
    for (const sub of entry.children || []) {
      const exists = categories.some(c => c.name === sub.name && c.parent_id === parent!.id)
      if (!exists) {
        await window.api.createCategory(sub.name, workspace.id, {
          color: sub.color,
          parentId: parent!.id,
        })
      }
    }
    const cats = await window.api.getCategories(workspace.id)
    setCategories(cats)
    onUpdate()
  }

  const renderCategoryRow = (cat: Category, indent: number = 0) => (
    <div
      key={cat.id}
      className={`cat-item ${indent > 0 ? 'cat-item-indent' : ''}`}
    >
      <div className="cat-dot" style={{ background: cat.color }} />
      {editingId === cat.id ? (
        <input
          value={editingName}
          onChange={e => setEditingName(e.target.value)}
          onBlur={() => handleUpdateCategory(cat.id)}
          onKeyDown={e => e.key === 'Enter' && handleUpdateCategory(cat.id)}
          autoFocus
          className="flex-1"
        />
      ) : (
        <span
          className={`cat-name indent-${indent}`}
          onDoubleClick={() => { setEditingId(cat.id); setEditingName(cat.name) }}
        >
          {cat.name}
        </span>
      )}

      {/* App indicator */}
      {cat.app_name && (
        <span className="cat-app-badge">
          {cat.app_name}
        </span>
      )}

      <div className="cat-colors">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => handleChangeColor(cat.id, c)}
            className={`cat-color-btn ${cat.color === c ? 'active' : ''}`}
            style={{ background: c }}
          />
        ))}
      </div>

      {/* App picker button */}
      <div className="cat-actions">
        <button
          className="btn-icon btn-sm btn-ghost"
          onClick={() => handleSetApp(cat.id)}
          title={t('settings.app')}
          style={{ fontSize: 'var(--text-sm)', opacity: 0.7 }}
        >
          {cat.app_path ? '⚙' : '📎'}
        </button>
        {cat.app_path && (
          <button
            className="btn-icon btn-sm btn-ghost"
            onClick={() => handleClearApp(cat.id)}
            title={t('settings.app_clear')}
            style={{ fontSize: 9, opacity: 0.5, color: 'var(--danger)' }}
          >
            ✕
          </button>
        )}

        {/* Add sub-category */}
        <button
          className="btn-icon btn-sm btn-ghost"
          onClick={() => { setNewCatParentId(cat.id); setNewCatName(''); }}
          title={t('settings.add_subcategory')}
          style={{ fontSize: 'var(--text-base)', opacity: 0.6 }}
        >
          +
        </button>

        <button
          className="btn-icon btn-sm btn-ghost"
          onClick={() => handleDeleteCategory(cat.id)}
          style={{ color: 'var(--text-tertiary)' }}
        >
          ✕
        </button>
      </div>
    </div>
  )

  return (
    <div className="settings-page">
      {/* Workspace Info */}
      <div className="ws-info">
        <div className="ws-info-name">{workspace.name}</div>
        <div className="ws-info-path">{workspace.path}</div>
      </div>

      {/* Language Switcher */}
      <div className="settings-section">
        <div className="settings-section-title">{t('settings.language')}</div>
        <div className="flex gap-2">
          <button
            className={`btn ${lang === 'zh' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setLang('zh')}
          >
            简体中文
          </button>
          <button
            className={`btn ${lang === 'en' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setLang('en')}
          >
            English
          </button>
        </div>
      </div>

      {/* Default Drive */}
      <div className="settings-section">
        <div className="settings-section-title">{t('settings.default_drive')}</div>
        <div className="input-group">
          <input
            value={defaultDrive}
            onChange={e => {
              const letters = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
              setDefaultDrive(letters ? letters + ':' : '')
            }}
            placeholder="D:"
            style={{ width: 80, textAlign: 'center' }}
            maxLength={2}
          />
          <button className="btn btn-primary" onClick={handleSaveDrive}>{t('form.save')}</button>
          <span className="text-tertiary" style={{ fontSize: 'var(--text-sm)' }}>{t('settings.default_drive_hint')}</span>
        </div>
      </div>

      {/* Categories */}
      <div className="settings-section">
        <div className="flex items-center justify-between mb-2">
          <div className="settings-section-title" style={{ marginBottom: 0 }}>{t('settings.categories')}</div>
        </div>

        {/* Tree display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {tree.map(node => (
            <div key={node.id}>
              {renderCategoryRow(node, 0)}
              {node.children.map(child => renderCategoryRow(child, 1))}
            </div>
          ))}
        </div>

        {/* Quick-add default trees */}
        <div className="text-tertiary text-sm mb-1">
          {t('settings.presets') || '快速添加分类模板：'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {DEFAULT_TREE.filter(d => treeMissingCount(d) > 0).map((entry) => (
            <button
              key={entry.name}
              className="preset-cat-btn"
              style={{
                background: `${entry.color}18`,
                color: entry.color,
                borderColor: `${entry.color}30`,
              }}
              onClick={() => handleAddDefaultTree(entry)}
            >
              + {entry.name}
              {entry.children && treeMissingCount(entry) > 1 && ` (${treeMissingCount(entry)})`}
            </button>
          ))}
        </div>

        {/* Add category form */}
        {newCatParentId !== null && (
          <div className="text-secondary text-sm mb-1">
            {t('settings.parent_category')}:
            {' '}{categories.find(c => c.id === newCatParentId)?.name}
            <button
              className="btn btn-ghost"
              style={{ fontSize: 'var(--text-xs)', padding: '0 4px', marginLeft: 4 }}
              onClick={() => setNewCatParentId(null)}
            >
              ✕
            </button>
          </div>
        )}
        <div className="input-group">
          <input
            placeholder={t('settings.new_category')}
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            className="flex-1"
          />
          <div className="color-picker-row">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewCatColor(c)}
                className={`color-picker-btn ${newCatColor === c ? 'active' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleAddCategory} disabled={!newCatName.trim()}>
            {t('form.add')}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="settings-section" style={{ marginBottom: 0 }}>
        <div className="settings-section-title">{t('settings.about')}</div>
        <div className="about-section">
          <div>{t('settings.created')}: {new Date(workspace.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}</div>
          <div>{t('settings.database_path')}: {workspace.path}</div>
        </div>

        <div className="about-divider">
          <button
            className="btn btn-danger"
            onClick={async () => {
              const ok = await confirm({
                title: t('form.delete'),
                message: t('workspace.delete_confirm'),
                danger: true,
                confirmLabel: t('form.delete'),
                cancelLabel: t('sidebar.cancel'),
              })
              if (!ok) return
              await window.api.deleteWorkspace(workspace.id)
              onUpdate()
            }}
          >
            ✕ {t('settings.delete_workspace')}
          </button>
        </div>
      </div>
    </div>
  )
}
