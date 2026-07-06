import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrandProvider } from '@jds4/oneui-react';
import '@jds4/oneui-react/styles';
import { App } from './App';
import { ACTIVE_BRAND } from './data/brandsConfig';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Reliance-only, always — see data/brandsConfig.ts for why. */}
    <BrandProvider brand={ACTIVE_BRAND}>
      <App />
    </BrandProvider>
  </StrictMode>,
);
