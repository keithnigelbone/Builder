import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppScreenPreview } from '../../../App/src/components/previews/AppScreenPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  screenTitle: 'Test Screen',
  recommendedComponentNames: [],
  reasoning: '',
};

describe('AppScreenPreview', () => {
  it('renders a list-item block with icon, title, and subtitle', () => {
    render(
      <AppScreenPreview
        plan={{ ...basePlan, contentBlocks: [{ type: 'list-item', icon: 'home', title: 'Item title', subtitle: 'Item subtitle' }] }}
      />,
    );

    expect(screen.getByText('Item title')).toBeInTheDocument();
    expect(screen.getByText('Item subtitle')).toBeInTheDocument();
  });

  it('renders a list-item block without a subtitle when none is given', () => {
    render(<AppScreenPreview plan={{ ...basePlan, contentBlocks: [{ type: 'list-item', title: 'Item title' }] }} />);

    expect(screen.getByText('Item title')).toBeInTheDocument();
  });

  it('renders a stat block with its value and label', () => {
    render(<AppScreenPreview plan={{ ...basePlan, contentBlocks: [{ type: 'stat', value: '42', label: 'Stat label' }] }} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Stat label')).toBeInTheDocument();
  });

  it('renders an image-card block reusing the plan hero image, with its caption', () => {
    render(
      <AppScreenPreview
        plan={{
          ...basePlan,
          heroImage: 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
          contentBlocks: [{ type: 'image-card', caption: 'Card caption' }],
        }}
      />,
    );

    expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
    expect(screen.getByText('Card caption')).toBeInTheDocument();
  });

  it('renders an action block as a button with its label', () => {
    render(<AppScreenPreview plan={{ ...basePlan, contentBlocks: [{ type: 'action', label: 'Do the thing' }] }} />);

    expect(screen.getByRole('button', { name: 'Do the thing' })).toBeInTheDocument();
  });

  it('renders custom bottom nav items when screenNavItems is given', () => {
    render(
      <AppScreenPreview
        plan={{ ...basePlan, screenNavItems: [{ label: 'Orders', icon: 'list' }, { label: 'Profile', icon: 'user' }] }}
      />,
    );

    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('falls back to two generic list-items and Home/Search/Settings nav when the plan has neither field', () => {
    render(<AppScreenPreview plan={basePlan} />);

    expect(screen.getAllByText('Content block')).toHaveLength(2);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
