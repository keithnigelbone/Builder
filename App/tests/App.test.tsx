import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../src/App';

vi.mock('../src/ai/client', () => ({
  requestClassification: vi.fn().mockResolvedValue({
    source: 'fallback',
    data: { category: 'app-screens', reasoning: 'test', followUps: [] },
    fallbackReason: 'offline',
  }),
}));

// Give the mocked category zero follow-up questions so beginGuidedFlow goes
// straight to the 'result' step instead of the guided question flow — this
// test cares about the CMS integration, not the question flow itself.
vi.mock('../src/data/buildCategories', () => {
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

vi.mock('../src/ai/orchestrator', () => ({
  generateBuild: vi.fn().mockResolvedValue({
    source: 'fallback',
    data: { headline: 'Test headline' },
    fallbackReason: 'offline',
  }),
}));

vi.mock('../src/components/StartScreen', () => ({
  StartScreen: (props: { onSelectCategory: (id: string) => void }) => (
    <button onClick={() => props.onSelectCategory('app-screens')}>start-build</button>
  ),
}));

vi.mock('../src/components/GuidedQuestionScreen', () => ({
  GuidedQuestionScreen: () => <div data-testid="guided-question-stub" />,
}));

let lastResultScreenProps: { cmsEdits?: Record<string, unknown>; onStartOver: () => void } | undefined;

vi.mock('../src/components/ResultScreen', () => ({
  ResultScreen: (props: { cmsEdits?: Record<string, unknown>; onStartOver: () => void }) => {
    lastResultScreenProps = props;
    return (
      <div data-testid="result-screen-stub" data-cms-edits={JSON.stringify(props.cmsEdits ?? null)}>
        <button onClick={props.onStartOver}>start-over</button>
      </div>
    );
  },
}));

const saveVersionToFileMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../src/services/cmsFileService', () => ({
  saveVersionToFile: (...args: unknown[]) => saveVersionToFileMock(...args),
  sanitizeLabel: (label: string) => label.trim().toLowerCase().replace(/\s+/g, '-'),
  deriveBuildId: (buildRequest: { category: { id: string; label: string }; freeformPrompt: string }) =>
    `${buildRequest.category.id}-${(buildRequest.freeformPrompt || buildRequest.category.label)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')}`,
}));

let lastCmsSidebarProps: {
  isOpen: boolean;
  onToggle: () => void;
  buildRequest: unknown;
  contentType: string;
  onSave: (label: string, edits: Record<string, unknown>) => Promise<void>;
  onEditsChange?: (edits: Record<string, unknown>) => void;
} | undefined;

vi.mock('../src/components/cms/CMSSidebar', () => ({
  CMSSidebar: (props: {
    isOpen: boolean;
    onToggle: () => void;
    buildRequest: unknown;
    contentType: string;
    onSave: (label: string, edits: Record<string, unknown>) => Promise<void>;
    onEditsChange?: (edits: Record<string, unknown>) => void;
  }) => {
    lastCmsSidebarProps = props;
    return (
      <div data-testid="cms-sidebar-stub" data-open={props.isOpen} data-content-type={props.contentType}>
        <button onClick={props.onToggle}>toggle-cms</button>
        {/* Simulates a CMSEditor field edit lifting through CMSSidebar to App. */}
        <button onClick={() => props.onEditsChange?.({ headline: 'Edited from CMSEditor' })}>
          simulate-cms-edit
        </button>
        <button onClick={() => props.onEditsChange?.({ bodyText: 'Second field edited' })}>
          simulate-second-cms-edit
        </button>
      </div>
    );
  },
}));

async function renderToResultStep() {
  render(<App />);
  fireEvent.click(screen.getByText('start-build'));
  await waitFor(() => screen.getByTestId('result-screen-stub'));
}

describe('App CMS integration', () => {
  beforeEach(() => {
    lastCmsSidebarProps = undefined;
    saveVersionToFileMock.mockClear();
  });

  it('renders CMSSidebar with correct props once a build exists', async () => {
    await renderToResultStep();

    expect(screen.getByTestId('cms-sidebar-stub')).toBeInTheDocument();
    expect(lastCmsSidebarProps).toBeDefined();
    expect(lastCmsSidebarProps?.isOpen).toBe(false);
    expect(lastCmsSidebarProps?.contentType).toBe('appscreen');
    expect(lastCmsSidebarProps?.buildRequest).toBeDefined();
    expect(typeof lastCmsSidebarProps?.onToggle).toBe('function');
    expect(typeof lastCmsSidebarProps?.onSave).toBe('function');
  });

  it('fires handleToggleCms and binds the result to isCmsOpen on CMSSidebar', async () => {
    await renderToResultStep();

    expect(lastCmsSidebarProps?.isOpen).toBe(false);
    fireEvent.click(screen.getByText('toggle-cms'));
    await waitFor(() => expect(lastCmsSidebarProps?.isOpen).toBe(true));

    fireEvent.click(screen.getByText('toggle-cms'));
    await waitFor(() => expect(lastCmsSidebarProps?.isOpen).toBe(false));
  });

  it('save handler calls cmsFileService.saveVersionToFile with label and edits', async () => {
    await renderToResultStep();

    await lastCmsSidebarProps?.onSave('My label', { headline: 'Edited' });

    expect(saveVersionToFileMock).toHaveBeenCalledTimes(1);
    const [metadata, edits] = saveVersionToFileMock.mock.calls[0];
    expect(metadata).toMatchObject({ label: 'My label', contentType: 'appscreen' });
    expect(edits).toEqual({ headline: 'Edited' });
  });

  it('content type setter updates cmsContentType and is reflected on CMSSidebar', async () => {
    await renderToResultStep();

    expect(lastCmsSidebarProps?.contentType).toBe('appscreen');

    fireEvent.change(screen.getByLabelText(/cms content type/i), { target: { value: 'video' } });

    await waitFor(() => expect(lastCmsSidebarProps?.contentType).toBe('video'));
  });

  it('does not render CMSSidebar before a build result exists', () => {
    render(<App />);
    expect(screen.queryByTestId('cms-sidebar-stub')).not.toBeInTheDocument();
  });
});

describe('App cmsEdits state connection', () => {
  beforeEach(() => {
    lastCmsSidebarProps = undefined;
    lastResultScreenProps = undefined;
    saveVersionToFileMock.mockClear();
  });

  it('passes no cmsEdits to ResultScreen/BuildPreview before any field is edited', async () => {
    await renderToResultStep();

    expect(lastResultScreenProps?.cmsEdits).toBeUndefined();
  });

  it('lifts a CMSEditor field edit into App state and forwards it to ResultScreen (BuildPreview)', async () => {
    await renderToResultStep();

    expect(typeof lastCmsSidebarProps?.onEditsChange).toBe('function');

    fireEvent.click(screen.getByText('simulate-cms-edit'));

    await waitFor(() => {
      expect(lastResultScreenProps?.cmsEdits).toEqual({ headline: 'Edited from CMSEditor' });
    });
    expect(screen.getByTestId('result-screen-stub')).toHaveAttribute(
      'data-cms-edits',
      JSON.stringify({ headline: 'Edited from CMSEditor' })
    );
  });

  it('replaces cmsEdits on each change rather than accumulating stale fields', async () => {
    await renderToResultStep();

    fireEvent.click(screen.getByText('simulate-cms-edit'));
    await waitFor(() => {
      expect(lastResultScreenProps?.cmsEdits).toEqual({ headline: 'Edited from CMSEditor' });
    });

    // CMSEditor always lifts its full edits object (not a partial diff), so
    // the second edit's payload should fully replace the first's in App
    // state — no leftover `headline` field lingering alongside `bodyText`.
    fireEvent.click(screen.getByText('simulate-second-cms-edit'));
    await waitFor(() => {
      expect(lastResultScreenProps?.cmsEdits).toEqual({ bodyText: 'Second field edited' });
    });
    expect(lastResultScreenProps?.cmsEdits).not.toHaveProperty('headline');
  });

  it('resets cmsEdits when a new build is generated, so stale edits never leak into the next build', async () => {
    await renderToResultStep();

    fireEvent.click(screen.getByText('simulate-cms-edit'));
    await waitFor(() => {
      expect(lastResultScreenProps?.cmsEdits).toEqual({ headline: 'Edited from CMSEditor' });
    });

    // Starting over returns to the start screen; beginning a fresh build
    // should not carry the previous build's lifted edits along with it.
    fireEvent.click(screen.getByText('start-over'));
    await waitFor(() => screen.getByText('start-build'));
    fireEvent.click(screen.getByText('start-build'));
    await waitFor(() => screen.getByTestId('result-screen-stub'));

    expect(lastResultScreenProps?.cmsEdits).toBeUndefined();
  });
});
