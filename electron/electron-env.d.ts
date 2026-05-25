/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    DIST: string
    DIST_ELECTRON: string
    VITE_PUBLIC: string
  }
}
