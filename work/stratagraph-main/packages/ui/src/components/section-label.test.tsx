/**
 * SectionLabel component tests.
 *
 * @see Linear MEE-1770: Extract SectionLabel to @repo/ui.
 *
 * Renders a small all-caps section heading above content blocks. Previously
 * defined inline in reports/overview.tsx — extracted here so it can be
 * reused across all report pages.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionLabel } from './section-label';

describe('SectionLabel', () => {
  it('renders children', () => {
    render(<SectionLabel>Period Summary</SectionLabel>);
    expect(screen.getByText('Period Summary')).toBeInTheDocument();
  });

  it('renders as an <h2> element by default', () => {
    render(<SectionLabel>Observation Health</SectionLabel>);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Observation Health');
  });

  it('has data-slot="section-label" on the root element', () => {
    const { container } = render(<SectionLabel>Manager Accountability</SectionLabel>);
    expect(container.querySelector('[data-slot="section-label"]')).toBeInTheDocument();
  });

  it('accepts and merges an additional className prop', () => {
    render(<SectionLabel className="custom-class">Score Trend</SectionLabel>);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveClass('custom-class');
    // Also retains base classes
    expect(heading).toHaveClass('uppercase');
  });
});
