/**
 * BulkEditDialog component tests.
 *
 * Tests verify:
 * - Header renders "Edit {N} {entityLabel}"
 * - Body renders children slot
 * - Footer has Cancel and Save buttons
 * - Save button is disabled when hasChanges is false
 * - Save button is enabled when hasChanges is true
 * - Save button shows loading state when isPending
 * - onSave is called when Save is clicked
 * - onOpenChange(false) is called when Cancel is clicked
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkEditDialog } from './bulk-edit-dialog';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  selectedCount: 5,
  entityLabel: 'users',
  onSave: vi.fn(),
  isPending: false,
  hasChanges: false,
  children: <div data-testid="body-slot">Field content</div>,
};

describe('BulkEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('Header', () => {
    it('renders the correct title with count and entity label', () => {
      render(<BulkEditDialog {...defaultProps} selectedCount={3} entityLabel="procedures" />);
      expect(screen.getByRole('heading', { name: 'Edit 3 procedures' })).toBeInTheDocument();
    });

    it('renders the correct title for a single item', () => {
      render(<BulkEditDialog {...defaultProps} selectedCount={1} entityLabel="user" />);
      expect(screen.getByRole('heading', { name: 'Edit 1 user' })).toBeInTheDocument();
    });
  });

  describe('Body (children slot)', () => {
    it('renders children inside the dialog', () => {
      render(<BulkEditDialog {...defaultProps} />);
      expect(screen.getByTestId('body-slot')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(<BulkEditDialog {...defaultProps} />);
      expect(screen.getByText('Field content')).toBeInTheDocument();
    });
  });

  describe('Footer buttons', () => {
    it('renders a Cancel button', () => {
      render(<BulkEditDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders a Save button', () => {
      render(<BulkEditDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  describe('Save button disabled state', () => {
    it('is disabled when hasChanges is false', () => {
      render(<BulkEditDialog {...defaultProps} hasChanges={false} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('is enabled when hasChanges is true', () => {
      render(<BulkEditDialog {...defaultProps} hasChanges={true} />);
      expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
    });

    it('is disabled when isPending is true even if hasChanges is true', () => {
      render(<BulkEditDialog {...defaultProps} hasChanges={true} isPending={true} />);
      // When pending, button text changes to "Saving..." - match by that text
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });
  });

  describe('Interactions', () => {
    it('calls onSave when Save button is clicked', async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      render(<BulkEditDialog {...defaultProps} hasChanges={true} onSave={onSave} />);

      await user.click(screen.getByRole('button', { name: /save/i }));
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('does not call onSave when Save is clicked while disabled', async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      render(<BulkEditDialog {...defaultProps} hasChanges={false} onSave={onSave} />);

      await user.click(screen.getByRole('button', { name: /save/i }));
      expect(onSave).not.toHaveBeenCalled();
    });

    it('calls onOpenChange(false) when Cancel is clicked', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<BulkEditDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    });
  });

  describe('Dialog visibility', () => {
    it('does not render content when open is false', () => {
      render(<BulkEditDialog {...defaultProps} open={false} />);
      expect(screen.queryByRole('heading', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('renders content when open is true', () => {
      render(<BulkEditDialog {...defaultProps} open={true} />);
      expect(screen.getByRole('heading', { name: /edit/i })).toBeInTheDocument();
    });
  });
});
