import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlidePreview } from '../../../App/src/components/previews/SlidePreview';

describe('stat slide', () => {
  it('makes the value the hero with a small caption', () => {
    render(<SlidePreview slide={{ slideType: 'stat', headline: 'Growth', statValue: '42%', statLabel: 'Year on year' }} />);

    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Year on year')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });
});

describe('closing slide', () => {
  it('renders the closing headline and optional subheadline', () => {
    render(<SlidePreview slide={{ slideType: 'closing', headline: 'Thank you.', subheadline: 'Questions welcome.' }} />);

    expect(screen.getByText('Thank you.')).toBeInTheDocument();
    expect(screen.getByText('Questions welcome.')).toBeInTheDocument();
  });
});
