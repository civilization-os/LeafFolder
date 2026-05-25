<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/LeafFolder-📁-5e6ad2?style=for-the-badge&labelColor=1a1a2e">
    <img src="https://img.shields.io/badge/LeafFolder-📁-5e6ad2?style=for-the-badge&labelColor=f0f0f0">
  </picture>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

<p align="center">
  <b>English</b> | <a href="./README.zh-cn.md">简体中文</a>
</p>

---

LeafFolder is a **desktop folder manager** that helps you discover, organize, and manage **leaf folders** — terminal directories with no subdirectories. It flattens deep directory trees into a clean, browsable list so you never lose track of your scattered projects and documents.

## ✨ Features

- **Multi-Workspace** — Create isolated workspaces, each with its own folder collection
- **Category Classification** — Organize folders by category (Work, Study, Personal, etc.) with quick-select defaults
- **Tagging System** — Built-in and custom tags (Documents, Projects, Apps) for flexible labeling
- **Scan Existing Directories** — Preview and import existing folder structures from any directory with regex filtering
- **Three View Modes** — Card grid, compact list, and large icon view
- **Multi-Select & Batch Operations** — Select multiple folders at once for bulk operations
- **Favorites (Star)** — Star important folders for quick access
- **File Stats** — Refresh per-folder file count and size
- **Built-in Defaults** — Ships with preset categories and tags, ready to use out of the box
- **i18n Support** — English and Chinese (简体中文) interfaces
- **Context Menu** — Right-click folders for quick actions (open, star, stats, delete)
- **Dark Theme** — Modern dark UI designed for extended use

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/civilization-os/LeafFolder.git
cd LeafFolder
npm install
```

### Development

```bash
npm run dev
```

Then start Electron in a separate terminal:

```bash
VITE_DEV_SERVER_URL=http://localhost:5173 npx electron .
```

Or build for production:

```bash
npm run build
```

## 🏗️ Architecture

```
LeafFolder/
├── electron/              # Electron main process
│   ├── main.ts            # App entry, window creation
│   ├── handlers.ts        # IPC handlers (folders, categories, etc.)
│   ├── settings.ts        # Settings & drive detection
│   ├── database.ts        # SQLite (sql.js) initialization & queries
│   ├── menu.ts            # Native menu & context menu
│   └── preload.ts         # Context bridge (secure IPC)
├── src/                   # React renderer
│   ├── App.tsx            # Root component
│   ├── components/        # UI components
│   │   ├── FolderGrid.tsx       # Folder grid/list/icon views
│   │   ├── CreateFolderDialog.tsx # Folder creation + scan import
│   │   ├── WorkspaceSettings.tsx # Workspace configuration
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── DrivePickerDialog.tsx # First-launch drive selection
│   │   └── ConfirmDialog.tsx    # Custom confirm/alert dialogs
│   ├── locales/           # i18n (en/zh)
│   └── types/             # TypeScript type definitions
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 📦 Data Model

| Entity      | Description |
|-------------|-------------|
| **Workspace** | An isolated environment with its own folder collection and path |
| **Category** | Classification label for organizing folders (workspace-scoped) |
| **Folder** | A leaf folder (terminal directory) with metadata, tags, and stats |
| **Tag** | Global labels for cross-cutting organization (Documents, Projects, Apps) |

## 📸 Screenshots

> *Coming soon*

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/civilization-os/LeafFolder/issues).

## 📄 License

[MIT](./LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/civilization-os">civilization-os</a>
</p>
