import { ipcMain, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
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
    opts?: { parentId?: number; icon?: string; color?: string; appPath?: string; appName?: string }
  ) => {
    const result = run(
      'INSERT INTO categories (name, workspace_id, parent_id, icon, color, app_path, app_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, workspaceId, opts?.parentId ?? null, opts?.icon ?? 'folder', opts?.color ?? '#6b7280', opts?.appPath ?? null, opts?.appName ?? null]
    )
    return { id: result.lastInsertRowid, name, workspace_id: workspaceId }
  })

  // Get categories by workspace
  ipcMain.handle('get-categories', (_event, workspaceId: number) => {
    return queryAll('SELECT * FROM categories WHERE workspace_id = ? ORDER BY parent_id IS NOT NULL, sort_order, name', [workspaceId])
  })

  // Update category
  ipcMain.handle('update-category', (_event, id: number, data: { name?: string; icon?: string; color?: string; appPath?: string | null; appName?: string | null }) => {
    const updates: string[] = []
    const params: (string | number | null)[] = []
    if (data.name) { updates.push('name = ?'); params.push(data.name) }
    if (data.icon) { updates.push('icon = ?'); params.push(data.icon) }
    if (data.color) { updates.push('color = ?'); params.push(data.color) }
    if (data.appPath !== undefined) { updates.push('app_path = ?'); params.push(data.appPath) }
    if (data.appName !== undefined) { updates.push('app_name = ?'); params.push(data.appName) }
    updates.push("updated_at = datetime('now')")
    params.push(id)
    run(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params)
    return { success: true }
  })

  // Delete category (nullify folder references, reassign sub-categories)
  ipcMain.handle('delete-category', (_event, id: number) => {
    run('UPDATE folders SET category_id = NULL WHERE category_id = ?', [id])
    run('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [id])
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
      SELECT f.*,
        COALESCE(c.name, pc.name) as category_name,
        COALESCE(c.color, pc.color) as category_color,
        COALESCE(c.app_path, pc.app_path) as category_app_path,
        COALESCE(c.app_name, pc.app_name) as category_app_name,
        c.name as subcategory_name,
        w.name as workspace_name
      FROM folders f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
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

  // Select executable file dialog
  ipcMain.handle('select-executable', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Executables', extensions: ['exe', 'bat', 'cmd', 'com'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      const name = path.basename(filePath, path.extname(filePath))
      return { path: filePath, name }
    }
    return null
  })

  // Open folder with a specific application (single-instance)
  const runningApps = new Set<string>()

  ipcMain.handle('open-folder-with-app', async (_event, folderPath: string, appPath: string) => {
    if (!appPath.includes('\\') && !appPath.includes('/') && !appPath.includes('.')) {
      shell.openPath(folderPath); return
    }
    if (!fs.existsSync(appPath)) {
      shell.openPath(folderPath); return
    }

    if (runningApps.has(appPath)) {
      // Instance already launched — open folder in existing app
      exec(`"${appPath}" "${folderPath}"`, (err) => {
        if (err) console.error('Failed to open folder in existing app:', err)
      })
    } else {
      // Launch new instance
      runningApps.add(appPath)

      exec(`"${appPath}" "${folderPath}"`, (err) => {
        if (err) {
          console.error('Failed to open folder with app:', err)
          runningApps.delete(appPath)
          // Fallback: open in Explorer
          shell.openPath(folderPath)
        }
      })

      // Some apps use a launcher stub (e.g. VS Code's Code.exe) that exits
      // quickly after starting the real process. Keep the flag for a short
      // debounce to prevent rapid re-launches.
      setTimeout(() => runningApps.delete(appPath), 3000)
    }
  })
}
