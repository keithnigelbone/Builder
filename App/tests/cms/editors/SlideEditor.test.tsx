import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SlideEditor } from '../../../src/components/cms/editors/SlideEditor';

describe('SlideEditor', () => {
  const mockEdits = {
    title: 'Test Title',
    speakerNotes: 'Test Notes',
  };

  it('renders all Slide fields', () => {
    render(
      <SlideEditor
        edits={mockEdits}
        onChange={() => {}}
        onSave={() => Promise.resolve()}
      />
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Bullet Points')).toBeInTheDocument();
    expect(screen.getByText('Background Image')).toBeInTheDocument();
    expect(screen.getByText('Speaker Notes')).toBeInTheDocument();
    expect(screen.getByText('Transition Effect')).toBeInTheDocument();
  });

  it('calls onChange when field is edited', () => {
    const onChange = vi.fn();
    render(
      <SlideEditor
        edits={mockEdits}
        onChange={onChange}
        onSave={() => Promise.resolve()}
      />
    );
    const titleInput = screen.getByDisplayValue('Test Title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Title', speakerNotes: 'Test Notes' })
    );
  });
});
