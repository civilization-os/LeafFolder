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
  <a href="./README.md">English</a> | <b>简体中文</b>
</p>

---

LeafFolder 是一款**桌面文件夹管理工具**，帮助你发现、整理和管理**叶子文件夹**（没有子目录的终端目录）。它将深层目录树扁平化为清晰易览的列表，让你不再丢失散落的项目和文档。

## ✨ 功能特性

- **多工作区** — 创建独立的工作区，每个工作区拥有独立的文件夹集合
- **分类管理** — 按分类组织文件夹（工作、学习、个人等），内置默认分类开箱即选
- **标签系统** — 内置和自定义标签（文档、项目、应用），灵活标记
- **扫描已有目录** — 预览并导入任意目录中的现有文件夹结构，支持正则筛选
- **三种视图** — 卡片网格、紧凑列表、大图标浏览
- **多选与批量操作** — 一次选择多个文件夹进行批量处理
- **收藏（星标）** — 星标重要文件夹，快速定位
- **文件统计** — 刷新查看每个文件夹的文件数量和占用空间
- **内置默认值** — 预置分类和标签，开箱即用
- **国际化** — 中文和英文界面
- **右键菜单** — 右键文件夹快速操作（打开、星标、统计、删除）
- **深色主题** — 现代深色 UI，适合长时间使用

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm

### 安装

```bash
git clone https://github.com/civilization-os/LeafFolder.git
cd LeafFolder
npm install
```

### 开发模式

```bash
npm run dev
```

然后在另一个终端启动 Electron：

```bash
VITE_DEV_SERVER_URL=http://localhost:5173 npx electron .
```

或构建生产版本：

```bash
npm run build
```

## 🏗️ 项目结构

```
LeafFolder/
├── electron/              # Electron 主进程
│   ├── main.ts            # 应用入口、窗口创建
│   ├── handlers.ts        # IPC 处理器（文件夹、分类等）
│   ├── settings.ts        # 设置与驱动器检测
│   ├── database.ts        # SQLite (sql.js) 初始化与查询
│   ├── menu.ts            # 原生菜单与右键菜单
│   └── preload.ts         # 上下文桥接（安全 IPC）
├── src/                   # React 渲染进程
│   ├── App.tsx            # 根组件
│   ├── components/        # UI 组件
│   │   ├── FolderGrid.tsx       # 文件夹卡片/列表/图标视图
│   │   ├── CreateFolderDialog.tsx # 新建文件夹 + 扫描导入
│   │   ├── WorkspaceSettings.tsx # 工作区设置
│   │   ├── Sidebar.tsx          # 侧边栏导航
│   │   ├── DrivePickerDialog.tsx # 首次启动盘符选择
│   │   └── ConfirmDialog.tsx    # 自定义确认/提示对话框
│   ├── locales/           # 国际化（中文/英文）
│   └── types/             # TypeScript 类型定义
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 📦 数据模型

| 实体 | 说明 |
|------|------|
| **工作区 (Workspace)** | 独立环境，拥有自己的文件夹集合和路径 |
| **分类 (Category)** | 用于组织文件夹的分类标签（按工作区隔离） |
| **文件夹 (Folder)** | 叶子文件夹，包含元数据、标签和统计信息 |
| **标签 (Tag)** | 全局标签，用于跨分类标记（文档、项目、应用） |

## 📸 截图

> *即将推出*

## 🤝 贡献

欢迎提交 issue 和功能请求！请访问 [Issues 页面](https://github.com/civilization-os/LeafFolder/issues)。

## 📄 许可

[MIT](./LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/civilization-os">civilization-os</a>
</p>
