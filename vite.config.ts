/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import dts from 'vite-plugin-dts'

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
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
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name === 'style.css' ? 'styles.css' : (assetInfo.name ?? '[name][extname]'),
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
