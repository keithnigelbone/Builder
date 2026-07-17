// Node.js persistence layer for CMS edits: writes versioned JSON snapshots to
// builds/ and creates a git commit per save. Runs in the API/server context.
import { promises as fs } from 'node:fs';
import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { CmsEdits, SavedVersion, VersionMetadata } from '../types';

const execAsync = promisify(exec);

const BUILDS_DIR = path.resolve(process.cwd(), 'builds');

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

/**
 * Persist a CMS edit as a versioned JSON file under builds/ and record it as
 * a git commit. Keep it simple: no CDN upload, no async polling.
 */
export async function saveVersionToFile(
  metadata: VersionMetadata,
  edits: CmsEdits,
  original: SavedVersion['original']
): Promise<void> {
  const filename = generateVersionFilename(metadata);
  const filePath = path.join(BUILDS_DIR, filename);
  const savedVersion: SavedVersion = { metadata, edits, original };

  await fs.mkdir(BUILDS_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(savedVersion, null, 2), 'utf-8');

  const commitMessage = `Edit: ${metadata.label}`;
  await execAsync(`git add ${JSON.stringify(filePath)} && git commit -m ${JSON.stringify(commitMessage)}`);
}

/** List saved versions for a build. Returns [] if none exist yet. */
export async function getVersionHistory(buildId: string): Promise<SavedVersion[]> {
  let files: string[];
  try {
    files = await fs.readdir(BUILDS_DIR);
  } catch {
    return [];
  }

  const versions: SavedVersion[] = [];
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    try {
      const content = await fs.readFile(path.join(BUILDS_DIR, file), 'utf-8');
      const parsed = JSON.parse(content) as SavedVersion;
      if (parsed?.metadata?.buildId === buildId) {
        versions.push(parsed);
      }
    } catch {
      // Skip malformed/unreadable files.
    }
  }
  return versions;
}
