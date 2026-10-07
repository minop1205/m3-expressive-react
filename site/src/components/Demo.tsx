import React from 'react'
import { useColorMode } from '@docusaurus/theme-common'
import { ThemeProvider } from 'm3-expressive-react'
import 'm3-expressive-react/styles.css'

/**
 * Live-demo frame: provides the library ThemeProvider (mode synced with the
 * Docusaurus color scheme) and an MD3 surface background, so demo code in the
 * page body is exactly what a consumer writes inside their own provider.
 */
export default function Demo({
  children,
  seedColor = '#6750A4',
}: {
  children: React.ReactNode
  seedColor?: string
}) {
  const { colorMode } = useColorMode()
  return (
    <ThemeProvider seedColor={seedColor} mode={colorMode === 'dark' ? 'dark' : 'light'}>
      <div
        className="m3-demo"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
          padding: 24,
          marginBottom: 16,
          borderRadius: 12,
          border: '1px solid var(--md-sys-color-outline-variant)',
          background: 'var(--md-sys-color-surface)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        {children}
      </div>
    </ThemeProvider>
  )
}
