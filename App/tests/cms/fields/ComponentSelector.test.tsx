import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ComponentSelector } from '../../../src/components/cms/fields/ComponentSelector';

describe('ComponentSelector', () => {
  const mockOptions = [
    { label: 'Hero Section', value: 'hero' },
    { label: 'Feature Block', value: 'feature' },
    { label: 'CTA Button', value: 'cta' },
  ];

  it('renders with label and dropdown displaying correct options', () => {
    const onChange = vi.fn();
    render(
      <ComponentSelector
        name="componentType"
        label="Select Component"
        value="hero"
        onChange={onChange}
        options={mockOptions}
      />
    );
    expect(screen.getByText('Select Component')).toBeInTheDocument();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('hero');
    expect(screen.getByRole('option', { name: 'Hero Section' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Feature Block' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CTA Button' })).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(
      <ComponentSelector
        name="componentType"
        label="Select Component"
        value="hero"
        onChange={onChange}
        options={mockOptions}
      />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'feature' } });
    expect(onChange).toHaveBeenCalledWith('feature');
  });
});
