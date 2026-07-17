import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TextField } from '../../../src/components/cms/fields/TextField';

describe('TextField', () => {
  it('renders with label and input', () => {
    const onChange = vi.fn();
    render(
      <TextField
        name="headline"
        label="Headline"
        value=""
        onChange={onChange}
      />
    );
    expect(screen.getByText('Headline')).toBeInTheDocument();
    expect(screen.getByDisplayValue('')).toBeInTheDocument();
  });

  it('calls onChange when user types', () => {
    const onChange = vi.fn();
    render(
      <TextField
        name="headline"
        label="Headline"
        value=""
        onChange={onChange}
      />
    );
    const input = screen.getByDisplayValue('') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Value' } });
    expect(onChange).toHaveBeenCalledWith('New Value');
  });

  it('enforces maxLength', () => {
    const onChange = vi.fn();
    render(
      <TextField
        name="headline"
        label="Headline"
        value=""
        onChange={onChange}
        maxLength={10}
      />
    );
    const input = screen.getByDisplayValue('') as HTMLInputElement;
    expect(input.maxLength).toBe(10);
  });

  it('shows validation error', () => {
    render(
      <TextField
        name="headline"
        label="Headline"
        value=""
        onChange={() => {}}
        error="Headline is required"
      />
    );
    expect(screen.getByText('Headline is required')).toBeInTheDocument();
  });
});
