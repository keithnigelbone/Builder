export const APPEARANCE_OPTIONS = [
  'auto',
  'primary',
  'secondary',
  'neutral',
  'sparkle',
  'brand-bg',
  'positive',
  'negative',
  'warning',
  'informative',
] as const;

/** Input/InputField appearance omits 'brand-bg' (no CSS class wired). */
export const INPUT_APPEARANCE_OPTIONS = [
  'auto',
  'primary',
  'secondary',
  'neutral',
  'sparkle',
  'positive',
  'negative',
  'warning',
  'informative',
] as const;

export const ATTENTION_OPTIONS = ['high', 'medium', 'low'] as const;

/** Tiny inline placeholder image — avoids a network dependency for a local review tool. */
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23888'/%3E%3C/svg%3E";
