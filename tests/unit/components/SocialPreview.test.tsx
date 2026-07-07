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
  it('matches the square variant image to a 1:1 aspect ratio', () => {
    render(<SocialPreview plan={basePlan} variantId="square" />);

    expect(screen.getByRole('img', { name: 'Test headline' })).toHaveAttribute('data-aspect-ratio', '1:1');
  });

  it('matches the story variant image to a 9:16 aspect ratio', () => {
    render(<SocialPreview plan={basePlan} variantId="story" />);

    expect(screen.getByRole('img', { name: 'Test headline' })).toHaveAttribute('data-aspect-ratio', '9:16');
  });

  it('matches the linkedin variant image to the closest available preset (2:1)', () => {
    render(<SocialPreview plan={basePlan} variantId="linkedin" />);

    expect(screen.getByRole('img', { name: 'Test headline' })).toHaveAttribute('data-aspect-ratio', '2:1');
  });
});
