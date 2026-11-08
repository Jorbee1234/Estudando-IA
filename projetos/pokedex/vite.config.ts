import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'] },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    preprocessorOptions: {
      scss: { loadPaths: [fileURLToPath(new URL('./src', import.meta.url))] },
    },
  },
})
