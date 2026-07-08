import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BuildPreview } from '../../../App/src/components/BuildPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const plan: BuildPlan = {
  headline: 'H',
  socialFormat: 'carousel',
  dimensionVariant: 'carousel',
  carouselFrames: [{ headline: 'Hook frame' }, { headline: 'Middle frame' }, { headline: 'CTA frame' }],
  recommendedComponentNames: [],
  reasoning: '',
};

describe('BuildPreview carousel navigation', () => {
  it('pages through carousel frames with the deck navigator', async () => {
    const user = userEvent.setup();
    render(<BuildPreview category="social-media" answers={{}} plan={plan} />);

    expect(screen.getByText('Hook frame')).toBeInTheDocument();
    expect(screen.getByText('Frame 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Middle frame')).toBeInTheDocument();
    expect(screen.getByText('Frame 2 of 3')).toBeInTheDocument();
  });
});
