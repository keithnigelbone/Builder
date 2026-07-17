import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VersionMetadata, CmsEdits, SavedVersion } from '../../src/types';

const mkdirMock = vi.fn().mockResolvedValue(undefined);
const writeFileMock = vi.fn().mockResolvedValue(undefined);
const readdirMock = vi.fn().mockResolvedValue([]);
const readFileMock = vi.fn().mockResolvedValue('{}');

vi.mock('node:fs', () => {
  const fsMock = {
    promises: {
      mkdir: (...args: unknown[]) => mkdirMock(...args),
      writeFile: (...args: unknown[]) => writeFileMock(...args),
      readdir: (...args: unknown[]) => readdirMock(...args),
      readFile: (...args: unknown[]) => readFileMock(...args),
    },
  };
  return { ...fsMock, default: fsMock };
});

const execMock = vi.fn(
  (_command: string, callback: (err: unknown, result: { stdout: string; stderr: string }) => void) => {
    callback(null, { stdout: '', stderr: '' });
  }
);

vi.mock('node:child_process', () => {
  const childProcessMock = {
    exec: (...args: [string, (err: unknown, result: { stdout: string; stderr: string }) => void]) =>
      execMock(...args),
  };
  return { ...childProcessMock, default: childProcessMock };
});

import {
  sanitizeLabel,
  generateVersionFilename,
  saveVersionToFile,
  getVersionHistory,
  deriveBuildId,
} from '../../src/services/cmsFileService';

const original: SavedVersion['original'] = { plan: {}, refinements: [] };
const edits: CmsEdits = { headline: 'New headline' };

function makeMetadata(overrides: Partial<VersionMetadata> = {}): VersionMetadata {
  return {
    buildId: 'build-123',
    contentType: 'appscreen',
    label: 'Hero section – color refinement',
    timestamp: '2026-07-17T10:30:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mkdirMock.mockClear();
  writeFileMock.mockClear();
  readdirMock.mockClear().mockResolvedValue([]);
  readFileMock.mockClear().mockResolvedValue('{}');
  execMock.mockClear();
});

describe('sanitizeLabel', () => {
  it('lowercases, trims, and dashes a normal label', () => {
    expect(sanitizeLabel('Hero section – color refinement')).toBe('hero-section-color-refinement');
  });

  it('collapses multiple spaces and dashes', () => {
    expect(sanitizeLabel('Hero   section --- refinement')).toBe('hero-section-refinement');
  });

  it('trims leading/trailing whitespace and dashes', () => {
    expect(sanitizeLabel('  -- Hero Section --  ')).toBe('hero-section');
  });

  it('strips special characters', () => {
    expect(sanitizeLabel('Fix: bug #42 (urgent!)')).toBe('fix-bug-42-urgent');
  });

  it('handles an already-slug-like string idempotently', () => {
    expect(sanitizeLabel('already-a-slug')).toBe('already-a-slug');
  });

  it('returns an empty string for input that is only special characters', () => {
    expect(sanitizeLabel('***???')).toBe('');
  });
});

describe('generateVersionFilename', () => {
  it('combines the ISO date and slugified label into a filename', () => {
    const filename = generateVersionFilename(makeMetadata());
    expect(filename).toBe('2026-07-17-hero-section-color-refinement.json');
  });

  it('extracts only the date portion of the timestamp', () => {
    const filename = generateVersionFilename(
      makeMetadata({ timestamp: '2026-01-05T23:59:59.999Z', label: 'Quick fix' })
    );
    expect(filename).toBe('2026-01-05-quick-fix.json');
  });
});

describe('saveVersionToFile', () => {
  it('writes a JSON file with 2-space indentation containing metadata, edits, and original', async () => {
    const metadata = makeMetadata();
    await saveVersionToFile(metadata, edits, original);

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledTimes(1);

    const [filePath, content] = writeFileMock.mock.calls[0];
    expect(String(filePath)).toContain('2026-07-17-hero-section-color-refinement.json');

    const expected: SavedVersion = { metadata, edits, original };
    expect(content).toBe(JSON.stringify(expected, null, 2));
  });

  it('creates a git commit with a message derived from the label', async () => {
    const metadata = makeMetadata({ label: 'Quick fix' });
    await saveVersionToFile(metadata, edits, original);

    expect(execMock).toHaveBeenCalledTimes(1);
    const [command] = execMock.mock.calls[0];
    expect(command).toContain('git');
    expect(command).toContain('commit');
    expect(command).toContain('Edit: Quick fix');
  });

  it('rethrows a git commit failure with a clear, prefixed message (file is still written)', async () => {
    execMock.mockImplementationOnce((_command: string, callback: (err: unknown, result: unknown) => void) => {
      callback(new Error('fatal: not a git repository'), { stdout: '', stderr: '' });
    });

    await expect(saveVersionToFile(makeMetadata(), edits, original)).rejects.toThrow(
      'Git commit failed: fatal: not a git repository'
    );
    // The version file was already written before the commit step ran.
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });
});

describe('deriveBuildId', () => {
  it('combines the category id and a slugified freeform prompt', () => {
    const buildId = deriveBuildId({
      category: { id: 'app-screens', label: 'App Screens', description: '', questions: [] as never },
      freeformPrompt: 'A Test Build',
    } as never);
    expect(buildId).toBe('app-screens-a-test-build');
  });

  it('falls back to the category label when there is no freeform prompt', () => {
    const buildId = deriveBuildId({
      category: { id: 'video', label: 'Video Build', description: '', questions: [] as never },
      freeformPrompt: '',
    } as never);
    expect(buildId).toBe('video-video-build');
  });
});

describe('getVersionHistory', () => {
  it('returns an empty array when no version files exist', async () => {
    readdirMock.mockResolvedValueOnce([]);
    const history = await getVersionHistory('build-123');
    expect(history).toEqual([]);
  });

  it('returns an empty array when the builds directory does not exist', async () => {
    readdirMock.mockRejectedValueOnce(new Error('ENOENT'));
    const history = await getVersionHistory('build-123');
    expect(history).toEqual([]);
  });

  it('returns only saved versions matching the given buildId', async () => {
    const matching: SavedVersion = { metadata: makeMetadata({ buildId: 'build-123' }), edits, original };
    const other: SavedVersion = {
      metadata: makeMetadata({ buildId: 'build-999', label: 'Other' }),
      edits,
      original,
    };

    readdirMock.mockResolvedValueOnce(['a.json', 'b.json']);
    readFileMock
      .mockResolvedValueOnce(JSON.stringify(matching))
      .mockResolvedValueOnce(JSON.stringify(other));

    const history = await getVersionHistory('build-123');
    expect(history).toHaveLength(1);
    expect(history[0].metadata.buildId).toBe('build-123');
  });
});
