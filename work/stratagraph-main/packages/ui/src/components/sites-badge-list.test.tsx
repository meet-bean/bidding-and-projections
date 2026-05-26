/**
 * SitesBadgeList component tests.
 *
 * @see UDC-005: SitesBadgeList component
 *
 * Tests verify:
 * - Renders all site badges when space allows
 * - Each badge shows the site name
 * - Long site names truncate with ellipsis
 * - Shows "+X" badge when sites overflow
 * - Hover card on "+X" lists all overflow site names
 * - No "+X" badge when all sites fit
 * - Handles empty sites array
 * - Passes className through to OverflowBadgeList
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SitesBadgeList } from './sites-badge-list';
import type { SitesBadgeListItem } from './sites-badge-list';

// --- Mock react-responsive-overflow-list ---
// Renders all items inline; simulates overflow by calling renderOverflow
// with items beyond the 3rd when there are more than 3.

// --- Mock HoverCard to open immediately without delay ---
// Base UI's PreviewCard has built-in delays that cause test timeouts in CI
vi.mock('@/components/ui/hover-card', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  // Simple HoverCard that shows content on hover without delay
  function MockHoverCard({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const childArray = React.Children.toArray(children) as React.ReactElement[];

    // Find trigger and content children
    const trigger = childArray.find(
      (child: React.ReactElement) =>
        React.isValidElement(child) && child.type === MockHoverCardTrigger
    );
    const content = childArray.find(
      (child: React.ReactElement) =>
        React.isValidElement(child) && child.type === MockHoverCardContent
    );

    return (
      <div
        data-testid="mock-hover-card"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {trigger}
        {isOpen && content}
      </div>
    );
  }

  function MockHoverCardTrigger({ children }: { children: React.ReactNode }) {
    return <span data-slot="hover-card-trigger">{children}</span>;
  }

  function MockHoverCardContent({ children }: { children: React.ReactNode }) {
    return <div data-slot="hover-card-content">{children}</div>;
  }

  return {
    HoverCard: MockHoverCard,
    HoverCardTrigger: MockHoverCardTrigger,
    HoverCardContent: MockHoverCardContent,
  };
});

vi.mock('react-responsive-overflow-list', () => ({
  OverflowList: vi.fn(
    ({
      items,
      renderItem,
      renderOverflow,
      className,
    }: {
      items: unknown[];
      renderItem: (item: unknown, index: number) => React.ReactNode;
      renderOverflow?: (items: unknown[]) => React.ReactNode;
      className?: string;
    }) => {
      // Simulate: show first 3 items, overflow the rest
      const visibleCount = Math.min(items.length, 3);
      const visible = items.slice(0, visibleCount);
      const hidden = items.slice(visibleCount);

      return (
        <div data-testid="overflow-list" className={className}>
          {visible.map((item, index) => (
            <div key={index} data-overflow-item={String(index)}>
              {renderItem(item, index)}
            </div>
          ))}
          {hidden.length > 0 && renderOverflow?.(hidden)}
        </div>
      );
    }
  ),
}));

import type React from 'react';

// --- Test data ---

const mockSites: SitesBadgeListItem[] = [
  { id: 'site-chicago', name: 'Chicago Distribution Center' },
  { id: 'site-detroit', name: 'Detroit Assembly Plant' },
  { id: 'site-phoenix', name: 'Phoenix Warehouse' },
  { id: 'site-houston', name: 'Houston Logistics Hub' },
  { id: 'site-seattle', name: 'Seattle Tech Campus' },
];

// --- Tests ---

describe('SitesBadgeList', () => {
  describe('Empty sites', () => {
    it('renders nothing when sites array is empty', () => {
      const { container } = render(<SitesBadgeList sites={[]} />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('All sites visible', () => {
    it('renders all site badges when few sites provided', () => {
      const fewSites = mockSites.slice(0, 3);
      render(<SitesBadgeList sites={fewSites} />);

      for (const site of fewSites) {
        expect(screen.getByText(site.name)).toBeInTheDocument();
      }
    });

    it('each badge shows the site name', () => {
      render(<SitesBadgeList sites={mockSites.slice(0, 2)} />);

      expect(screen.getByText('Chicago Distribution Center')).toBeInTheDocument();
      expect(screen.getByText('Detroit Assembly Plant')).toBeInTheDocument();
    });

    it('no "+X" badge when all sites fit (3 or fewer)', () => {
      render(<SitesBadgeList sites={mockSites.slice(0, 3)} />);

      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });
  });

  describe('Truncation', () => {
    it('badges have truncation styling for long site names', () => {
      render(
        <SitesBadgeList
          sites={[{ id: 'site-1', name: 'A Very Long Site Name That Should Be Truncated' }]}
        />
      );

      const textSpan = screen.getByText('A Very Long Site Name That Should Be Truncated');
      expect(textSpan).toHaveClass('truncate');
    });
  });

  describe('Overflow behavior', () => {
    it('shows "+X" badge when sites overflow', () => {
      render(<SitesBadgeList sites={mockSites} />);

      // Mock shows first 3, overflows 2
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('overflow trigger has aria-label describing hidden site count', () => {
      render(<SitesBadgeList sites={mockSites} />);

      const trigger = screen.getByLabelText('Show 2 more sites');
      expect(trigger).toBeInTheDocument();
    });

    it('hover card on "+X" lists all overflow site names', async () => {
      const user = userEvent.setup();

      render(<SitesBadgeList sites={mockSites} />);

      const overflowBadge = screen.getByText('+2');
      await user.hover(overflowBadge);

      // Wait for hover card to appear with explicit timeout for CI environments
      await waitFor(
        () => {
          expect(screen.getByText('Houston Logistics Hub')).toBeInTheDocument();
          expect(screen.getByText('Seattle Tech Campus')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Pass-through props', () => {
    it('passes className through to OverflowBadgeList', () => {
      render(<SitesBadgeList sites={mockSites} className="custom-sites-class" />);

      const list = screen.getByTestId('overflow-list');
      expect(list).toHaveClass('custom-sites-class');
    });
  });
});
