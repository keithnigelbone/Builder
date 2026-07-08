import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MotionStage } from '../../../App/src/components/previews/MotionStage';

const CONCEPTS = ['loader', 'transition', 'intro-animation', 'product-reveal', 'micro-interaction'] as const;

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MotionStage', () => {
  it.each(CONCEPTS)('renders an animated stage for %s', (concept) => {
    stubReducedMotion(false);
    const { container } = render(<MotionStage concept={concept} heroAlt="scene" />);

    expect(container.querySelector('style')).not.toBeNull();
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a fully static stage under prefers-reduced-motion', () => {
    stubReducedMotion(true);
    const { container } = render(<MotionStage concept="loader" heroAlt="scene" />);

    expect(container.querySelector('style')).toBeNull();
  });

  it('falls back to the loader stage for an unknown concept', () => {
    stubReducedMotion(false);
    const { container } = render(<MotionStage concept="not-a-concept" heroAlt="scene" />);

    expect(container.firstChild).not.toBeNull();
  });
});
