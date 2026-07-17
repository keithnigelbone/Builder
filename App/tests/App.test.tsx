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

vi.mock('../src/components/ResultScreen', () => ({
  ResultScreen: () => <div data-testid="result-screen-stub" />,
}));

const saveVersionToFileMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../src/services/cmsFileService', () => ({
  saveVersionToFile: (...args: unknown[]) => saveVersionToFileMock(...args),
  sanitizeLabel: (label: string) => label.trim().toLowerCase().replace(/\s+/g, '-'),
}));

let lastCmsSidebarProps: {
  isOpen: boolean;
  onToggle: () => void;
  buildRequest: unknown;
  contentType: string;
  onSave: (label: string, edits: Record<string, unknown>) => Promise<void>;
} | undefined;

vi.mock('../src/components/cms/CMSSidebar', () => ({
  CMSSidebar: (props: {
    isOpen: boolean;
    onToggle: () => void;
    buildRequest: unknown;
    contentType: string;
    onSave: (label: string, edits: Record<string, unknown>) => Promise<void>;
  }) => {
    lastCmsSidebarProps = props;
    return (
      <div data-testid="cms-sidebar-stub" data-open={props.isOpen} data-content-type={props.contentType}>
        <button onClick={props.onToggle}>toggle-cms</button>
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
