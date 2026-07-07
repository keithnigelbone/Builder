import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from '../../../App/src/components/BrandMark';

describe('BrandMark without a fetched logo', () => {
  it('falls back to a text label instead of an empty image', () => {
    render(<BrandMark size={24} />);
    expect(screen.getByText('Reliance')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
