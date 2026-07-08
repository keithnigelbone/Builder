import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppScreenPreview } from '../../../App/src/components/previews/AppScreenPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Track your energy',
  screenTitle: 'Energy',
  ctaLabel: 'Get started',
  contentBlocks: [
    { type: 'list-item', title: 'Solar output', subtitle: 'Live' },
    { type: 'stat', value: '4.2 kW', label: 'Generating now' },
    { type: 'action', label: 'View details' },
  ],
  recommendedComponentNames: [],
  reasoning: '',
};

describe('AppScreenPreview patterns', () => {
  it('onboarding: hero-led, pagination dots and one primary CTA, no bottom nav', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'onboarding' }} />);

    expect(screen.getByText('Get started')).toBeInTheDocument();
    expect(screen.getByLabelText('Onboarding steps')).toBeInTheDocument();
    expect(screen.queryByLabelText('Preview navigation')).not.toBeInTheDocument();
  });

  it('browse: search input and filter chips above the content', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'browse' }} />);

    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Preview navigation')).toBeInTheDocument();
  });

  it('checkout: order rows, a total, a promo field, one confirming CTA', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'checkout' }} />);

    expect(screen.getByText('Promo code')).toBeInTheDocument();
    expect(screen.getByText('4.2 kW')).toBeInTheDocument();
    expect(screen.getByText('View details')).toBeInTheDocument();
  });

  it('profile: large avatar header with the screen title', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'profile' }} />);

    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByLabelText('Preview navigation')).toBeInTheDocument();
  });

  it('defaults to the dashboard composition with a greeting', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'nonsense' }} />);

    expect(screen.getByText('Good morning')).toBeInTheDocument();
    expect(screen.getByText('4.2 kW')).toBeInTheDocument();
  });
});
