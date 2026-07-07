import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StepProgress } from '../../../App/src/components/StepProgress';

describe('StepProgress', () => {
  it('renders 1-indexed step text for a 0-indexed step prop', () => {
    render(<StepProgress step={1} total={3} />);
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('renders one indicator dot per total step', () => {
    const { container } = render(<StepProgress step={0} total={4} />);
    const dots = container.querySelectorAll('span[style]');
    expect(dots).toHaveLength(4);
  });
});
