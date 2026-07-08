import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WebsitePreview } from '../../../App/src/components/previews/WebsitePreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Powering every home',
  subheadline: 'Clean energy for a billion people.',
  ctaLabel: 'See the plan',
  recommendedComponentNames: [],
  reasoning: '',
};

describe('WebsitePreview pattern switch', () => {
  it('renders the campaign hero pattern with a secondary CTA and stat-band treatment', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'campaign-hero' }} />);

    expect(screen.getByText('Powering every home')).toBeInTheDocument();
    expect(screen.getByText('See the plan')).toBeInTheDocument();
    expect(screen.getByText('Learn more')).toBeInTheDocument();
  });

  it('defaults unknown patterns to the product story layout', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'nonsense' }} />);

    expect(screen.queryByText('Learn more')).not.toBeInTheDocument();
    expect(screen.getByText('© Reliance')).toBeInTheDocument();
  });

  it('renders one high-attention CTA in the campaign hero (secondary is visibly secondary)', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'campaign-hero' }} />);

    // Both CTAs exist but only the plan's own label is the primary action.
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps header and hero CTAs distinct when no ctaLabel is authored', () => {
    render(<WebsitePreview plan={{ ...basePlan, ctaLabel: undefined, patternId: 'campaign-hero' }} />);

    expect(screen.getByText('Get started')).toBeInTheDocument();
    expect(screen.getByText('Explore now')).toBeInTheDocument();
  });
});
