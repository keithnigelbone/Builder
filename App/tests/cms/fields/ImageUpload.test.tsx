import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ImageUpload } from '../../../src/components/cms/fields/ImageUpload';

describe('ImageUpload', () => {
  it('renders the upload button and a URL input', () => {
    const onChange = vi.fn();
    render(
      <ImageUpload
        name="heroImage"
        label="Hero Image"
        value=""
        onChange={onChange}
      />
    );
    expect(
      screen.getByRole('button', { name: /upload image/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument();
  });

  it('shows a validation error for a non-HTTPS URL', () => {
    const onChange = vi.fn();
    render(
      <ImageUpload
        name="heroImage"
        label="Hero Image"
        value="http://example.com/photo.jpg"
        onChange={onChange}
      />
    );
    expect(screen.getByText(/must use https/i)).toBeInTheDocument();
    expect(screen.queryByTestId('heroImage-preview')).not.toBeInTheDocument();
  });

  it('shows a preview thumbnail for a valid HTTPS URL and calls onChange on edit', () => {
    const onChange = vi.fn();
    render(
      <ImageUpload
        name="heroImage"
        label="Hero Image"
        value="https://example.com/photo.jpg"
        onChange={onChange}
      />
    );
    const preview = screen.getByTestId('heroImage-preview') as HTMLImageElement;
    expect(preview).toBeInTheDocument();
    expect(preview.src).toBe('https://example.com/photo.jpg');

    const input = screen.getByDisplayValue('https://example.com/photo.jpg');
    fireEvent.change(input, { target: { value: 'https://example.com/new.jpg' } });
    expect(onChange).toHaveBeenCalledWith('https://example.com/new.jpg');
  });
});
