import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CMSSidebar } from '../../src/components/cms/CMSSidebar';
import type { BuildRequest } from '../../src/types';

vi.mock('../../src/components/cms/CMSEditor', () => ({
  CMSEditor: (props: { contentType: string; buildRequest: unknown; onSave: unknown }) => (
    <div data-testid="cms-editor-stub" data-content-type={props.contentType} />
  ),
}));

const mockBuildRequest = {
  category: { id: 'app-screens', label: 'App Screens', description: '', questions: [] },
  freeformPrompt: 'A test build',
  answers: {},
  answerLabels: {},
  refinements: [],
  plan: {},
  classifyMeta: { source: 'fallback', reasoning: '' },
  planMeta: { source: 'fallback', reasoning: '' },
} as unknown as BuildRequest;

describe('CMSSidebar', () => {
  it('renders the header with a title and toggle button', () => {
    render(
      <CMSSidebar
        isOpen
        onToggle={vi.fn()}
        buildRequest={mockBuildRequest}
        contentType="appscreen"
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('CMS Editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close cms editor/i })).toBeInTheDocument();
  });

  it('fires onToggle when the toggle button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <CMSSidebar
        isOpen
        onToggle={onToggle}
        buildRequest={mockBuildRequest}
        contentType="appscreen"
        onSave={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /close cms editor/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('displays the content type badge', () => {
    render(
      <CMSSidebar
        isOpen
        onToggle={vi.fn()}
        buildRequest={mockBuildRequest}
        contentType="video"
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('Editing: Video')).toBeInTheDocument();
  });

  it('renders CMSEditor with the props passed through', () => {
    const onSave = vi.fn();
    render(
      <CMSSidebar
        isOpen
        onToggle={vi.fn()}
        buildRequest={mockBuildRequest}
        contentType="social"
        onSave={onSave}
      />
    );
    const stub = screen.getByTestId('cms-editor-stub');
    expect(stub).toHaveAttribute('data-content-type', 'social');
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CMSSidebar
        isOpen={false}
        onToggle={vi.fn()}
        buildRequest={mockBuildRequest}
        contentType="appscreen"
        onSave={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
