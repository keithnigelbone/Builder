import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WebsitePreview } from '../../../App/src/components/previews/WebsitePreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'The next decade of energy',
  subheadline: 'What changes, what stays, and what we build first.',
  sections: [
    { title: 'Solar at scale', body: 'Panels across ten states.' },
    { title: 'Grid storage', body: 'Batteries that hold a city.' },
  ],
  recommendedComponentNames: [],
  reasoning: '',
};

describe('Editorial pattern', () => {
  it('numbers its article sections', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'editorial' }} />);

    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('Solar at scale')).toBeInTheDocument();
  });

  it('renders the quote as a pull-quote when present', () => {
    render(
      <WebsitePreview plan={{ ...basePlan, patternId: 'editorial', quote: { text: 'It works', name: 'Asha', title: 'CTO' } }} />,
    );

    expect(screen.getByText('"It works"')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
  });
});

describe('Service hub pattern', () => {
  it('renders one explorable card per section', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'service-hub' }} />);

    expect(screen.getByText('Solar at scale')).toBeInTheDocument();
    expect(screen.getByText('Grid storage')).toBeInTheDocument();
    expect(screen.getAllByText('Explore')).toHaveLength(2);
  });
});
