import type { GuidedAnswers } from '../types';

/**
 * Destination-driven video formats — the single source of truth for the
 * Video category's ratios, dimensions, and safe-area guidance. Formats are
 * STRUCTURAL: resolved deterministically from the guided answers (and, for
 * digital displays and custom sizes, the prompt/answer text), attached to
 * the plan by the orchestrator, never authored by the model.
 *
 * veoAspectRatio is the nearest ratio the Veo API actually generates (it
 * accepts only 16:9 and 9:16); the assembled prompt always names the exact
 * target format so the film is composed for its true destination.
 */
export interface VideoFormat {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
  useFor: string;
  safeArea: string[];
  veoAspectRatio: '16:9' | '9:16';
}

export const DEFAULT_VIDEO_FORMAT_ID = 'keynote-agm';

const SAFE_16_9 = [
  'Keep key text away from the extreme edges.',
  'Suitable for keynote, web, YouTube and AGM screens.',
];
const SAFE_21_9 = [
  'Keep the centre clear for speaker/stage presence where relevant.',
  'Avoid placing critical text too far left or right.',
  'Use wide cinematic compositions.',
];
const SAFE_9_16 = [
  'Keep text large and centred.',
  'Avoid placing important content in the top and bottom UI zones.',
  'Use mobile-first framing.',
];
const SAFE_4_5 = ['Use strong centred hierarchy.', 'Good for social feed storytelling.'];
const SAFE_1_1 = ['Keep the composition simple and iconic.', 'Use one clear message.'];
const SAFE_1_91 = ['Keep copy short and readable.', 'Good for LinkedIn and campaign assets.'];

export const VIDEO_FORMATS: VideoFormat[] = [
  {
    id: 'keynote-agm',
    label: 'Keynote / AGM screen',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    useFor: 'Executive presentations, AGM films, website video and standard keynote content.',
    safeArea: SAFE_16_9,
    veoAspectRatio: '16:9',
  },
  {
    id: 'auditorium-ultrawide',
    label: 'Auditorium ultra-wide screen',
    ratio: '21:9',
    width: 2560,
    height: 1080,
    useFor: 'Large stage screens, panoramic brand films and immersive keynote backdrops.',
    safeArea: SAFE_21_9,
    veoAspectRatio: '16:9',
  },
  {
    id: 'youtube-website',
    label: 'YouTube / website',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    useFor: 'Website video, YouTube uploads and standard landscape film.',
    safeArea: SAFE_16_9,
    veoAspectRatio: '16:9',
  },
  {
    id: 'linkedin-feed',
    label: 'LinkedIn feed',
    ratio: '1.91:1',
    width: 1200,
    height: 627,
    useFor: 'LinkedIn feed video or campaign posts.',
    safeArea: SAFE_1_91,
    veoAspectRatio: '16:9',
  },
  {
    id: 'instagram-feed',
    label: 'Instagram / social feed',
    ratio: '4:5',
    width: 1080,
    height: 1350,
    useFor: 'Feed-first social video.',
    safeArea: SAFE_4_5,
    veoAspectRatio: '9:16',
  },
  {
    id: 'instagram-story',
    label: 'Instagram Story / Reel',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    useFor: 'Vertical video, stories, reels and mobile-first edits.',
    safeArea: SAFE_9_16,
    veoAspectRatio: '9:16',
  },
  {
    id: 'square-social',
    label: 'Square social post',
    ratio: '1:1',
    width: 1080,
    height: 1080,
    useFor: 'Square social video or carousel-style motion frames.',
    safeArea: SAFE_1_1,
    veoAspectRatio: '16:9',
  },
  {
    id: 'digital-display',
    label: 'Digital display',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    useFor: 'Signage and display loops — portrait and ultra-wide variants resolved from the brief.',
    safeArea: SAFE_16_9,
    veoAspectRatio: '16:9',
  },
  {
    id: 'custom',
    label: 'Custom',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    useFor: 'Any bespoke ratio or size, entered in the guided flow.',
    safeArea: SAFE_16_9,
    veoAspectRatio: '16:9',
  },
];

const BY_ID = new Map(VIDEO_FORMATS.map((f) => [f.id, f]));

export function getVideoFormat(id: string): VideoFormat | undefined {
  return BY_ID.get(id);
}

export function nearestVeoAspect(width: number, height: number): '16:9' | '9:16' {
  return width / height >= 1 ? '16:9' : '9:16';
}

/** The six named ratios map to their standard delivery dimensions. */
const RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '21:9': { width: 2560, height: 1080 },
  '1.91:1': { width: 1200, height: 627 },
};

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

export function parseCustomFormat(text: string): { ratio: string; width: number; height: number } | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const named = RATIO_DIMENSIONS[trimmed];
  if (named) return { ratio: trimmed, ...named };

  const size = trimmed.match(/^(\d{2,4})\s*[×xX]\s*(\d{2,4})$/);
  if (size) {
    const width = Number(size[1]);
    const height = Number(size[2]);
    const known = Object.entries(RATIO_DIMENSIONS).find(([, d]) => d.width === width && d.height === height);
    if (known) return { ratio: known[0], width, height };
    const divisor = greatestCommonDivisor(width, height);
    return { ratio: `${width / divisor}:${height / divisor}`, width, height };
  }

  return undefined;
}

export function resolveDigitalDisplay(promptText: string): { ratio: string; width: number; height: number } {
  const text = promptText.toLowerCase();
  if (text.includes('portrait')) return { ratio: '9:16', width: 1080, height: 1920 };
  if (text.includes('ultra-wide') || text.includes('ultrawide')) return { ratio: '21:9', width: 2560, height: 1080 };
  return { ratio: '16:9', width: 1920, height: 1080 };
}

export interface ResolvedVideoFormat extends Omit<VideoFormat, 'useFor'> {
  /** Present when the resolution had to fall back (e.g. unparseable custom input) — surfaced honestly in Build details. */
  note?: string;
}

const SAFE_BY_RATIO: Record<string, string[]> = {
  '16:9': SAFE_16_9,
  '21:9': SAFE_21_9,
  '9:16': SAFE_9_16,
  '4:5': SAFE_4_5,
  '1:1': SAFE_1_1,
  '1.91:1': SAFE_1_91,
};

function withDerived(base: VideoFormat, dims: { ratio: string; width: number; height: number }, note?: string): ResolvedVideoFormat {
  return {
    id: base.id,
    label: base.label,
    ratio: dims.ratio,
    width: dims.width,
    height: dims.height,
    safeArea: SAFE_BY_RATIO[dims.ratio] ?? SAFE_16_9,
    veoAspectRatio: nearestVeoAspect(dims.width, dims.height),
    note,
  };
}

/**
 * The one place a build's video format is decided — deterministic, from the
 * guided answers and prompt text. Never model-authored.
 */
export function resolveVideoFormatForBuild(answers: GuidedAnswers, promptText: string): ResolvedVideoFormat {
  const destination = answers['video-destination'];
  const base = (destination && getVideoFormat(destination)) || getVideoFormat(DEFAULT_VIDEO_FORMAT_ID)!;

  if (base.id === 'digital-display') {
    return withDerived(base, resolveDigitalDisplay(promptText));
  }

  if (base.id === 'custom') {
    const parsed = parseCustomFormat(answers['video-custom-format'] ?? '');
    if (parsed) return withDerived(base, parsed);
    return withDerived(
      base,
      { ratio: '16:9', width: 1920, height: 1080 },
      'Unrecognized custom size — defaulted to 16:9 1920×1080.',
    );
  }

  const { useFor: _useFor, ...rest } = base;
  return { ...rest };
}
