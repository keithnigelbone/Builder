/// <reference types="vite/client" />

/** Injected at build time from oneui.brands.json — see ../vite.config.ts */
declare const __ONEUI_BRANDS_CONFIG__: {
  cdnUrl: string;
  brands: Record<string, string>;
};

/** See ../relianceTokenCoveragePlugin.ts and src/data/relianceBrandMeta.ts */
declare module 'virtual:reliance-brand-meta' {
  export const definedProps: string[];
  export const brandName: string;
  export const logoSvg: string | null;
}
