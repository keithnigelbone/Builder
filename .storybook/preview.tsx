import React from 'react';
import type { Preview } from '@storybook/react';
import { BrandProvider } from '@jds4/oneui-react';
import '@jds4/oneui-react/styles';

const BRANDS = ['jio', 'reliance', 'swadesh'] as const;

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    brand: {
      description: 'OneUI brand',
      toolbar: {
        title: 'Brand',
        icon: 'paintbrush',
        items: BRANDS.map((brand) => ({ value: brand, title: brand })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    brand: 'jio',
  },
  decorators: [
    (Story, context) => (
      <BrandProvider key={context.globals.brand} brand={context.globals.brand ?? 'jio'}>
        <div style={{ padding: '2rem' }}>
          <Story />
        </div>
      </BrandProvider>
    ),
  ],
};

export default preview;
