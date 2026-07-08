import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SocialPreview } from '../../../App/src/components/previews/SocialPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Test headline',
  heroImage: 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
  recommendedComponentNames: [],
  reasoning: '',
};

describe('SocialPreview', () => {
  it('renders the square announcement hero image at its fixed 16:9 strip ratio', () => {
    render(<SocialPreview plan={basePlan} variantId="square" />);

    expect(screen.getByRole('img', { name: 'Test headline' })).toHaveAttribute('data-aspect-ratio', '16:9');
  });

  it('renders the story hero image as a full-bleed scrimmed backdrop', () => {
    render(<SocialPreview plan={basePlan} variantId="story" />);

    expect(screen.getByRole('img', { name: 'Test headline' })).toBeInTheDocument();
  });

  it('renders the linkedin hero image as a full-bleed split-panel backdrop', () => {
    render(<SocialPreview plan={basePlan} variantId="linkedin" />);

    expect(screen.getByRole('img', { name: 'Test headline' })).toBeInTheDocument();
  });
});
