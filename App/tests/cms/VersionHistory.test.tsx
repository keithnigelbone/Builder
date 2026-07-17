import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VersionHistory } from '../../src/components/cms/VersionHistory';
import type { SavedVersion } from '../../src/types';

// VersionHistory now fetches from /api/cms/versions (App/cmsServicePlugin.ts)
// rather than calling cmsFileService in-process — stub global fetch instead
// of mocking the (now server-only) cmsFileService module.
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

/** Resolve the next /api/cms/versions call with the given versions. */
function mockFetchVersionsResolved(versions: SavedVersion[]) {
  fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(versions) });
}

/** Leave the next /api/cms/versions call pending forever (loading state). */
function mockFetchVersionsPending() {
  fetchMock.mockReturnValue(new Promise(() => {}));
}

function makeVersion(overrides: Partial<SavedVersion['metadata']> = {}): SavedVersion {
  return {
    metadata: {
      buildId: 'build-123',
      contentType: 'appscreen',
      label: 'Hero section – color refinement',
      timestamp: '2026-07-17T10:30:00.000Z',
      git: { commit: 'abc1234def', branch: 'main' },
      ...overrides,
    },
    edits: { headline: 'New headline' },
    original: { plan: {}, refinements: [] },
  } as SavedVersion;
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('VersionHistory', () => {
  it('shows a loading state while fetching versions', () => {
    mockFetchVersionsPending();
    render(<VersionHistory buildId="build-123" onLoadVersion={vi.fn()} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state when no versions are found', async () => {
    mockFetchVersionsResolved([]);
    render(<VersionHistory buildId="build-123" onLoadVersion={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/no saved versions/i)).toBeInTheDocument();
    });
  });

  it('renders the version list with timestamp, label, and commit', async () => {
    mockFetchVersionsResolved([makeVersion()]);
    render(<VersionHistory buildId="build-123" onLoadVersion={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Hero section – color refinement')).toBeInTheDocument();
    });
    expect(screen.getByText('2026-07-17T10:30:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('abc1234')).toBeInTheDocument();
  });

  it('POSTs the buildId to /api/cms/versions', async () => {
    mockFetchVersionsResolved([]);
    render(<VersionHistory buildId="build-123" onLoadVersion={vi.fn()} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/cms/versions');
    expect(JSON.parse(init.body as string)).toEqual({ buildId: 'build-123' });
  });

  it('shows a confirmation dialog and fires onLoadVersion with the correct edits when confirmed', async () => {
    const onLoadVersion = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const version = makeVersion();
    mockFetchVersionsResolved([version]);

    render(<VersionHistory buildId="build-123" onLoadVersion={onLoadVersion} />);

    await waitFor(() => {
      expect(screen.getByText('Hero section – color refinement')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Hero section – color refinement'));

    expect(confirmSpy).toHaveBeenCalledWith(
      'Replace current edits with version from Hero section – color refinement?'
    );
    expect(onLoadVersion).toHaveBeenCalledWith(version.edits);

    confirmSpy.mockRestore();
  });

  it('does not fire onLoadVersion when the confirmation dialog is cancelled', async () => {
    const onLoadVersion = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockFetchVersionsResolved([makeVersion()]);

    render(<VersionHistory buildId="build-123" onLoadVersion={onLoadVersion} />);

    await waitFor(() => {
      expect(screen.getByText('Hero section – color refinement')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Hero section – color refinement'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onLoadVersion).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
