/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import dts from 'vite-plugin-dts'
import {
  addDeclarationExtensions,
  libEntries,
  moduleFileName,
  subpathEntries,
} from './scripts/vite-plugin-subpath-entries.ts'

const src = resolve(import.meta.dirname, 'src')

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
    // Per-file declarations mirroring the preserveModules output: `.d.ts`
    // (ESM, fully specified imports) + `.d.cts` twins for the `require`
    // condition. Not bundled, so the root and subpath entries share one
    // declaration of every type.
    dts({
      include: ['src'],
      exclude: ['src/**/*.stories.*', 'src/**/*.test.*', 'src/test'],
      outDirs: ['dist', { dir: 'dist', moduleFormat: 'cjs' }],
      beforeWriteFile: addDeclarationExtensions(
        src,
        resolve(import.meta.dirname, 'dist'),
      ),
    }),
    subpathEntries({ srcDir: src }),
  ],
  build: {
    lib: {
      // Root barrel + one entry per component folder (subpath imports, #378).
      entry: libEntries(src),
      formats: ['es', 'cjs'],
      fileName: moduleFileName,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // One output file per source module: shared code (primitives,
        // internal hooks, theme) is emitted once and shared by every entry.
        preserveModules: true,
        preserveModulesRoot: src,
        // Subpath entries have a default + named exports; CJS exposes the
        // default as `exports.default` (with `__esModule`).
        exports: 'named',
      },
    },
    // Per-module CSS; subpathEntries() assembles styles.css / tokens.css and
    // the per-component CSS imports.
    cssCodeSplit: true,
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
