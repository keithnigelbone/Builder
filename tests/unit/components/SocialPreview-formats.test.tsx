import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SocialPreview } from '../../../App/src/components/previews/SocialPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Solar for every rooftop',
  body: 'From launch to your home in 30 days.',
  ctaLabel: 'Join the waitlist',
  badgeLabel: 'New',
  carouselFrames: [
    { headline: 'The problem', body: 'Rooftops sit idle.' },
    { headline: 'The idea', body: 'Panels as a service.' },
    { headline: 'Join us' },
  ],
  recommendedComponentNames: [],
  reasoning: '',
};

describe('SocialPreview formats', () => {
  it('square renders the announcement composition with badge and CTA', () => {
    render(<SocialPreview plan={basePlan} variantId="square" />);

    expect(screen.getByText('Solar for every rooftop')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Join the waitlist')).toBeInTheDocument();
  });

  it('linkedin renders the split composition including body copy', () => {
    render(<SocialPreview plan={basePlan} variantId="linkedin" />);

    expect(screen.getByText('From launch to your home in 30 days.')).toBeInTheDocument();
  });

  it('story renders on the bold brand surface when no image exists (designed absence)', () => {
    render(<SocialPreview plan={basePlan} variantId="story" />);

    expect(screen.getByText('Solar for every rooftop')).toBeInTheDocument();
  });

  it('carousel renders the requested frame with its position', () => {
    render(<SocialPreview plan={basePlan} variantId="carousel" frameIndex={1} />);

    expect(screen.getByText('The idea')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.queryByText('The problem')).not.toBeInTheDocument();
  });

  it('carousel falls back to a single headline frame when no frames were authored', () => {
    render(<SocialPreview plan={{ ...basePlan, carouselFrames: undefined }} variantId="carousel" />);

    expect(screen.getByText('Solar for every rooftop')).toBeInTheDocument();
  });

  it('story exposes the hero as an image without swallowing the CTA', () => {
    render(<SocialPreview plan={{ ...basePlan, heroImage: 'data:image/png;base64,x' }} variantId="story" />);

    const hero = screen.getByRole('img');
    expect(within(hero).queryByRole('button')).toBeNull();
    expect(screen.getByRole('button', { name: 'Join the waitlist' })).toBeInTheDocument();
  });
});
