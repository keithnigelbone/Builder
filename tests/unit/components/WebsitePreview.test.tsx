import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WebsitePreview } from '../../../App/src/components/previews/WebsitePreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Test headline',
  recommendedComponentNames: [],
  reasoning: '',
};

describe('WebsitePreview', () => {
  it('renders the quote spotlight when a quote is present', () => {
    render(<WebsitePreview plan={{ ...basePlan, quote: { text: 'Great things', name: 'Ada', title: 'Founder' } }} />);

    expect(screen.getByText('"Great things"')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('omits the quote spotlight when no quote is given', () => {
    render(<WebsitePreview plan={basePlan} />);

    expect(screen.queryByText('Founder')).not.toBeInTheDocument();
  });

  it('renders a news card per item when newsItems is present', () => {
    render(
      <WebsitePreview
        plan={{
          ...basePlan,
          newsItems: [
            { title: 'First update', date: '1 July' },
            { title: 'Second update', date: '2 July' },
          ],
        }}
      />,
    );

    expect(screen.getByText('First update')).toBeInTheDocument();
    expect(screen.getByText('Second update')).toBeInTheDocument();
    expect(screen.getByText('1 July')).toBeInTheDocument();
  });

  it('omits the news grid when no newsItems are given', () => {
    render(<WebsitePreview plan={basePlan} />);

    expect(screen.queryByText('1 July')).not.toBeInTheDocument();
  });

  it('renders the contact band headline when present', () => {
    render(<WebsitePreview plan={{ ...basePlan, contactHeadline: 'Get in touch.' }} />);

    expect(screen.getByText('Get in touch.')).toBeInTheDocument();
  });

  it('omits the contact band when no contactHeadline is given', () => {
    render(<WebsitePreview plan={basePlan} />);

    expect(screen.queryByText('Get in touch.')).not.toBeInTheDocument();
  });

  it('always renders a footer with a copyright line', () => {
    render(<WebsitePreview plan={basePlan} />);

    expect(screen.getByText('© Reliance')).toBeInTheDocument();
  });

  it('reuses navItems as footer links alongside the header nav', () => {
    render(<WebsitePreview plan={{ ...basePlan, navItems: ['Docs', 'Support'] }} />);

    expect(screen.getAllByText('Docs')).toHaveLength(2);
  });
});
