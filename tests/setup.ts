import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine and no matchMedia implementation; components like
// StepProgress read `window.matchMedia('(prefers-reduced-motion: reduce)')`
// directly, so it must exist before any component under test renders.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom implements neither the Font Loading API nor FontFace — oneui-react's
// BrandProvider uses both (useGoogleFonts/useBrandFonts) to load brand fonts
// as a side effect of mounting. Stub just enough that "load a font" resolves
// instead of throwing; the actual font never needs to render in tests.
if (typeof globalThis.FontFace === 'undefined') {
  class FakeFontFace {
    family: string;
    constructor(family: string, _source: unknown, _descriptors?: unknown) {
      this.family = family;
    }
    load() {
      return Promise.resolve(this);
    }
  }
  // @ts-expect-error - minimal test stub, not a spec-complete FontFace
  globalThis.FontFace = FakeFontFace;
}

if (typeof document !== 'undefined' && !document.fonts) {
  Object.defineProperty(document, 'fonts', {
    value: {
      ready: Promise.resolve(),
      add: () => {},
      forEach: () => {},
    },
    writable: true,
  });
}

// jsdom has no layout engine, so it never implements ResizeObserver — the
// TouchSlider story measures its own element size with one on mount. A
// no-op is enough since jsdom never reports real size changes anyway.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class FakeResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = FakeResizeObserver;
}
