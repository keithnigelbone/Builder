import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppScreenEditor } from '../../../src/components/cms/editors/AppScreenEditor';

describe('AppScreenEditor', () => {
  const mockEdits = {
    headline: 'Test Headline',
    bodyText: 'Test Body',
  };

  it('renders all AppScreen fields', () => {
    render(
      <AppScreenEditor
        edits={mockEdits}
        onChange={() => {}}
        onSave={() => Promise.resolve()}
      />
    );
    expect(screen.getByText('Headline')).toBeInTheDocument();
    expect(screen.getByText('Body Copy')).toBeInTheDocument();
    expect(screen.getByText('Button Text')).toBeInTheDocument();
    expect(screen.getByText('Button Action')).toBeInTheDocument();
    expect(screen.getByText('Hero Image')).toBeInTheDocument();
    expect(screen.getByText('Image Alt Text')).toBeInTheDocument();
    expect(screen.getByText('Background Color')).toBeInTheDocument();
    expect(screen.getByText('Text Color')).toBeInTheDocument();
    expect(screen.getByText('Layout Variant')).toBeInTheDocument();
  });

  it('calls onChange when field is edited', () => {
    const onChange = vi.fn();
    render(
      <AppScreenEditor
        edits={mockEdits}
        onChange={onChange}
        onSave={() => Promise.resolve()}
      />
    );
    const headlineInput = screen.getByDisplayValue('Test Headline') as HTMLInputElement;
    fireEvent.change(headlineInput, { target: { value: 'New Headline' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headline: 'New Headline', bodyText: 'Test Body' })
    );
  });
});
