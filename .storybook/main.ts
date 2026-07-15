import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  // The project vite.config.ts is merged into Storybook's build, pulling in
  // vite-plugin-dts (rollupTypes) which requires dist/index.d.ts and breaks
  // `storybook build` on a clean checkout. Type generation is irrelevant to
  // Storybook, so strip the plugin here.
  async viteFinal(config) {
    config.plugins = (config.plugins ?? [])
      .flat()
      .filter(
        (p) => !(p && typeof p === 'object' && 'name' in p && p.name === 'vite:dts'),
      )
    return config
  },
}

export default config
