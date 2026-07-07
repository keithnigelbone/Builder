import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:reliance-brand-meta', () => ({
  definedProps: ['Primary-Bold'],
  brandName: 'Reliance',
  logoSvg: '<svg data-testid="reliance-logo"></svg>',
}));

const { BrandMark } = await import('../../../App/src/components/BrandMark');

describe('BrandMark', () => {
  it('renders the real logo mark when one is available', () => {
    render(<BrandMark size={24} />);
    expect(screen.getByRole('img', { name: 'Reliance' })).toBeInTheDocument();
  });
});
