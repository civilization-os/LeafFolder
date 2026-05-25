import { useState, useEffect } from 'react'
import type { Workspace, Category } from '../types'
import { useI18n } from '../locales/I18nContext'
import { useConfirm } from '../locales/ConfirmContext'
import type { Lang } from '../locales'

const COLORS = ['#5e6ad2', '#e5484d', '#30a46c', '#f5a623', '#12b5e5', '#8b5cf6', '#ec4899', '#10b981']
const DEFAULT_CATEGORIES = ['工作', '学习', '个人', '项目', '文档']

interface Props {
  workspace: Workspace
  onUpdate: () => void
}

export default function WorkspaceSettings({ workspace, onUpdate }: Props) {
  const { t, lang, setLang } = useI18n()
  const { confirm } = useConfirm()
  const [categories, setCategories] = useState<Category[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLORS[0])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [defaultDrive, setDefaultDrive] = useState('')

  useEffect(() => {
    window.api.getCategories(workspace.id).then(setCategories)
    window.api.getSetting('default_drive').then(d => {
      if (d) setDefaultDrive(d)
    })
  }, [workspace.id])

  const handleSaveDrive = async () => {
    const drive = defaultDrive.replace(':', '')
    if (!/^[A-Z]$/i.test(drive)) return
    await window.api.setSetting('default_drive', drive.toUpperCase() + ':')
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    await window.api.createCategory(newCatName.trim(), workspace.id, { color: newCatColor })
    setNewCatName('')
    setNewCatColor(COLORS[0])
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
    const ok = await confirm({ title: t('form.delete'), message: t('settings.delete_category_confirm'), danger: true, confirmLabel: t('form.delete'), cancelLabel: t('sidebar.cancel') })
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

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="mb-4">
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{workspace.name}</h2>
        <div className="text-tertiary" style={{ fontSize: 12 }}>{workspace.path}</div>
      </div>

      {/* Language Switcher */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('settings.language')}</h3>
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
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('settings.default_drive')}</h3>
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
          <span className="text-tertiary" style={{ fontSize: 11 }}>{t('settings.default_drive_hint')}</span>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div className="flex items-center justify-between mb-2">
          <h3 style={{ fontSize: 13, fontWeight: 600 }}>{t('settings.categories')}</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {categories.map(cat => (
            <div
              key={cat.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: cat.color,
                flexShrink: 0,
              }} />
              {editingId === cat.id ? (
                <input
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={() => handleUpdateCategory(cat.id)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                  autoFocus
                  style={{ flex: 1 }}
                />
              ) : (
                <span
                  style={{ flex: 1, cursor: 'pointer' }}
                  onDoubleClick={() => { setEditingId(cat.id); setEditingName(cat.name) }}
                >
                  {cat.name}
                </span>
              )}

              <div style={{ display: 'flex', gap: 2 }}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => handleChangeColor(cat.id, c)}
                    style={{
                      width: 14, height: 14, borderRadius: '50%', background: c, border: cat.color === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
              </div>

              <button className="btn-icon btn-ghost" onClick={() => handleDeleteCategory(cat.id)} style={{ color: 'var(--text-tertiary)' }}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Quick-add default categories */}
        {DEFAULT_CATEGORIES.filter(d => !categories.some(c => c.name === d)).length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>快速添加：</div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {DEFAULT_CATEGORIES.filter(d => !categories.some(c => c.name === d)).map((name, i) => (
            <button
              key={name}
              className="btn btn-sm"
              style={{
                background: `${COLORS[i % COLORS.length]}20`,
                color: COLORS[i % COLORS.length],
                border: `1px solid ${COLORS[i % COLORS.length]}40`,
              }}
              onClick={async () => {
                await window.api.createCategory(name, workspace.id, { color: COLORS[i % COLORS.length] })
                const cats = await window.api.getCategories(workspace.id)
                setCategories(cats)
                onUpdate()
              }}
            >
              + {name}
            </button>
          ))}
        </div>

        <div className="input-group">
          <input
            placeholder={t('settings.new_category')}
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            style={{ flex: 1 }}
          />
          <div className="flex gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewCatColor(c)}
                style={{
                  width: 16, height: 16, borderRadius: '50%', background: c, border: newCatColor === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleAddCategory} disabled={!newCatName.trim()}>{t('form.add')}</button>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('settings.about')}</h3>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
          <div>{t('settings.created')}: {new Date(workspace.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}</div>
          <div>{t('settings.database_path')}: {workspace.path}</div>
        </div>

        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button
            className="btn btn-danger"
            onClick={async () => {
              const ok = await confirm({ title: t('form.delete'), message: t('workspace.delete_confirm'), danger: true, confirmLabel: t('form.delete'), cancelLabel: t('sidebar.cancel') })
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
