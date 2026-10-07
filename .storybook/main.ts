import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // addon-essentials was folded into storybook core in v9+
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // Docgen is for component prop tables only — keep .storybook/ and
      // config files out (preview.tsx otherwise triggers a "not included
      // in the active TypeScript project" warning on dev startup).
      include: ['src/**/*.tsx'],
    },
  },
  // The project vite.config.ts is merged into Storybook's build, pulling in
  // the library-build-only plugins: vite-plugin-dts (declaration emit) and
  // the subpath-entry assembler (scripts/vite-plugin-subpath-entries.ts).
  // Neither is relevant to Storybook, so strip them here. (dts v5 registers
  // as "unplugin-dts"; "vite:dts" kept for safety.)
  async viteFinal(config) {
    config.plugins = (config.plugins ?? [])
      .flat()
      .filter(
        (p) =>
          !(
            p &&
            typeof p === 'object' &&
            'name' in p &&
            (p.name === 'vite:dts' ||
              p.name === 'unplugin-dts' ||
              p.name === 'm3:subpath-entries')
          ),
      )
    return config
  },
}

export default config
