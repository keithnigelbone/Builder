import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ColorPicker } from '../../../src/components/cms/fields/ColorPicker';

describe('ColorPicker', () => {
  it('renders label and color input', () => {
    render(
      <ColorPicker
        name="backgroundColor"
        label="Background Color"
        value="#1a2640"
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Background Color')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('#1a2640').length).toBeGreaterThan(0);
  });

  it('validates hex color format', () => {
    const onChange = vi.fn();
    render(
      <ColorPicker
        name="backgroundColor"
        label="Background Color"
        value="#gggggg"
        onChange={onChange}
      />
    );
    const input = screen.getByDisplayValue('#gggggg') as HTMLInputElement;
    fireEvent.blur(input);
    expect(screen.getByText(/valid hex/i)).toBeInTheDocument();
  });

  it('shows color preview swatch', () => {
    render(
      <ColorPicker
        name="backgroundColor"
        label="Background Color"
        value="#1a2640"
        onChange={() => {}}
      />
    );
    const swatch = screen.getByRole('img', { hidden: true }) as HTMLElement;
    expect(swatch).toHaveStyle({ backgroundColor: '#1a2640' });
  });

  it('updates color when a brand token button is clicked', () => {
    const onChange = vi.fn();
    render(
      <ColorPicker
        name="backgroundColor"
        label="Background Color"
        value="#1a2640"
        onChange={onChange}
      />
    );
    const tokenButton = screen.getByRole('button', { name: 'Reliance Gold' });
    fireEvent.click(tokenButton);
    expect(onChange).toHaveBeenCalledWith('#d4a574');
  });
});
