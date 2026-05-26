/**
 * TagsBadgeList component tests.
 *
 * @see Spec: UDC-006 — TagsBadgeList component
 *
 * Tests verify:
 * - Renders all tag badges when space allows
 * - Each badge shows tag name with category color
 * - Each badge shows category icon
 * - Shows "+X" badge when tags overflow
 * - Hover card on "+X" lists overflow tags with category colors
 * - Handles empty tags array
 * - Tags from different categories render with distinct colors
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagsBadgeList } from './tags-badge-list';
import type { TagsBadgeListItem } from './tags-badge-list';

// --- Mock react-responsive-overflow-list ---

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
      // Simulate: show first 2 items, overflow the rest (when > 2)
      const visibleCount = Math.min(items.length, 2);
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

// --- Mock data ---

const mockTags: TagsBadgeListItem[] = [
  {
    id: 'tag-1',
    name: 'Safety',
    category: { name: 'Compliance', color: '#2563eb', icon: 'Shield' },
  },
  {
    id: 'tag-2',
    name: 'Electrical',
    category: { name: 'Department', color: '#059669', icon: 'Zap' },
  },
  {
    id: 'tag-3',
    name: 'Maintenance',
    category: { name: 'Type', color: '#d97706', icon: 'Wrench' },
  },
  {
    id: 'tag-4',
    name: 'Critical',
    category: { name: 'Priority', color: '#dc2626', icon: 'AlertTriangle' },
  },
  {
    id: 'tag-5',
    name: 'Review',
    category: { name: 'Status', color: '#7c3aed', icon: 'Eye' },
  },
];

// --- Tests ---

describe('TagsBadgeList', () => {
  describe('Empty tags array', () => {
    it('renders nothing when tags array is empty', () => {
      const { container } = render(<TagsBadgeList tags={[]} />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Renders all tag badges when space allows', () => {
    it('renders visible tag names as badges', () => {
      render(<TagsBadgeList tags={mockTags.slice(0, 2)} />);

      expect(screen.getByText('Safety')).toBeInTheDocument();
      expect(screen.getByText('Electrical')).toBeInTheDocument();
    });
  });

  describe('Each badge shows tag name with category color', () => {
    it('renders badges with category background color via style', () => {
      render(<TagsBadgeList tags={mockTags.slice(0, 2)} />);

      const safetyBadge = screen.getByText('Safety').closest('[data-slot="badge"]');
      expect(safetyBadge).toBeInTheDocument();
      expect(safetyBadge).toHaveStyle({ '--tag-color': '#2563eb' });

      const electricalBadge = screen.getByText('Electrical').closest('[data-slot="badge"]');
      expect(electricalBadge).toBeInTheDocument();
      expect(electricalBadge).toHaveStyle({ '--tag-color': '#059669' });
    });

    it('tags from different categories render with distinct colors', () => {
      render(<TagsBadgeList tags={mockTags.slice(0, 2)} />);

      const badges = document.querySelectorAll('[data-slot="badge"]');
      const colors = new Set<string>();
      for (const badge of badges) {
        const style = (badge as HTMLElement).style;
        const tagColor = style.getPropertyValue('--tag-color');
        if (tagColor) {
          colors.add(tagColor);
        }
      }
      expect(colors.size).toBe(2);
    });
  });

  describe('Each badge shows category icon', () => {
    it('renders an icon element for each visible tag', () => {
      render(<TagsBadgeList tags={mockTags.slice(0, 2)} />);

      const badges = document.querySelectorAll('[data-slot="badge"]');
      for (const badge of badges) {
        const icon = badge.querySelector('[data-tag-icon]');
        expect(icon).toBeInTheDocument();
      }
    });

    it('resolves lowercase icon names to lucide-react SVG icons', () => {
      const lowercaseTags: TagsBadgeListItem[] = [
        {
          id: 'tag-lc-1',
          name: 'Shield Tag',
          category: { name: 'Tools', color: '#3B82F6', icon: 'shield' },
        },
        {
          id: 'tag-lc-2',
          name: 'Zap Tag',
          category: { name: 'Process', color: '#10B981', icon: 'zap' },
        },
      ];

      render(<TagsBadgeList tags={lowercaseTags} />);

      const badges = document.querySelectorAll('[data-slot="badge"]');
      for (const badge of badges) {
        const icon = badge.querySelector('[data-tag-icon]');
        expect(icon).toBeInTheDocument();
        expect(icon?.tagName.toLowerCase()).not.toBe('span');
      }
    });
  });

  describe('Overflow behavior', () => {
    it('shows "+X" badge when tags overflow', () => {
      render(<TagsBadgeList tags={mockTags} />);

      // Mock shows first 2, overflows 3
      const overflowBadge = screen.getByText('+3');
      expect(overflowBadge).toBeInTheDocument();
    });

    it('overflow trigger has aria-label describing hidden tag count', () => {
      render(<TagsBadgeList tags={mockTags} />);

      const trigger = screen.getByLabelText('Show 3 more tags');
      expect(trigger).toBeInTheDocument();
    });

    it('hover card on "+X" lists overflow tags with category colors', async () => {
      const user = userEvent.setup();
      render(<TagsBadgeList tags={mockTags} />);

      const overflowBadge = screen.getByText('+3');
      await user.hover(overflowBadge);

      const maintenanceInCard = await screen.findByText('Maintenance', {}, { timeout: 2000 });
      expect(maintenanceInCard).toBeInTheDocument();

      const criticalInCard = await screen.findByText('Critical', {}, { timeout: 2000 });
      expect(criticalInCard).toBeInTheDocument();

      const reviewInCard = await screen.findByText('Review', {}, { timeout: 2000 });
      expect(reviewInCard).toBeInTheDocument();
    });
  });

  describe('Props passthrough', () => {
    it('applies custom className', () => {
      render(<TagsBadgeList tags={mockTags} className="custom-class" />);

      const container = document.querySelector('.custom-class');
      expect(container).toBeInTheDocument();
    });
  });
});
