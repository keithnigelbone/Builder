import { describe, expect, it } from 'vitest';
import { assembleVideoPrompt } from '../../../App/src/ai/videoPrompt';
import type { BuildPlan } from '../../../App/src/ai/schema';

const plan: BuildPlan = {
  headline: 'The grid that grows',
  body: 'Documentary realism, long lenses, unhurried cuts.',
  imageSubject: 'A grid engineer in a navy work shirt',
  imageAction: 'both hands torquing a junction bolt',
  imageLocation: 'red-brown Rajasthan earth, dry scrubland',
  imageFraming: 'medium close-up, slight low angle',
  recommendedDuration: '45–60 seconds',
  openingShot: 'Hands mid-task before we see a face.',
  keyScenes: [
    { title: 'The work', description: 'Close on the task.' },
    { title: 'The reach', description: 'The site widens behind it.' },
    { title: 'The outcome', description: 'A home lit at dusk.' },
  ],
  closingFrame: 'Reliance mark on a bold surface.',
  voiceoverCopy: 'The work is real.',
  videoFormat: {
    id: 'auditorium-ultrawide',
    label: 'Auditorium ultra-wide screen',
    ratio: '21:9',
    width: 2560,
    height: 1080,
    safeArea: ['Keep the centre clear for speaker/stage presence where relevant.'],
    veoAspectRatio: '16:9',
  },
  recommendedComponentNames: [],
  reasoning: '',
};

describe('assembleVideoPrompt', () => {
  const prompt = assembleVideoPrompt(plan);

  it('names the exact target format, ratio and dimensions', () => {
    expect(prompt).toContain('Auditorium ultra-wide screen');
    expect(prompt).toContain('Deliver at 21:9 (2560×1080)');
    expect(prompt).toContain('Keep the centre clear');
    expect(prompt).toContain('45–60 seconds');
  });

  it('carries the art-directed scene and every storyboard beat', () => {
    expect(prompt).toContain('red-brown Rajasthan earth');
    expect(prompt).toContain('Opening shot: Hands mid-task');
    expect(prompt).toContain('Scene 2 — The reach');
    expect(prompt).toContain('Closing frame: Reliance mark');
    expect(prompt).toContain('Visual direction: Documentary realism');
    expect(prompt).toContain('voiceover copy: "The work is real."');
  });
});
