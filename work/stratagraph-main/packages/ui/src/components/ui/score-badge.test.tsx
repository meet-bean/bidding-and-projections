import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBadge } from './score-badge.js';

describe('ScoreBadge', () => {
  it('renders the score value', () => {
    render(<ScoreBadge ratio={85} />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('renders with percent sign when showPercent is true', () => {
    render(<ScoreBadge ratio={85} showPercent />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('does not show percent sign by default', () => {
    render(<ScoreBadge ratio={85} />);
    expect(screen.queryByText('85%')).not.toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('applies score color as background', () => {
    const { container } = render(<ScoreBadge ratio={90} />);
    const badge = container.firstElementChild;
    expect(badge).toHaveStyle({ backgroundColor: 'var(--score-100)' });
  });

  it('applies soft variant styles', () => {
    const { container } = render(<ScoreBadge ratio={90} variant="light" />);
    const badge = container.firstElementChild;
    expect(badge).toHaveStyle({ backgroundColor: 'var(--score-100-soft)' });
    expect(badge).toHaveStyle({ color: 'var(--score-100)' });
  });

  it('applies custom className', () => {
    const { container } = render(<ScoreBadge ratio={50} className="custom-class" />);
    const badge = container.firstElementChild;
    expect(badge).toHaveClass('custom-class');
  });

  it('rounds ratio to nearest score step for color', () => {
    const { container } = render(<ScoreBadge ratio={62} />);
    const badge = container.firstElementChild;
    // 62 rounds to 50 step
    expect(badge).toHaveStyle({ backgroundColor: 'var(--score-50)' });
  });

  it('supports custom steps', () => {
    const { container } = render(<ScoreBadge ratio={90} steps={[0, 50, 100]} />);
    const badge = container.firstElementChild;
    expect(badge).toHaveStyle({ backgroundColor: 'var(--score-100)' });
  });
});
