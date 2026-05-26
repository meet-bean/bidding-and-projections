/**
 * UserBadge component tests.
 *
 * @see Spec: UDC-002 — UserBadge component
 *
 * Tests verify:
 * - Renders user name from a provided user object
 * - Renders avatar next to name when showAvatar is true (default)
 * - Hides avatar when showAvatar is false
 * - Shows Skeleton while loading when given a user ID string (loading state)
 * - Renders user data after fetch completes (resolved state)
 * - Shows HoverCard on hover with full name, role, email, larger avatar
 * - Renders "Unknown user" fallback on error state
 * - Applies custom className
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserBadge } from './user-badge';
import type { UserBadgeUser } from './user-badge';

const mockUser: UserBadgeUser = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'admin',
  imageUrl: 'https://example.com/avatar.jpg',
};

describe('UserBadge', () => {
  describe('Renders user name from a provided user object', () => {
    it('renders the user name as text', () => {
      render(<UserBadge user={mockUser} />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('renders the user name for a user without optional fields', () => {
      const minimalUser: UserBadgeUser = { id: 'user-2', name: 'John Smith' };
      render(<UserBadge user={minimalUser} />);

      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  describe('Avatar rendering', () => {
    it('renders avatar next to name when showAvatar is true (default)', () => {
      render(<UserBadge user={mockUser} />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      // Avatar should be rendered (data-slot="avatar")
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
    });

    it('hides avatar when showAvatar is false', () => {
      render(<UserBadge user={mockUser} showAvatar={false} />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).not.toBeInTheDocument();
    });

    it('renders fallback initials when no imageUrl is provided', () => {
      const userNoImage: UserBadgeUser = { id: 'user-3', name: 'Jane Doe' };
      render(<UserBadge user={userNoImage} />);

      // Avatar fallback should show initials
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('JD');
    });
  });

  describe('Loading state (skeleton)', () => {
    it('shows Skeleton while loading', () => {
      render(<UserBadge user="loading" status="loading" />);

      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not show user name while loading', () => {
      render(<UserBadge user="some-user-id" status="loading" />);

      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    });
  });

  describe('Resolved state after fetch', () => {
    it('renders user data after fetch completes', () => {
      render(<UserBadge user={mockUser} />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('renders "Unknown user" fallback on error', () => {
      render(<UserBadge user="invalid-id" status="error" />);

      expect(screen.getByText('Unknown user')).toBeInTheDocument();
    });

    it('applies muted styling to unknown user text', () => {
      render(<UserBadge user="invalid-id" status="error" />);

      const unknownText = screen.getByText('Unknown user');
      expect(unknownText).toHaveClass('text-muted-foreground');
    });
  });

  describe('HoverCard', () => {
    it('shows HoverCard on hover with full name, role, email, avatar', async () => {
      const user = userEvent.setup();
      render(<UserBadge user={mockUser} />);

      const trigger = screen.getByText('Jane Doe');
      await user.hover(trigger);

      // HoverCard content should show expanded details via UserCardDisplay
      // The hover card has a delay, so we wait for it
      const hoverName = await screen.findByText('Jane Doe', {}, { timeout: 2000 });
      expect(hoverName).toBeInTheDocument();

      // Role should appear in the hover card (UserRoleBadge maps 'admin' → 'Admin')
      const roleText = await screen.findByText('Admin', {}, { timeout: 2000 });
      expect(roleText).toBeInTheDocument();

      // Email should appear in the hover card
      const emailText = await screen.findByText('jane@example.com', {}, { timeout: 2000 });
      expect(emailText).toBeInTheDocument();

      // Both inline badge and hover card should have avatars
      const avatars = document.querySelectorAll('[data-slot="avatar"]');
      expect(avatars.length).toBeGreaterThanOrEqual(2);
    });

    it('does not show HoverCard for loading state', () => {
      render(<UserBadge user="some-id" status="loading" />);

      // No hover card trigger should exist during loading
      const trigger = document.querySelector('[data-slot="hover-card-trigger"]');
      expect(trigger).not.toBeInTheDocument();
    });

    it('does not show HoverCard for error state', () => {
      render(<UserBadge user="some-id" status="error" />);

      // No hover card trigger should exist for error state
      const trigger = document.querySelector('[data-slot="hover-card-trigger"]');
      expect(trigger).not.toBeInTheDocument();
    });
  });

  describe('Discriminated union props', () => {
    it('renders loading state when user is string with status="loading"', () => {
      render(<UserBadge user="some-id" status="loading" />);

      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders error state when user is string with status="error"', () => {
      render(<UserBadge user="some-id" status="error" />);

      expect(screen.getByText('Unknown user')).toBeInTheDocument();
    });

    it('renders resolved user when user is an object (no status needed)', () => {
      render(<UserBadge user={mockUser} />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className to the root element', () => {
      render(<UserBadge user={mockUser} className="custom-class" data-testid="user-badge" />);

      expect(screen.getByTestId('user-badge')).toHaveClass('custom-class');
    });
  });
});
