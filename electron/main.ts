import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import { initDatabase } from './database'
import { registerFolderHandlers } from './handlers'
import { registerSettingsHandlers } from './settings'
import { setAppMenu, registerMenuHandlers } from './menu'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  const db = await initDatabase()

  // Load saved language and set menu
  const savedLang = db.exec("SELECT value FROM settings WHERE key = 'lang'")
  const lang: 'zh' | 'en' = (savedLang?.[0]?.values?.[0]?.[0] as string) === 'en' ? 'en' : 'zh'
  setAppMenu(lang)

  registerFolderHandlers()
  registerSettingsHandlers()
  registerMenuHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Context menu for folder cards
ipcMain.handle('show-folder-context-menu', (event, actions: { starred: boolean }) => {
  // Load language from DB for i18n
  const db = require('./database').getDb()
  const langResult = db.exec("SELECT value FROM settings WHERE key = 'lang'")
  const lang: 'zh' | 'en' = (langResult?.[0]?.values?.[0]?.[0] as string) === 'en' ? 'en' : 'zh'
  const s = lang === 'zh' ? {
    open: '在资源管理器中打开',
    star: '星标',
    unstar: '取消星标',
    refresh: '刷新统计',
    delete: '删除',
  } : {
    open: 'Open in File Explorer',
    star: 'Star',
    unstar: 'Unstar',
    refresh: 'Refresh Stats',
    delete: 'Delete',
  }

  const template = [
    { label: s.open, id: 'open', click: () => event.sender.send('context-menu-action', 'open') },
    { type: 'separator' as const },
    { label: actions.starred ? s.unstar : s.star, id: 'star', click: () => event.sender.send('context-menu-action', 'star') },
    { label: s.refresh, id: 'refresh', click: () => event.sender.send('context-menu-action', 'refresh') },
    { type: 'separator' as const },
    { label: s.delete, id: 'delete', click: () => event.sender.send('context-menu-action', 'delete') },
  ]
  const menu = Menu.buildFromTemplate(template)
  menu.popup()
})
