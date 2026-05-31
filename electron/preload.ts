import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Workspaces
  createWorkspace: (name: string, path: string) => ipcRenderer.invoke('create-workspace', name, path),
  getWorkspaces: () => ipcRenderer.invoke('get-workspaces'),
  deleteWorkspace: (id: number) => ipcRenderer.invoke('delete-workspace', id),

  // Tags
  getTags: () => ipcRenderer.invoke('get-tags'),

  // Categories
  createCategory: (name: string, workspaceId: number, opts?: { parentId?: number; icon?: string; color?: string; appPath?: string; appName?: string }) =>
    ipcRenderer.invoke('create-category', name, workspaceId, opts),
  getCategories: (workspaceId: number) => ipcRenderer.invoke('get-categories', workspaceId),
  updateCategory: (id: number, data: { name?: string; icon?: string; color?: string; appPath?: string | null; appName?: string | null }) =>
    ipcRenderer.invoke('update-category', id, data),
  deleteCategory: (id: number) => ipcRenderer.invoke('delete-category', id),

  // Folders
  getFolders: (workspaceId?: number) => ipcRenderer.invoke('get-folders', workspaceId),
  createFolder: (name: string, categoryId: number, workspaceId: number, description?: string, tags?: string) =>
    ipcRenderer.invoke('create-folder', name, categoryId, workspaceId, description, tags),
  updateFolder: (id: number, data: { name?: string; description?: string; starred?: number; category_id?: number; tags?: string }) =>
    ipcRenderer.invoke('update-folder', id, data),
  deleteFolder: (id: number) => ipcRenderer.invoke('delete-folder', id),
  batchDeleteFolders: (ids: number[]) => ipcRenderer.invoke('batch-delete-folders', ids),
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
  scanDirectory: (dirPath: string, workspaceId: number, categoryId: number) =>
    ipcRenderer.invoke('scan-directory', dirPath, workspaceId, categoryId),
  refreshFolderStats: (id: number) => ipcRenderer.invoke('refresh-folder-stats', id),

  // Scan preview & import
  previewScanDirectory: (dirPath: string) => ipcRenderer.invoke('preview-scan-directory', dirPath),
  importScannedFolders: (items: { path: string; name: string }[], workspaceId: number, categoryId: number) =>
    ipcRenderer.invoke('import-scanned-folders', items, workspaceId, categoryId),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('set-setting', key, value),
  getAllSettings: () => ipcRenderer.invoke('get-all-settings'),

  // Dialogs
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectExecutable: () => ipcRenderer.invoke('select-executable'),
  openFolderWithApp: (folderPath: string, appPath: string) => ipcRenderer.invoke('open-folder-with-app', folderPath, appPath),

  // Default drive
  detectDefaultDrive: () => ipcRenderer.invoke('detect-default-drive'),
  getAvailableDrives: () => ipcRenderer.invoke('get-available-drives'),

  // Menu language
  setMenuLanguage: (lang: string) => ipcRenderer.invoke('set-language', lang),

  // Show folder context menu
  showFolderContextMenu: (starred: boolean, appName?: string) => ipcRenderer.invoke('show-folder-context-menu', { starred, appName }),

  // Window controls for custom title bar
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChanged: (callback: (maximized: boolean) => void) => {
    const handler = (_event: any, maximized: boolean) => callback(maximized)
    ipcRenderer.on('window-maximized-changed', handler)
    return () => ipcRenderer.removeListener('window-maximized-changed', handler)
  },

  // Context menu actions from main process
  onContextMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action)
    ipcRenderer.on('context-menu-action', handler)
    // Return cleanup
    return () => ipcRenderer.removeListener('context-menu-action', handler)
  },
}

contextBridge.exposeInMainWorld('api', api)
