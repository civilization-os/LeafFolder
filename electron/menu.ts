import { Menu, app, BrowserWindow, MenuItemConstructorOptions, ipcMain } from 'electron'

type Lang = 'zh' | 'en'

const strings: Record<Lang, Record<string, string>> = {
  zh: {
    file: '文件',
    new_workspace: '新建工作区',
    preferences: '偏好设置',
    separator: '分隔线',
    quit: '退出',
    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    select_all: '全选',
    view: '视图',
    reload: '重新加载',
    toggle_devtools: '开发者工具',
    zoom_in: '放大',
    zoom_out: '缩小',
    reset_zoom: '重置缩放',
    help: '帮助',
    about: '关于 LeafFolder',
    folder_context_open: '在资源管理器中打开',
    folder_context_star: '星标',
    folder_context_unstar: '取消星标',
    folder_context_refresh: '刷新统计',
    folder_context_delete: '删除',
  },
  en: {
    file: 'File',
    new_workspace: 'New Workspace',
    preferences: 'Preferences',
    separator: 'separator',
    quit: 'Quit',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    select_all: 'Select All',
    view: 'View',
    reload: 'Reload',
    toggle_devtools: 'Toggle Developer Tools',
    zoom_in: 'Zoom In',
    zoom_out: 'Zoom Out',
    reset_zoom: 'Reset Zoom',
    help: 'Help',
    about: 'About LeafFolder',
    folder_context_open: 'Open in File Explorer',
    folder_context_star: 'Star',
    folder_context_unstar: 'Unstar',
    folder_context_refresh: 'Refresh Stats',
    folder_context_delete: 'Delete',
  },
}

function buildMenu(lang: Lang): Menu {
  const s = strings[lang]
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    {
      label: s.file,
      submenu: [
        { label: s.new_workspace, accelerator: 'CmdOrCtrl+N' },
        { type: 'separator' },
        isMac ? { role: 'close' as const, label: s.quit } : { role: 'quit' as const, label: s.quit },
      ],
    },
    {
      label: s.edit,
      submenu: [
        { label: s.undo, role: 'undo' },
        { label: s.redo, role: 'redo' },
        { type: 'separator' },
        { label: s.cut, role: 'cut' },
        { label: s.copy, role: 'copy' },
        { label: s.paste, role: 'paste' },
        { label: s.select_all, role: 'selectAll' },
      ],
    },
    {
      label: s.view,
      submenu: [
        { label: s.reload, role: 'reload' },
        { label: s.toggle_devtools, role: 'toggleDevTools', accelerator: 'F12' },
        { type: 'separator' },
        { label: s.zoom_in, role: 'zoomIn' },
        { label: s.zoom_out, role: 'zoomOut' },
        { label: s.reset_zoom, role: 'resetZoom' },
      ],
    },
    {
      label: s.help,
      submenu: [
        { label: s.about, click: () => {
          const win = BrowserWindow.getFocusedWindow()
          if (win) {
            win.webContents.executeJavaScript(`alert('LeafFolder v0.1.0')`)
          }
        }},
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}

export function setAppMenu(lang: Lang) {
  const menu = buildMenu(lang)
  Menu.setApplicationMenu(menu)
}

export function registerMenuHandlers() {
  ipcMain.handle('set-language', (_event, lang: Lang) => {
    setAppMenu(lang)
  })
}
