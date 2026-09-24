import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  // addon-essentials was folded into storybook core in v9+
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  // The project vite.config.ts is merged into Storybook's build, pulling in
  // vite-plugin-dts (bundleTypes) which requires dist/index.d.ts and breaks
  // `storybook build` on a clean checkout. Type generation is irrelevant to
  // Storybook, so strip the plugin here. (v5 registers as "unplugin-dts";
  // "vite:dts" kept for safety.)
  async viteFinal(config) {
    config.plugins = (config.plugins ?? [])
      .flat()
      .filter(
        (p) =>
          !(
            p &&
            typeof p === 'object' &&
            'name' in p &&
            (p.name === 'vite:dts' || p.name === 'unplugin-dts')
          ),
      )
    return config
  },
}

export default config
