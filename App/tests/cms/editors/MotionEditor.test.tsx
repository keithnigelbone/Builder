import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MotionEditor } from '../../../src/components/cms/editors/MotionEditor';

describe('MotionEditor', () => {
  const mockEdits = {
    textOverlay: 'Test Overlay',
    easing: 'ease-in',
  };

  it('renders all Motion fields', () => {
    render(
      <MotionEditor
        edits={mockEdits}
        onChange={() => {}}
        onSave={() => Promise.resolve()}
      />
    );
    expect(screen.getByText('Animation Duration (ms)')).toBeInTheDocument();
    expect(screen.getByText('Text Overlay')).toBeInTheDocument();
    expect(screen.getByText('Primary Color')).toBeInTheDocument();
    expect(screen.getByText('Easing Function')).toBeInTheDocument();
  });

  it('calls onChange when field is edited', () => {
    const onChange = vi.fn();
    render(
      <MotionEditor
        edits={mockEdits}
        onChange={onChange}
        onSave={() => Promise.resolve()}
      />
    );
    const overlayInput = screen.getByDisplayValue('Test Overlay') as HTMLInputElement;
    fireEvent.change(overlayInput, { target: { value: 'New Overlay' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ textOverlay: 'New Overlay', easing: 'ease-in' })
    );
  });
});
