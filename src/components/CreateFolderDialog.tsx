import { useState, useEffect } from 'react'
import type { Category } from '../types'
import { useI18n } from '../locales/I18nContext'
import { useConfirm } from '../locales/ConfirmContext'

interface Props {
  workspaceId: number
  categories: Category[]
  onClose: () => void
  onCreated: () => void
}

const CAT_COLORS = ['#5e6ad2', '#e5484d', '#30a46c', '#f5a623', '#12b5e5', '#8b5cf6', '#ec4899', '#10b981']
const DEFAULT_CATEGORIES = ['工作', '学习', '个人', '项目', '文档']

export default function CreateFolderDialog({ workspaceId, categories: initialCats, onClose, onCreated }: Props) {
  const { t } = useI18n()
  const { alert } = useConfirm()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(initialCats[0]?.id || 0)
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'create' | 'scan'>('create')
  const [scanPath, setScanPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [allTags, setAllTags] = useState<{ id: number; name: string; color: string }[]>([])
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set())
  // Inline category creation
  const [cats, setCats] = useState<Category[]>(initialCats)
  const [showNewCat, setShowNewCat] = useState(initialCats.length === 0)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#5e6ad2')

  // Scan preview state
  const [scanResults, setScanResults] = useState<{ name: string; path: string }[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [useRegex, setUseRegex] = useState(false)

  useEffect(() => {
    window.api.getTags().then(setAllTags)
  }, [])

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    const cat = await window.api.createCategory(newCatName.trim(), workspaceId, { color: newCatColor })
    setCats(prev => [...prev, cat as unknown as Category])
    setCategoryId(cat.id as unknown as number)
    setNewCatName('')
    setShowNewCat(false)
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    let cid = categoryId
    // If no category selected but user typed one, create it first
    if (!cid && newCatName.trim()) {
      const cat = await window.api.createCategory(newCatName.trim(), workspaceId, { color: newCatColor })
      cid = cat.id as unknown as number
      setCategoryId(cid)
    }
    if (!cid) return
    setLoading(true)
    const tagStr = JSON.stringify(Array.from(selectedTags))
    await window.api.createFolder(name.trim(), cid, workspaceId, description.trim() || undefined, tagStr)
    onCreated()
  }

  const handlePreviewScan = async () => {
    if (!scanPath.trim()) return
    setLoading(true)
    const results = await window.api.previewScanDirectory(scanPath.trim())
    setScanResults(results)
    setSelectedPaths(new Set(results.map(r => r.path)))
    setFilter('')
    setLoading(false)
  }

  const handleImport = async () => {
    let cid = categoryId
    if (!cid && newCatName.trim()) {
      const cat = await window.api.createCategory(newCatName.trim(), workspaceId, { color: newCatColor })
      cid = cat.id as unknown as number
      setCategoryId(cid)
    }
    if (!cid || selectedPaths.size === 0) return
    setLoading(true)
    const items = scanResults.filter(r => selectedPaths.has(r.path))
    const count = await window.api.importScannedFolders(items, workspaceId, cid)
    onCreated()
    setLoading(false)
    await alert({ title: t('folder.scan'), message: t('scan.result', { count }) })
  }

  const toggleSelect = (path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const toggleAll = () => {
    if (filteredResults.length === selectedPaths.size) {
      setSelectedPaths(new Set())
    } else {
      setSelectedPaths(new Set(filteredResults.map(r => r.path)))
    }
  }

  let filteredResults = scanResults
  if (filter) {
    try {
      if (useRegex) {
        const re = new RegExp(filter, 'i')
        filteredResults = scanResults.filter(r => re.test(r.path))
      } else {
        const q = filter.toLowerCase()
        filteredResults = scanResults.filter(r => r.path.toLowerCase().includes(q))
      }
    } catch { /* invalid regex */ }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={scanResults.length > 0 ? { maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' } : undefined}>
        <div className="dialog-title">
          {mode === 'create' ? t('dialog.create_folder') : t('dialog.scan_directory')}
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn ${mode === 'create' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setMode('create'); setScanResults([]) }}>
            {t('dialog.manual')}
          </button>
          <button className={`btn ${mode === 'scan' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setMode('scan'); setScanResults([]) }}>
            {t('folder.scan_existing')}
          </button>
        </div>

        {/* Category: select, quick-create, or custom */}
        {cats.length > 0 && !showNewCat ? (
          <div className="input-group" style={{ marginBottom: 12 }}>
            <select
              value={categoryId}
              onChange={e => setCategoryId(Number(e.target.value))}
              style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              {cats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNewCat(true)} style={{ whiteSpace: 'nowrap' }}>+ {t('settings.new_category')}</button>
          </div>
        ) : showNewCat && cats.length > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>快速添加：</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {DEFAULT_CATEGORIES.filter(d => !cats.some(c => c.name === d)).map((name, i) => (
                <button
                  key={name}
                  className="btn btn-sm"
                  style={{
                    background: `${CAT_COLORS[i % CAT_COLORS.length]}20`,
                    color: CAT_COLORS[i % CAT_COLORS.length],
                    border: `1px solid ${CAT_COLORS[i % CAT_COLORS.length]}40`,
                  }}
                  onClick={async () => {
                    const cat = await window.api.createCategory(name, workspaceId, { color: CAT_COLORS[i % CAT_COLORS.length] })
                    setCats(prev => [...prev, cat as unknown as Category])
                    setCategoryId(cat.id as unknown as number)
                    setShowNewCat(false)
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
                autoFocus
              />
              <div className="flex gap-1">
                {CAT_COLORS.map(c => (
                  <button key={c} onClick={() => setNewCatColor(c)} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: newCatColor === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleAddCategory} disabled={!newCatName.trim()}>{t('form.add')}</button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('folder.select_category')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DEFAULT_CATEGORIES.map((name, i) => (
                <button
                  key={name}
                  className="btn btn-sm"
                  style={{
                    background: `${CAT_COLORS[i % CAT_COLORS.length]}20`,
                    color: CAT_COLORS[i % CAT_COLORS.length],
                    border: `1px solid ${CAT_COLORS[i % CAT_COLORS.length]}40`,
                  }}
                  onClick={async () => {
                    const cat = await window.api.createCategory(name, workspaceId, { color: CAT_COLORS[i % CAT_COLORS.length] })
                    setCats(prev => [...prev, cat as unknown as Category])
                    setCategoryId(cat.id as unknown as number)
                    setShowNewCat(false)
                  }}
                >
                  + {name}
                </button>
              ))}
              <button className="btn btn-sm btn-ghost" onClick={() => setShowNewCat(true)} style={{ border: '1px dashed var(--border)' }}>
                {t('settings.new_category')}⋯
              </button>
            </div>
          </div>
        )}

        {mode === 'create' ? (
          <>
            <input
              placeholder={t('folder.name')}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus={cats.length > 0}
            />
            <textarea
              placeholder={t('folder.description')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              style={{ resize: 'none', marginTop: 8 }}
            />
            {allTags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {allTags.map(tag => (
                  <label
                    key={tag.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11,
                      borderRadius: 'var(--radius-sm)', border: `1px solid ${selectedTags.has(tag.id) ? tag.color : 'var(--border)'}`,
                      background: selectedTags.has(tag.id) ? `${tag.color}20` : 'transparent',
                      color: selectedTags.has(tag.id) ? tag.color : 'var(--text-secondary)',
                      transition: 'all 0.1s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag.id)}
                      onChange={() => setSelectedTags(prev => { const next = new Set(prev); if (next.has(tag.id)) next.delete(tag.id); else next.add(tag.id); return next })}
                      style={{ display: 'none' }}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            )}
            <div className="dialog-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={onClose}>{t('sidebar.cancel')}</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading || !name.trim() || (!categoryId && !newCatName.trim())}>
                {loading ? '⋯' : t('sidebar.create')}
              </button>
            </div>
          </>
        ) : scanResults.length > 0 ? (
          <>
            <div className="input-group" style={{ marginBottom: 8, flexShrink: 0 }}>
              <input
                placeholder={t('scan.filter')}
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <button className={`btn btn-sm ${useRegex ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setUseRegex(!useRegex)} style={{ fontSize: 11 }}>
                {t('scan.regex')}
              </button>
            </div>
            <div className="flex items-center gap-2" style={{ marginBottom: 8, flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={filteredResults.length > 0 && filteredResults.length === selectedPaths.size} onChange={toggleAll} />
                {t('scan.select_all')}
              </label>
              <span style={{ marginLeft: 'auto' }}>{selectedPaths.size} / {scanResults.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 12, minHeight: 0 }}>
              {filteredResults.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>{t('scan.no_results')}</div>
              ) : (
                filteredResults.map(r => (
                  <label key={r.path} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={selectedPaths.has(r.path)} onChange={() => toggleSelect(r.path)} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.path}</span>
                  </label>
                ))
              )}
            </div>
            <div className="dialog-actions" style={{ flexShrink: 0 }}>
              <button className="btn btn-ghost" onClick={() => { setScanResults([]); setSelectedPaths(new Set()) }}>{t('sidebar.cancel')}</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={loading || selectedPaths.size === 0}>
                {loading ? '⋯' : t('scan.import_selected', { count: selectedPaths.size })}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="input-group">
              <input
                placeholder={t('folder.directory_path')}
                value={scanPath}
                onChange={e => setScanPath(e.target.value)}
                style={{ flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && handlePreviewScan()}
              />
              <button className="btn btn-ghost btn-icon" onClick={async () => { const dir = await window.api.selectDirectory(); if (dir) setScanPath(dir) }}>📁</button>
            </div>
            <div className="dialog-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={onClose}>{t('sidebar.cancel')}</button>
              <button className="btn btn-primary" onClick={handlePreviewScan} disabled={loading || !scanPath.trim()}>
                {loading ? '⋯' : t('folder.scan')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
