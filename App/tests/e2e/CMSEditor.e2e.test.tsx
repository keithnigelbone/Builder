import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../../src/App';

// ---------------------------------------------------------------------------
// Boundary mocks only: the AI classification/generation pipeline and the
// start/question screens are irrelevant to the CMS save/error/version-history
// workflows under test here, so they're stubbed out exactly like
// App/tests/App.test.tsx does. Everything CMS-related (CMSSidebar, CMSEditor,
// its field editors, BuildPreview, VersionHistory) renders for real — this is
// a true integration test of the save -> file -> git -> preview pipeline, not
// a test of mocked React internals. Node's fs/child_process are mocked at the
// module boundary (same pattern as tests/services/cmsFileService.test.ts) so
// the real cmsFileService code runs against fake I/O.
// ---------------------------------------------------------------------------

vi.mock('../../src/ai/client', () => ({
  requestClassification: vi.fn().mockResolvedValue({
    source: 'fallback',
    data: { category: 'app-screens', reasoning: 'test', followUps: [] },
    fallbackReason: 'offline',
  }),
}));

vi.mock('../../src/data/buildCategories', () => {
  const appScreensCategory = {
    id: 'app-screens',
    label: 'App Screens',
    description: 'test category',
    questions: [],
  };
  return {
    BUILD_CATEGORIES: [appScreensCategory],
    getBuildCategory: (id: string) => (id === 'app-screens' ? appScreensCategory : undefined),
    initialFollowUps: () => [],
  };
});

// patternId 'onboarding' makes AppScreenPreview render plan.headline directly
// (see App/src/components/previews/AppScreenPreview.tsx), so edits to the
// headline field are trivially visible/assertable in the rendered preview.
vi.mock('../../src/ai/orchestrator', () => ({
  generateBuild: vi.fn().mockResolvedValue({
    source: 'fallback',
    data: { patternId: 'onboarding', headline: 'Original Headline', body: 'Original body copy' },
    fallbackReason: 'offline',
  }),
}));

vi.mock('../../src/components/StartScreen', () => ({
  StartScreen: (props: { onSelectCategory: (id: string) => void }) => (
    <button onClick={() => props.onSelectCategory('app-screens')}>start-build</button>
  ),
}));

vi.mock('../../src/components/GuidedQuestionScreen', () => ({
  GuidedQuestionScreen: () => <div data-testid="guided-question-stub" />,
}));

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

// App.tsx and VersionHistory.tsx now talk to cmsFileService over
// /api/cms/save and /api/cms/versions (see App/cmsServicePlugin.ts) instead
// of calling it in-process, since that module can't be bundled into browser
// code. Stand in for that dev-only Vite middleware here so this remains a
// true integration test of save -> file -> git -> preview: fetch is
// intercepted and routed straight to the real cmsFileService functions,
// which themselves run against the mocked node:fs/node:child_process above.
const fetchMock = vi.fn(async (url: string, init?: { body?: string }) => {
  const cmsFileService = await import('../../src/services/cmsFileService');
  const body = init?.body ? JSON.parse(init.body) : {};

  if (url === '/api/cms/save') {
    const metadata = {
      buildId: body.buildId,
      contentType: body.contentType,
      label: body.label,
      timestamp: new Date().toISOString(),
    };
    const original = { plan: body.originalPlan, refinements: body.refinements ?? [] };
    try {
      await cmsFileService.saveVersionToFile(metadata, body.edits, original);
      return { ok: true, json: () => Promise.resolve({ success: true, version: { metadata, edits: body.edits, original } }) };
    } catch (err) {
      return { ok: false, json: () => Promise.resolve({ error: err instanceof Error ? err.message : String(err) }) };
    }
  }

  if (url === '/api/cms/versions') {
    const versions = await cmsFileService.getVersionHistory(body.buildId);
    return { ok: true, json: () => Promise.resolve(versions) };
  }

  throw new Error(`Unexpected fetch in test: ${url}`);
});
vi.stubGlobal('fetch', fetchMock);

async function renderToResultStep() {
  render(<App />);
  fireEvent.click(screen.getByText('start-build'));
  await waitFor(() => screen.getByRole('button', { name: 'Edit Content' }));
}

function openCmsEditor() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit Content' }));
}

function headlineInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Power On Your Future') as HTMLInputElement;
}

function fieldInput(name: string): HTMLInputElement {
  return document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
}

beforeEach(() => {
  mkdirMock.mockClear().mockResolvedValue(undefined);
  writeFileMock.mockClear().mockResolvedValue(undefined);
  readdirMock.mockClear().mockResolvedValue([]);
  readFileMock.mockClear().mockResolvedValue('{}');
  execMock.mockClear();
  execMock.mockImplementation((_command: string, callback: (err: unknown, result: { stdout: string; stderr: string }) => void) => {
    callback(null, { stdout: '', stderr: '' });
  });
});

describe('CMS Editor E2E', () => {
  it('Full workflow: edit -> save -> verify file + git', async () => {
    await renderToResultStep();
    openCmsEditor();

    // Edit multiple fields (headline, image, color).
    fireEvent.change(headlineInput(), { target: { value: 'New E2E Headline' } });
    fireEvent.change(fieldInput('imageUrl'), { target: { value: 'https://example.com/hero.jpg' } });
    fireEvent.change(fieldInput('backgroundColor'), { target: { value: '#123456' } });

    expect(screen.getByText('● Unsaved changes')).toBeInTheDocument();

    // BuildPreview reflects the merged edits before save.
    await waitFor(() => {
      expect(screen.getByText('New E2E Headline')).toBeInTheDocument();
    });
    expect(screen.queryByText('Original Headline')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Version' }));
    fireEvent.change(screen.getByPlaceholderText(/hero section/i), {
      target: { value: 'My E2E version' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writeFileMock).toHaveBeenCalledTimes(1);
    });

    // Version JSON file created with correct metadata, edits, and original plan.
    const [filePath, content] = writeFileMock.mock.calls[0];
    expect(String(filePath)).toMatch(/my-e2e-version\.json$/);
    const saved = JSON.parse(content as string);
    expect(saved.metadata).toMatchObject({ label: 'My E2E version', contentType: 'appscreen' });
    expect(saved.edits).toMatchObject({
      headline: 'New E2E Headline',
      imageUrl: 'https://example.com/hero.jpg',
      backgroundColor: '#123456',
    });
    expect(saved.original.plan).toMatchObject({ patternId: 'onboarding', headline: 'Original Headline' });

    // Git commit created with message "Edit: {label}".
    expect(execMock).toHaveBeenCalledTimes(1);
    const [command] = execMock.mock.calls[0];
    expect(command).toContain('git');
    expect(command).toContain('commit');
    expect(command).toContain('Edit: My E2E version');

    await waitFor(() => {
      expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument();
    });
  });

  it('Unsaved changes confirmation', async () => {
    await renderToResultStep();
    openCmsEditor();

    fireEvent.change(headlineInput(), { target: { value: 'Unsaved edit' } });
    expect(screen.getByText('● Unsaved changes')).toBeInTheDocument();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    // Cancel: editor stays open, edits preserved.
    fireEvent.click(screen.getByRole('button', { name: 'Hide CMS Editor' }));
    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Discard?');
    expect(screen.getByRole('button', { name: 'Save Version' })).toBeInTheDocument();
    expect(headlineInput()).toHaveValue('Unsaved edit');

    // Confirm: editor closes, edits discarded.
    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Hide CMS Editor' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Save Version' })).not.toBeInTheDocument();
    });

    // Reopening shows a fresh (discarded) editor, not the stale edit.
    fireEvent.click(screen.getByRole('button', { name: 'Edit Content' }));
    expect(headlineInput()).toHaveValue('');
    expect(screen.getByText('Original Headline')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('Git commit error handling', async () => {
    await renderToResultStep();
    openCmsEditor();

    fireEvent.change(headlineInput(), { target: { value: 'Attempt 1 headline' } });

    execMock.mockImplementationOnce((_cmd, callback) => {
      callback(new Error('fatal: not a git repository'), { stdout: '', stderr: '' });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Version' }));
    fireEvent.change(screen.getByPlaceholderText(/hero section/i), { target: { value: 'Attempt 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to save version\. Error:/)).toBeInTheDocument();
    });
    expect(screen.getByText(/fatal: not a git repository/)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    const discardButton = screen.getByRole('button', { name: 'Discard' });
    expect(retryButton).toBeInTheDocument();
    expect(discardButton).toBeInTheDocument();

    // Retry: attempt commit again, this time it succeeds (default mock).
    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(screen.queryByText(/Failed to save version/)).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument();
    });
    expect(execMock).toHaveBeenCalledTimes(2);

    // Second failure -> Discard clears edits and closes the modal.
    fireEvent.change(headlineInput(), { target: { value: 'Attempt 2 headline' } });
    execMock.mockImplementationOnce((_cmd, callback) => {
      callback(new Error('fatal: unable to auto-detect email address'), { stdout: '', stderr: '' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Version' }));
    fireEvent.change(screen.getByPlaceholderText(/hero section/i), { target: { value: 'Attempt 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to save version\. Error:/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    await waitFor(() => {
      expect(screen.queryByText(/Failed to save version/)).not.toBeInTheDocument();
    });
    expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument();
    expect(headlineInput()).toHaveValue('');
  });

  it('Version history load workflow', async () => {
    await renderToResultStep();
    openCmsEditor();

    // Save v1 (headline only).
    fireEvent.change(headlineInput(), { target: { value: 'V1 Headline' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Version' }));
    fireEvent.change(screen.getByPlaceholderText(/hero section/i), { target: { value: 'v1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(writeFileMock).toHaveBeenCalledTimes(1));
    const [v1Path, v1Content] = writeFileMock.mock.calls[0];

    // Edit a different field and save v2 (headline carries over + bodyText added).
    fireEvent.change(fieldInput('bodyText'), { target: { value: 'V2 body copy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Version' }));
    fireEvent.change(screen.getByPlaceholderText(/hero section/i), { target: { value: 'v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(writeFileMock).toHaveBeenCalledTimes(2));
    const [v2Path, v2Content] = writeFileMock.mock.calls[1];

    const v1Edits = JSON.parse(v1Content as string).edits;
    expect(v1Edits.headline).toBe('V1 Headline');
    expect(v1Edits.bodyText).toBe('');

    // Wire the mocked fs to serve back exactly these two saved versions.
    const basename = (p: string) => p.split('/').pop() as string;
    readdirMock.mockResolvedValueOnce([basename(v1Path as string), basename(v2Path as string)]);
    readFileMock.mockResolvedValueOnce(v1Content as string).mockResolvedValueOnce(v2Content as string);

    fireEvent.click(screen.getByRole('button', { name: 'Version History' }));

    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
    });
    expect(screen.getByText('v2')).toBeInTheDocument();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByText('v1'));

    expect(confirmSpy).toHaveBeenCalledWith('Replace current edits with version from v1?');

    // Edits load from v1 -- no accidental merge with v2's bodyText edit.
    await waitFor(() => {
      expect(headlineInput()).toHaveValue('V1 Headline');
    });
    expect(fieldInput('bodyText')).toHaveValue('');

    // BuildPreview updates to reflect v1 again.
    await waitFor(() => {
      expect(screen.getByText('V1 Headline')).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });
});
