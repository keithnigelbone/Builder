// Node.js persistence layer for CMS edits: writes versioned JSON snapshots to
// builds/ and creates a git commit per save. Runs only in the Node/API server
// context (App/cmsServicePlugin.ts under `vite dev`) — NEVER import this
// module from browser code (App.tsx, CMSEditor.tsx, VersionHistory.tsx).
// Importing it pulls in node:fs/node:child_process/node:util, which Vite
// cannot bundle for the browser. Browser code that only needs the pure
// helpers (sanitizeLabel, generateVersionFilename, deriveBuildId) should
// import them from ./cmsVersioning instead.
import { promises as fs } from 'node:fs';
import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { CmsEdits, SavedVersion, VersionMetadata } from '../types';
import { generateVersionFilename } from './cmsVersioning';

export { sanitizeLabel, generateVersionFilename, deriveBuildId } from './cmsVersioning';

const execAsync = promisify(exec);

const BUILDS_DIR = path.resolve(process.cwd(), 'builds');

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
  try {
    await execAsync(`git add ${JSON.stringify(filePath)} && git commit -m ${JSON.stringify(commitMessage)}`);
  } catch (error) {
    // The version file above is already safely on disk at this point — only
    // the commit step failed. Rethrow with a clear, user-facing message
    // (rather than a raw exec/stderr blob) so the caller (CMSEditor's save
    // error modal) can show something meaningful and let the user retry.
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Git commit failed: ${message}`);
  }
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
