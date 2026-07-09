import type { FollowUpQuestion } from '../ai/schema';

/** The extra free-text step injected when the video destination is Custom. */
export const VIDEO_CUSTOM_FORMAT_QUESTION: FollowUpQuestion = {
  id: 'video-custom-format',
  prompt: 'Enter the ratio or size',
  input: 'text',
  placeholder: 'e.g. 16:9 or 1920 × 1080',
  options: [],
};

/**
 * Keeps the follow-up list consistent with the current destination answer:
 * Custom appends the free-text step (idempotently); any other destination
 * prunes it — including after Back-button navigation away from Custom.
 */
export function nextFollowUps(followUps: FollowUpQuestion[], questionId: string, optionId: string): FollowUpQuestion[] {
  if (questionId !== 'video-destination') return followUps;
  if (optionId === 'custom') {
    return followUps.some((q) => q.id === VIDEO_CUSTOM_FORMAT_QUESTION.id) ? followUps : [...followUps, VIDEO_CUSTOM_FORMAT_QUESTION];
  }
  return followUps.filter((q) => q.id !== VIDEO_CUSTOM_FORMAT_QUESTION.id);
}
