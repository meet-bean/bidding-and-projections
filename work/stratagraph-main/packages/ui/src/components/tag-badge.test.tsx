/**
 * TagBadge component tests.
 *
 * Tests verify:
 * - Default variant renders outline style (color-mix bg, colored border/text)
 * - Solid variant renders solid bg with contrasting text
 * - Icon resolution from string names
 * - Remove button behavior
 * - className passthrough
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagBadge } from './tag-badge';

describe('TagBadge', () => {
  describe('default variant (outline)', () => {
    it('renders the tag name', () => {
      render(<TagBadge name="Safety" color="#2563eb" />);
      expect(screen.getByText('Safety')).toBeInTheDocument();
    });

    it('applies color-mix background and colored border/text', () => {
      render(<TagBadge name="Safety" color="#2563eb" />);
      const badge = screen.getByText('Safety').closest('[data-slot="badge"]');
      expect(badge).toHaveStyle({
        backgroundColor: 'color-mix(in srgb, #2563eb 15%, transparent)',
        borderColor: 'color-mix(in srgb, #2563eb 30%, transparent)',
        color: '#2563eb',
      });
    });

    it('renders outline style when variant="default" is explicit', () => {
      render(<TagBadge name="Safety" color="#2563eb" variant="default" />);
      const badge = screen.getByText('Safety').closest('[data-slot="badge"]');
      expect(badge).toHaveStyle({
        backgroundColor: 'color-mix(in srgb, #2563eb 15%, transparent)',
        color: '#2563eb',
      });
    });
  });

  describe('solid variant', () => {
    it('applies the tag color as solid background', () => {
      render(<TagBadge name="Safety" color="#2563eb" variant="solid" />);
      const badge = screen.getByText('Safety').closest('[data-slot="badge"]');
      expect(badge).toHaveStyle({ backgroundColor: '#2563eb' });
    });

    it('uses light text on dark background', () => {
      render(<TagBadge name="Dark" color="#000000" variant="solid" />);
      const badge = screen.getByText('Dark').closest('[data-slot="badge"]');
      expect(badge).toHaveStyle({ color: '#ffffff' });
    });

    it('uses dark text on light background', () => {
      render(<TagBadge name="Light" color="#FFFFFF" variant="solid" />);
      const badge = screen.getByText('Light').closest('[data-slot="badge"]');
      expect(badge).toHaveStyle({ color: '#171717' });
    });
  });

  describe('icon rendering', () => {
    it('renders icon when showIcon is true and icon name provided', () => {
      render(<TagBadge name="Safety" color="#2563eb" icon="Shield" showIcon />);
      const badge = screen.getByText('Safety').closest('[data-slot="badge"]');
      const icon = badge?.querySelector('[data-tag-icon]');
      expect(icon).toBeInTheDocument();
    });

    it('does not render icon when showIcon is false (default)', () => {
      render(<TagBadge name="Safety" color="#2563eb" icon="Shield" />);
      const badge = screen.getByText('Safety').closest('[data-slot="badge"]');
      const icon = badge?.querySelector('[data-tag-icon]');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('remove button', () => {
    it('renders remove button when onRemove is provided', () => {
      render(<TagBadge name="Safety" color="#2563eb" onRemove={() => {}} />);
      expect(screen.getByRole('button', { name: /remove safety/i })).toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(<TagBadge name="Safety" color="#2563eb" onRemove={onRemove} />);
      await user.click(screen.getByRole('button', { name: /remove/i }));
      expect(onRemove).toHaveBeenCalledOnce();
    });

    it('does not render remove button when onRemove is not provided', () => {
      render(<TagBadge name="Safety" color="#2563eb" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('className', () => {
    it('applies custom className', () => {
      render(<TagBadge name="Safety" color="#2563eb" className="custom-class" />);
      const badge = screen.getByText('Safety').closest('[data-slot="badge"]');
      expect(badge).toHaveClass('custom-class');
    });
  });
});
