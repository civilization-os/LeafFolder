import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

let db: SqlJsDatabase | null = null
let dbPath: string = ''
let transactionDepth = 0

function ensureWasmFile() {
  const wasmFileName = 'sql-wasm.wasm'
  const possibleSources = [
    path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', wasmFileName),
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', wasmFileName),
    path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', wasmFileName),
  ]
  const dest = path.join(__dirname, wasmFileName)
  if (fs.existsSync(dest)) return
  for (const src of possibleSources) {
    if (fs.existsSync(src)) { fs.copyFileSync(src, dest); return }
  }
  console.warn('Could not find sql-wasm.wasm')
}

export async function initDatabase(): Promise<SqlJsDatabase> {
  ensureWasmFile()
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(__dirname, file),
  })

  dbPath = process.env.VITE_DEV_SERVER_URL
    ? path.join(app.getPath('userData'), 'folder-manager.db')
    : path.join(process.resourcesPath, 'data', 'folder-manager.db')

  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath))
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode=WAL')
  db.run('PRAGMA foreign_keys=ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'folder',
      color TEXT DEFAULT '#6b7280',
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
      description TEXT DEFAULT '',
      size_bytes INTEGER DEFAULT 0,
      file_count INTEGER DEFAULT 0,
      is_leaf INTEGER DEFAULT 1,
      starred INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6b7280',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Insert default tags
  db.run(`INSERT OR IGNORE INTO tags (name, color) VALUES ('文档', '#12b5e5')`)
  db.run(`INSERT OR IGNORE INTO tags (name, color) VALUES ('项目', '#30a46c')`)
  db.run(`INSERT OR IGNORE INTO tags (name, color) VALUES ('应用', '#8b5cf6')`)

  saveFile()
  return db!
}

function saveFile() {
  if (db && dbPath && transactionDepth === 0) {
    try { fs.writeFileSync(dbPath, Buffer.from(db.export())) } catch {}
  }
}

export function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function queryAll(sql: string, params?: any[]): any[] {
  const stmt = getDb().prepare(sql)
  if (params) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

export function queryOne(sql: string, params?: any[]): any | undefined {
  const results = queryAll(sql, params)
  return results.length > 0 ? results[0] : undefined
}

export function run(sql: string, params?: any[]): { changes: number; lastInsertRowid?: number } {
  const database = getDb()
  const stmt = database.prepare(sql)
  if (params) stmt.bind(params)
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    stmt.step()
    stmt.free()
    const lastId = database.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0]
    return { changes: 0, lastInsertRowid: lastId }
  }
  stmt.step()
  stmt.free()
  const changes = database.getRowsModified()
  const lastInsertRowid = database.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0]
  saveFile()
  return { changes, lastInsertRowid }
}

export function transaction(fn: () => void) {
  transactionDepth++
  try {
    fn()
    if (transactionDepth === 1) saveFile()
  } finally {
    transactionDepth--
  }
}
