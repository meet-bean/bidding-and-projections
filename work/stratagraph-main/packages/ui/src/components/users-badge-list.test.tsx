/**
 * UsersBadgeList component tests.
 *
 * @see UDC-010: UsersBadgeList component
 *
 * Tests verify:
 * - Renders all user badges when space allows
 * - Shows "+X" badge with hover card for overflow users
 * - Accepts mixed string and UserBadgeUser array
 * - Handles empty users array (returns null)
 * - Forwards className props
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersBadgeList } from './users-badge-list';
import type { UserBadgeUser } from './user-badge';

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

const mockUsers: UserBadgeUser[] = [
  { id: 'user-1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'admin' },
  { id: 'user-2', name: 'Michael Chen', email: 'michael@example.com', role: 'executive' },
  { id: 'user-3', name: 'Emily Rodriguez', email: 'emily@example.com', role: 'site_manager' },
  { id: 'user-4', name: 'David Kim', email: 'david@example.com', role: 'supervisor' },
  { id: 'user-5', name: 'Jennifer Martinez', email: 'jennifer@example.com', role: 'operator' },
];

// --- Tests ---

describe('UsersBadgeList', () => {
  describe('Empty users', () => {
    it('renders nothing when users array is empty', () => {
      const { container } = render(<UsersBadgeList users={[]} />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('All users visible', () => {
    it('renders all user badges when few users provided', () => {
      const fewUsers = mockUsers.slice(0, 3);
      render(<UsersBadgeList users={fewUsers} />);

      for (const user of fewUsers) {
        expect(screen.getByText(user.name)).toBeInTheDocument();
      }
    });

    it('no "+X" badge when all users fit (3 or fewer)', () => {
      render(<UsersBadgeList users={mockUsers.slice(0, 3)} />);

      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });
  });

  describe('Overflow behavior', () => {
    it('shows "+X" badge when users overflow', () => {
      render(<UsersBadgeList users={mockUsers} />);

      // Mock shows first 3, overflows 2
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('hover card on "+X" lists all overflow user names', async () => {
      const user = userEvent.setup();

      render(<UsersBadgeList users={mockUsers} />);

      const overflowBadge = screen.getByText('+2');
      await user.hover(overflowBadge);

      expect(await screen.findByText('David Kim')).toBeInTheDocument();
      expect(await screen.findByText('Jennifer Martinez')).toBeInTheDocument();
    });
  });

  describe('Mixed input (strings and UserBadgeUser)', () => {
    it('accepts mixed string and UserBadgeUser array', () => {
      const mixedUsers: (string | UserBadgeUser)[] = [
        mockUsers[0]!,
        'unknown-user-id',
        mockUsers[2]!,
      ];

      render(<UsersBadgeList users={mixedUsers} />);

      // Resolved user should show name
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Emily Rodriguez')).toBeInTheDocument();
    });
  });

  describe('Pass-through props', () => {
    it('passes className through to OverflowBadgeList', () => {
      render(<UsersBadgeList users={mockUsers} className="custom-users-class" />);

      const list = screen.getByTestId('overflow-list');
      expect(list).toHaveClass('custom-users-class');
    });
  });
});
