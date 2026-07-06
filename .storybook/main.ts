import type { StorybookConfig } from '@storybook/react-vite';
import { oneui } from '@jds4/oneui-vite-plugin';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    config.plugins = config.plugins ?? [];
    config.plugins.push(oneui());
    // Vite's dep pre-bundler inlines the package's dynamic import() of
    // brand-loader before the oneui plugin's resolveId hook can intercept
    // it, which breaks brand switching. Exclude it so it's resolved live.
    config.optimizeDeps = {
      ...config.optimizeDeps,
      exclude: [...(config.optimizeDeps?.exclude ?? []), '@jds4/oneui-react/brand-loader'],
    };
    return config;
  },
};

export default config;
