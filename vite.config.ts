import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['sql.js'],
            },
          },
          plugins: [{
            name: 'copy-sql-wasm',
            buildStart() {
              const src = path.resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm')
              const destDir = path.resolve(__dirname, 'dist-electron')
              if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
              const dest = path.join(destDir, 'sql-wasm.wasm')
              if (fs.existsSync(src) && !fs.existsSync(dest)) {
                fs.copyFileSync(src, dest)
                console.log('Copied sql-wasm.wasm to dist-electron/')
              }
            }
          }],
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: { outDir: 'dist-electron' },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
