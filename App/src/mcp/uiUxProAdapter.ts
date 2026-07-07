/**
 * "UI UX Pro" quality layer — distilled, static heuristics that feed the
 * critique pass's rubric (see App/aiServerPlugin.ts).
 *
 * Honest constraint, on purpose: a running Vite app cannot invoke Claude
 * Code MCP servers, so "check for the UI UX Pro MCP" cannot mean a live
 * call. This module is the seam where MCP-derived guidance would plug in;
 * until then it ships the distilled rules directly, so the critique rubric
 * is always available with zero configuration.
 */
const SHARED_HINTS = [
  'One idea per view: the headline states a single benefit in plain confident language, never a slogan soup.',
  'Exactly one high-attention CTA per view; every other action is visibly secondary.',
  'Copy rhythm: headlines under ~9 words, subheadlines one sentence, body copy 1-2 short sentences.',
  'Hierarchy must survive squinting: display > title > body > label, with clear size steps between levels.',
  'No filler: every section earns its place — cut a weak section rather than pad it.',
  'Specific beats generic: name the product, the place, the number — never "innovative solutions".',
];

const CATEGORY_HINTS: Record<string, string[]> = {
  website: [
    'The hero answers "what is this and why should I care" in under 3 seconds.',
    'Feature sections lead with the benefit, not the mechanism.',
    'The closing band repeats the primary CTA — a page should never fizzle out.',
  ],
  'app-screens': [
    'Touch targets read as at least 44px; list rows carry one primary label and at most one support line.',
    'The screen title says where the user is, not what the app is.',
    'Stats show the number big and the caption small — never the reverse.',
  ],
  slides: [
    'One message per slide; if a slide needs two headlines it is two slides.',
    'Data slides make the single number the hero; tables never exceed 5 columns.',
    'The closing slide asks for something specific — a decision, a next step, a date.',
  ],
  'social-media': [
    'The headline must work at thumbnail size — 6 words or fewer is ideal.',
    'Carousel frames each advance the story; frame one is a hook, the last frame is the CTA.',
    'Badges and CTAs are short verbs: "Live", "Join", "Explore".',
  ],
  motion: [
    'Motion communicates one feeling; describe timing and easing character, not decoration.',
    'The described motion must be achievable as a subtle UI behavior — no film-trailer language.',
  ],
};

export function getUiUxQualityHints(category: string): string[] {
  return [...SHARED_HINTS, ...(CATEGORY_HINTS[category] ?? [])];
}
