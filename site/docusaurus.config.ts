import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'm3-expressive-react',
  tagline: 'Material Design 3 (Expressive) components for React',
  favicon: 'img/favicon.ico',

  url: 'https://minop1205.github.io',
  baseUrl: '/m3-expressive-react/',
  organizationName: 'minop1205',
  projectName: 'm3-expressive-react',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/', // docs-only site
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/minop1205/m3-expressive-react/tree/develop/site/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'm3-expressive-react',
      items: [
        { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
        { to: '/components', label: 'Components', position: 'left' },
        {
          href: 'https://github.com/minop1205/m3-expressive-react',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `MIT © ${new Date().getFullYear()} Minoru Okuyama. Not affiliated with Google; Material Design is a trademark of Google LLC.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
