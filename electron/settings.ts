import { ipcMain } from 'electron'
import { queryAll, queryOne, run } from './database'
import { execSync } from 'child_process'
import fs from 'fs'

function getDrivesFallback(): { letter: string; size: number }[] {
  const drives: { letter: string; size: number }[] = []
  for (let i = 67; i <= 90; i++) { // C: through Z:
    const letter = String.fromCharCode(i)
    try {
      if (fs.existsSync(letter + ':\\')) {
        let size = 0
        try {
          const info = execSync(
            `powershell -NoProfile -Command "(Get-PSDrive ${letter}).Used + (Get-PSDrive ${letter}).Free"`,
            { encoding: 'utf8', timeout: 5000 }
          )
          size = parseInt(info.trim(), 10) || 0
        } catch {}
        drives.push({ letter: letter + ':', size })
      }
    } catch {}
  }
  return drives.sort((a, b) => b.size - a.size)
}

function detectLargestNonCDrive(): string | null {
  try {
    if (process.platform !== 'win32') return null
    const drives = getDrivesFallback()
    const nonC = drives.find(d => d.letter.toUpperCase() !== 'C:')
    return nonC?.letter ?? (drives.length > 0 ? drives[0].letter : null)
  } catch {
    return null
  }
}

export function registerSettingsHandlers() {
  ipcMain.handle('get-setting', (_event, key: string) => {
    const row = queryOne('SELECT value FROM settings WHERE key = ?', [key])
    return row ? row.value : null
  })

  ipcMain.handle('set-setting', (_event, key: string, value: string) => {
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
    return { success: true }
  })

  ipcMain.handle('get-all-settings', () => {
    const rows = queryAll('SELECT * FROM settings')
    const obj: Record<string, string> = {}
    for (const r of rows) obj[r.key] = r.value
    return obj
  })

  ipcMain.handle('detect-default-drive', () => {
    return detectLargestNonCDrive()
  })

  ipcMain.handle('get-available-drives', () => {
    try {
      if (process.platform !== 'win32') return []
      return getDrivesFallback()
    } catch { return [] }
  })
}
