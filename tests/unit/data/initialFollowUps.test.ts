import { describe, expect, it } from 'vitest';
import { getBuildCategory, initialFollowUps } from '../../../App/src/data/buildCategories';
import type { FollowUpQuestion } from '../../../App/src/ai/schema';

const claudeFollowUps: FollowUpQuestion[] = [
  { id: 'model-authored', prompt: 'Who is this for?', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
];

describe('initialFollowUps', () => {
  it('always pins the registry questions for video — the destination step is structural', () => {
    const video = getBuildCategory('video')!;
    expect(initialFollowUps(video, claudeFollowUps)).toBe(video.questions);
    expect(initialFollowUps(video, [])).toBe(video.questions);
  });

  it('prefers Claude follow-ups for other categories, falling back to registry questions', () => {
    const website = getBuildCategory('website')!;
    expect(initialFollowUps(website, claudeFollowUps)).toBe(claudeFollowUps);
    expect(initialFollowUps(website, [])).toBe(website.questions);
  });
});
