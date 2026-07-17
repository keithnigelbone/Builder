// Pure, Node-free CMS versioning helpers — label slugification, version
// filenames, and build-id derivation. Split out of cmsFileService.ts (which
// imports node:fs/node:child_process/node:util) so browser code can compute
// a buildId or preview a filename without ever pulling Node built-ins into
// the client bundle. cmsFileService.ts re-exports these for its own use and
// for existing callers/tests that still import them from there.
import type { BuildRequest, VersionMetadata } from '../types';

/** Trim/lowercase/dash-ify a label for use in a filesystem-safe filename. */
export function sanitizeLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** "{isoDate}-{slug}.json", e.g. "2026-07-17-hero-section-color-refinement.json". */
export function generateVersionFilename(metadata: VersionMetadata): string {
  const isoDate = metadata.timestamp.slice(0, 10);
  return `${isoDate}-${sanitizeLabel(metadata.label)}.json`;
}

/** Stable build identifier derived from a build request — the same formula
 * used both when saving a version (so it can be found again later) and when
 * browsing version history (so the right versions are matched). Centralized
 * here so the call sites (App.tsx, CMSEditor.tsx, and the server-side save
 * endpoint) can never drift apart. */
export function deriveBuildId(buildRequest: Pick<BuildRequest, 'category' | 'freeformPrompt'>): string {
  const { category, freeformPrompt } = buildRequest;
  return `${category.id}-${sanitizeLabel(freeformPrompt || category.label)}`;
}
