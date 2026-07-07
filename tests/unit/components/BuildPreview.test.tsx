import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BuildPreview } from '../../../App/src/components/BuildPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Deck title',
  recommendedComponentNames: [],
  reasoning: '',
};

describe('BuildPreview slide navigator', () => {
  it('does not render a navigator for a single-slide deck', () => {
    render(
      <BuildPreview
        category="slides"
        answers={{}}
        plan={{ ...basePlan, slides: [{ slideType: 'content', headline: 'Only slide' }] }}
      />,
    );

    expect(screen.queryByText(/Slide \d+ of \d+/)).not.toBeInTheDocument();
  });

  it('renders a navigator and moves between slides for a multi-slide deck', () => {
    render(
      <BuildPreview
        category="slides"
        answers={{}}
        plan={{
          ...basePlan,
          slides: [
            { slideType: 'cover', headline: 'First slide' },
            { slideType: 'divider', headline: 'Second slide' },
          ],
        }}
      />,
    );

    expect(screen.getByText('First slide')).toBeInTheDocument();
    expect(screen.getByText('Slide 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Second slide')).toBeInTheDocument();
    expect(screen.getByText('Slide 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('falls back to a single generic slide when plan.slides is empty', () => {
    render(<BuildPreview category="slides" answers={{}} plan={basePlan} />);

    expect(screen.getByText('Deck title')).toBeInTheDocument();
    expect(screen.queryByText(/Slide \d+ of \d+/)).not.toBeInTheDocument();
  });
});
