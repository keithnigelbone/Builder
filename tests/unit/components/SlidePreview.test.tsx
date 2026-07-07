import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlidePreview } from '../../../App/src/components/previews/SlidePreview';
import type { SlideContent } from '../../../App/src/ai/schema';

describe('SlidePreview', () => {
  it('renders a cover slide with headline and subheadline', () => {
    const slide: SlideContent = { slideType: 'cover', headline: 'Growth is Life', subheadline: 'Our story' };
    render(<SlidePreview slide={slide} />);

    expect(screen.getByText('Growth is Life')).toBeInTheDocument();
    expect(screen.getByText('Our story')).toBeInTheDocument();
  });

  it('renders a divider slide with only the headline', () => {
    const slide: SlideContent = { slideType: 'divider', headline: 'Section two' };
    render(<SlidePreview slide={slide} />);

    expect(screen.getByText('Section two')).toBeInTheDocument();
  });

  it('renders a content slide with headline, body, kicker, and image', () => {
    const slide: SlideContent = { slideType: 'content', headline: 'Our approach', body: 'A short body line', kicker: 'Overview' };
    render(<SlidePreview slide={slide} heroImage="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" />);

    expect(screen.getByText('Our approach')).toBeInTheDocument();
    expect(screen.getByText('A short body line')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders a split-photo slide with headline, body, and the shared image beside it', () => {
    const slide: SlideContent = { slideType: 'split-photo', headline: 'Built for scale', body: 'Details here' };
    render(<SlidePreview slide={slide} heroImage="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" />);

    expect(screen.getByText('Built for scale')).toBeInTheDocument();
    expect(screen.getByText('Details here')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders a table slide with column headers and items', () => {
    const slide: SlideContent = {
      slideType: 'table',
      headline: 'The 7 principles',
      tableColumns: [
        { header: 'We care', items: ['Point one', 'Point two'] },
        { header: 'Excellence', items: ['Point three'] },
      ],
    };
    render(<SlidePreview slide={slide} />);

    expect(screen.getByText('The 7 principles')).toBeInTheDocument();
    expect(screen.getByText('We care')).toBeInTheDocument();
    expect(screen.getByText('Excellence')).toBeInTheDocument();
    expect(screen.getByText('• Point one')).toBeInTheDocument();
    expect(screen.getByText('• Point three')).toBeInTheDocument();
  });
});
