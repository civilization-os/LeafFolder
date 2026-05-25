import { ipcMain, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { queryAll, queryOne, run, transaction } from './database'

export function registerFolderHandlers() {
  // Create workspace
  ipcMain.handle('create-workspace', async (_event, name: string, dirPath: string) => {
    const resolved = path.resolve(dirPath)
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true })
    }
    const result = run('INSERT INTO workspaces (name, path) VALUES (?, ?)', [name, resolved])
    return { id: result.lastInsertRowid, name, path: resolved }
  })

  // Get all workspaces
  ipcMain.handle('get-workspaces', () => {
    return queryAll('SELECT * FROM workspaces ORDER BY created_at')
  })

  // Delete workspace
  ipcMain.handle('delete-workspace', (_event, id: number) => {
    run('DELETE FROM workspaces WHERE id = ?', [id])
    return { success: true }
  })

  // Create category
  ipcMain.handle('create-category', (
    _event,
    name: string,
    workspaceId: number,
    opts?: { parentId?: number; icon?: string; color?: string }
  ) => {
    const result = run(
      'INSERT INTO categories (name, workspace_id, parent_id, icon, color) VALUES (?, ?, ?, ?, ?)',
      [name, workspaceId, opts?.parentId ?? null, opts?.icon ?? 'folder', opts?.color ?? '#6b7280']
    )
    return { id: result.lastInsertRowid, name, workspace_id: workspaceId }
  })

  // Get categories by workspace
  ipcMain.handle('get-categories', (_event, workspaceId: number) => {
    return queryAll('SELECT * FROM categories WHERE workspace_id = ? ORDER BY sort_order, name', [workspaceId])
  })

  // Update category
  ipcMain.handle('update-category', (_event, id: number, data: { name?: string; icon?: string; color?: string }) => {
    const updates: string[] = []
    const params: (string | number)[] = []
    if (data.name) { updates.push('name = ?'); params.push(data.name) }
    if (data.icon) { updates.push('icon = ?'); params.push(data.icon) }
    if (data.color) { updates.push('color = ?'); params.push(data.color) }
    updates.push("updated_at = datetime('now')")
    params.push(id)
    run(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params)
    return { success: true }
  })

  // Delete category (nullify folder references first)
  ipcMain.handle('delete-category', (_event, id: number) => {
    run('UPDATE folders SET category_id = NULL WHERE category_id = ?', [id])
    run('DELETE FROM categories WHERE id = ?', [id])
    return { success: true }
  })

  // Create a folder (and its physical directory)
  ipcMain.handle('create-folder', (
    _event,
    name: string,
    categoryId: number,
    workspaceId: number,
    description?: string,
    tags?: string
  ) => {
    const ws = queryOne('SELECT * FROM workspaces WHERE id = ?', [workspaceId])
    const folderPath = path.join(ws.path, name)

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }

    const result = run(
      'INSERT INTO folders (name, path, category_id, workspace_id, description, tags) VALUES (?, ?, ?, ?, ?, ?)',
      [name, folderPath, categoryId, workspaceId, description ?? '', tags ?? '[]']
    )
    return { id: result.lastInsertRowid, name, path: folderPath }
  })

  // Get all leaf folders (flattened view)
  ipcMain.handle('get-folders', (_event, workspaceId?: number) => {
    let query = `
      SELECT f.*, c.name as category_name, c.color as category_color, w.name as workspace_name
      FROM folders f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN workspaces w ON f.workspace_id = w.id
    `
    const params: number[] = []
    if (workspaceId) {
      query += ' WHERE f.workspace_id = ?'
      params.push(workspaceId)
    }
    query += ' ORDER BY f.starred DESC, f.updated_at DESC'
    return queryAll(query, params.length ? params : undefined)
  })

  // Update folder
  ipcMain.handle('update-folder', (_event, id: number, data: {
    name?: string; description?: string; starred?: number; category_id?: number; tags?: string
  }) => {
    const updates: string[] = []
    const params: (string | number)[] = []
    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description) }
    if (data.starred !== undefined) { updates.push('starred = ?'); params.push(data.starred) }
    if (data.category_id !== undefined) { updates.push('category_id = ?'); params.push(data.category_id) }
    if (data.tags !== undefined) { updates.push('tags = ?'); params.push(data.tags) }
    updates.push("updated_at = datetime('now')")
    params.push(id)
    run(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`, params)
    return { success: true }
  })

  // Delete folder (DB entry only, does not touch disk)
  ipcMain.handle('delete-folder', (_event, id: number) => {
    run('DELETE FROM folders WHERE id = ?', [id])
    return { success: true }
  })

  // Batch delete folders (DB entries only, does not touch disk)
  ipcMain.handle('batch-delete-folders', (_event, ids: number[]) => {
    transaction(() => {
      for (const id of ids) {
        run('DELETE FROM folders WHERE id = ?', [id])
      }
    })
    return { success: true }
  })

  // Open folder in Explorer
  ipcMain.handle('open-folder', (_event, folderPath: string) => {
    shell.openPath(folderPath)
  })

  // Get all tags
  ipcMain.handle('get-tags', () => {
    return queryAll('SELECT * FROM tags ORDER BY name')
  })

  // Select directory dialog
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // Preview scan — just list leaf folders, no insert
  ipcMain.handle('preview-scan-directory', async (_event, dirPath: string) => {
    const leafFolders: { name: string; path: string }[] = []
    const scan = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        const subdirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'))
        if (subdirs.length === 0) {
          leafFolders.push({ name: path.basename(dir), path: dir })
        } else {
          for (const sub of subdirs) {
            scan(path.join(dir, sub.name))
          }
        }
      } catch { /* skip unreadable */ }
    }
    scan(dirPath)
    return leafFolders
  })

  // Import scanned folders (batch insert)
  ipcMain.handle('import-scanned-folders', async (_event, items: { path: string; name: string }[], workspaceId: number, categoryId: number) => {
    let count = 0
    transaction(() => {
      for (const item of items) {
        const result = run('INSERT OR IGNORE INTO folders (name, path, category_id, workspace_id) VALUES (?, ?, ?, ?)',
          [item.name, item.path, categoryId, workspaceId])
        if (result.changes > 0) count++
      }
    })
    return count
  })

  // Refresh folder stats
  ipcMain.handle('refresh-folder-stats', (_event, id: number) => {
    const folder = queryOne('SELECT * FROM folders WHERE id = ?', [id])
    if (!folder || !fs.existsSync(folder.path)) return { success: false }

    let sizeBytes = 0
    let fileCount = 0
    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const e of entries) {
          const fullPath = path.join(dir, e.name)
          if (e.isDirectory()) { walk(fullPath) }
          else if (e.isFile()) { sizeBytes += fs.statSync(fullPath).size; fileCount++ }
        }
      } catch { /* skip */ }
    }
    walk(folder.path)

    run('UPDATE folders SET size_bytes = ?, file_count = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [sizeBytes, fileCount, id])
    return { sizeBytes, fileCount }
  })
}
