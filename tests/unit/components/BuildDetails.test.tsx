import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BuildDetails } from '../../../App/src/components/BuildDetails';
import { BUILD_CATEGORIES } from '../../../App/src/data/buildCategories';
import type { BuildRequest } from '../../../App/src/types';

function makeRequest(overrides: Partial<BuildRequest['plan']> = {}): BuildRequest {
  return {
    category: BUILD_CATEGORIES[0],
    freeformPrompt: 'a site',
    answers: {},
    answerLabels: {},
    refinements: [],
    plan: { headline: 'H', patternId: 'campaign-hero', recommendedComponentNames: [], reasoning: 'planned', ...overrides },
    classifyMeta: { source: 'claude', reasoning: 'classified', model: 'claude-fable-5' },
    planMeta: { source: 'claude', reasoning: 'planned', model: 'claude-sonnet-5' },
  };
}

describe('BuildDetails', () => {
  it('shows which Claude model authored each stage', () => {
    render(<BuildDetails components={[]} tokensByCategory={{}} request={makeRequest()} />);

    expect(screen.getByText('claude-fable-5')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-5')).toBeInTheDocument();
  });

  it('shows the resolved pattern with its story-backed components', () => {
    render(<BuildDetails components={[]} tokensByCategory={{}} request={makeRequest()} />);

    expect(screen.getByText('Campaign hero')).toBeInTheDocument();
    expect(screen.getByText(/Composed from .*Button.* stories/)).toBeInTheDocument();
  });

  it('shows quality notes when the critique ran', () => {
    render(<BuildDetails components={[]} tokensByCategory={{}} request={makeRequest({ qualityNotes: 'Tightened the headline.' })} />);

    expect(screen.getByText('Quality review')).toBeInTheDocument();
    expect(screen.getByText('Tightened the headline.')).toBeInTheDocument();
  });

  it('omits the quality review row when there are no notes', () => {
    render(<BuildDetails components={[]} tokensByCategory={{}} request={makeRequest()} />);

    expect(screen.queryByText('Quality review')).not.toBeInTheDocument();
  });
});
