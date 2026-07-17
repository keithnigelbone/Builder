import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SocialEditor } from '../../../src/components/cms/editors/SocialEditor';

describe('SocialEditor', () => {
  const mockEdits = {
    headline: 'Test Headline',
    caption: 'Test Caption',
  };

  it('renders all Social fields', () => {
    render(
      <SocialEditor
        edits={mockEdits}
        onChange={() => {}}
        onSave={() => Promise.resolve()}
      />
    );
    expect(screen.getByText('Headline')).toBeInTheDocument();
    expect(screen.getByText('Caption')).toBeInTheDocument();
    expect(screen.getByText('Hero Image')).toBeInTheDocument();
    expect(screen.getByText('Call-to-Action Text')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Brand Color Accent')).toBeInTheDocument();
    expect(screen.getByText('Hashtags (comma-separated)')).toBeInTheDocument();
  });

  it('calls onChange when field is edited', () => {
    const onChange = vi.fn();
    render(
      <SocialEditor
        edits={mockEdits}
        onChange={onChange}
        onSave={() => Promise.resolve()}
      />
    );
    const headlineInput = screen.getByDisplayValue('Test Headline') as HTMLInputElement;
    fireEvent.change(headlineInput, { target: { value: 'New Headline' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headline: 'New Headline', caption: 'Test Caption' })
    );
  });
});
