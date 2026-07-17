import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VideoEditor } from '../../../src/components/cms/editors/VideoEditor';

describe('VideoEditor', () => {
  const mockEdits = {
    title: 'Test Title',
    subtitle: 'Test Subtitle',
  };

  it('renders all Video fields', () => {
    render(
      <VideoEditor
        edits={mockEdits}
        onChange={() => {}}
        onSave={() => Promise.resolve()}
      />
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Voiceover Script')).toBeInTheDocument();
    expect(screen.getByText('Background Music')).toBeInTheDocument();
    expect(screen.getByText('Duration (seconds)')).toBeInTheDocument();
  });

  it('calls onChange when field is edited', () => {
    const onChange = vi.fn();
    render(
      <VideoEditor
        edits={mockEdits}
        onChange={onChange}
        onSave={() => Promise.resolve()}
      />
    );
    const titleInput = screen.getByDisplayValue('Test Title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Title', subtitle: 'Test Subtitle' })
    );
  });
});
