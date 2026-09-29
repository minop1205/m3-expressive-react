/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import dts from 'vite-plugin-dts'

export default defineConfig({
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  plugins: [
    react(),
    // Stories import Material Symbols as `*.svg?react` React components. Only
    // stories/demos use these; the library entry (src/index.ts) never imports a
    // `?react` SVG, so this adds no runtime dependency to the published bundle.
    svgr({ svgrOptions: { icon: true, svgProps: { fill: 'currentColor' } } }),
    dts({
      include: ['src'],
      exclude: ['src/**/*.stories.*', 'src/**/*.test.*', 'src/test'],
      bundleTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      // Vite ≥5.4 names the lib CSS after the package by default; keep the
      // published ./styles.css export stable
      cssFileName: 'styles',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // vrt/ is a Playwright suite (npm run vrt), not a Vitest one; .claude/
    // can hold agent worktrees (full repo copies incl. their node_modules),
    // and the node_modules/dist patterns must match at ANY depth.
    exclude: ['**/node_modules/**', '**/dist/**', 'vrt/**', '.claude/**'],
  },
})
