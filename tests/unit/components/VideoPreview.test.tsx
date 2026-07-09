import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoConceptDetails, VideoPreview } from '../../../App/src/components/previews/VideoPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const plan: BuildPlan = {
  headline: 'The grid that grows',
  subheadline: 'A film about the build-out.',
  body: 'Documentary realism.',
  imageSubject: 's',
  imageAction: 'a',
  imageLocation: 'l',
  imageFraming: 'f',
  recommendedDuration: '45–60 seconds',
  openingShot: 'Hands mid-task before we see a face.',
  keyScenes: [
    { title: 'The work', description: 'Close on the task.' },
    { title: 'The reach', description: 'The site widens.' },
    { title: 'The outcome', description: 'A home lit at dusk.' },
  ],
  closingFrame: 'Reliance mark on a bold surface.',
  voiceoverCopy: 'The work is real.',
  videoFormat: {
    id: 'instagram-story',
    label: 'Instagram Story / Reel',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    safeArea: ['Keep text large and centred.'],
    veoAspectRatio: '9:16',
  },
  recommendedComponentNames: [],
  reasoning: '',
};

describe('VideoPreview (canvas art)', () => {
  it('renders the title and opening shot inside safe-area guides', () => {
    const { container } = render(<VideoPreview plan={plan} />);

    expect(screen.getByText('The grid that grows')).toBeInTheDocument();
    expect(screen.getByText(/Hands mid-task/)).toBeInTheDocument();
    expect(container.querySelector('[data-safe-area="9:16"]')).not.toBeNull();
  });
});

describe('VideoConceptDetails', () => {
  it('shows format, ratio, dimensions and duration', () => {
    render(<VideoConceptDetails plan={plan} />);

    expect(screen.getByText('Instagram Story / Reel')).toBeInTheDocument();
    expect(screen.getByText('9:16')).toBeInTheDocument();
    expect(screen.getByText('1080 × 1920')).toBeInTheDocument();
    expect(screen.getByText('45–60 seconds')).toBeInTheDocument();
  });

  it('lists the storyboard beats, closing frame and voiceover copy', () => {
    render(<VideoConceptDetails plan={plan} />);

    expect(screen.getByText('The work')).toBeInTheDocument();
    expect(screen.getByText('The outcome')).toBeInTheDocument();
    expect(screen.getByText(/Reliance mark on a bold surface/)).toBeInTheDocument();
    expect(screen.getByText(/"The work is real."/)).toBeInTheDocument();
  });

  it('exposes the assembled Veo-ready prompt with the exact target format', () => {
    render(<VideoConceptDetails plan={plan} />);

    expect(screen.getByText('Veo-ready prompt')).toBeInTheDocument();
    expect(screen.getByText(/Deliver at 9:16 \(1080×1920\)/)).toBeInTheDocument();
  });

  it('shows the safe-area guidance and the generate affordance', () => {
    render(<VideoConceptDetails plan={plan} />);

    expect(screen.getByText(/Keep text large and centred/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate video/ })).toBeInTheDocument();
  });
});
