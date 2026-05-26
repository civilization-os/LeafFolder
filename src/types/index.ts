export interface Tag {
  id: number
  name: string
  color: string
  created_at: string
}

export interface Workspace {
  id: number
  name: string
  path: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  icon: string
  color: string
  parent_id: number | null
  sort_order: number
  workspace_id: number
  app_path: string | null
  app_name: string | null
  created_at: string
  updated_at: string
}

export interface Folder {
  id: number
  name: string
  path: string
  category_id: number | null
  workspace_id: number
  description: string
  size_bytes: number
  file_count: number
  is_leaf: number
  starred: number
  tags: string
  created_at: string
  updated_at: string
  category_name?: string
  workspace_name?: string
  category_color?: string
  category_app_path?: string | null
  category_app_name?: string | null
}

export interface Api {
  createWorkspace: (name: string, path: string) => Promise<Workspace>
  getWorkspaces: () => Promise<Workspace[]>
  deleteWorkspace: (id: number) => Promise<void>
  getTags: () => Promise<Tag[]>
  createCategory: (name: string, workspaceId: number, opts?: { parentId?: number; icon?: string; color?: string; appPath?: string; appName?: string }) => Promise<Category>
  getCategories: (workspaceId: number) => Promise<Category[]>
  updateCategory: (id: number, data: { name?: string; icon?: string; color?: string; appPath?: string | null; appName?: string | null }) => Promise<void>
  deleteCategory: (id: number) => Promise<void>
  getFolders: (workspaceId?: number) => Promise<Folder[]>
  createFolder: (name: string, categoryId: number, workspaceId: number, description?: string, tags?: string) => Promise<Folder>
  updateFolder: (id: number, data: Partial<Pick<Folder, 'name' | 'description' | 'starred' | 'category_id' | 'tags'>>) => Promise<void>
  deleteFolder: (id: number) => Promise<void>
  batchDeleteFolders: (ids: number[]) => Promise<void>
  openFolder: (path: string) => Promise<void>
  scanDirectory: (dirPath: string, workspaceId: number, categoryId: number) => Promise<number>
  previewScanDirectory: (dirPath: string) => Promise<{ name: string; path: string }[]>
  importScannedFolders: (items: { name: string; path: string }[], workspaceId: number, categoryId: number) => Promise<number>
  refreshFolderStats: (id: number) => Promise<{ sizeBytes: number; fileCount: number }>
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
  getAllSettings: () => Promise<Record<string, string>>
  selectDirectory: () => Promise<string | null>
  selectExecutable: () => Promise<{ path: string; name: string } | null>
  openFolderWithApp: (folderPath: string, appPath: string) => Promise<void>
  detectDefaultDrive: () => Promise<string | null>
  getAvailableDrives: () => Promise<{ letter: string; size: number }[]>
  setMenuLanguage: (lang: string) => Promise<void>
  showFolderContextMenu: (starred: boolean, appName?: string) => Promise<void>
  onContextMenuAction: (callback: (action: string) => void) => () => void
}

declare global {
  interface Window {
    api: Api
  }
}
