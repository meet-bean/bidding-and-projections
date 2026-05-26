/**
 * ErrorFallback component tests.
 *
 * @see Issue #168: P14-008: Improve error boundary with toast and navigation
 *
 * Acceptance criteria:
 * - ErrorFallback has "Go Back" button when onNavigateBack provided
 * - Clicking "Go Back" calls the callback
 * - Error includes actionable guidance (not just "Something Went Wrong")
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorFallback } from './error-fallback';

describe('ErrorFallback', () => {
  const testError = new Error('Test error message');

  describe('Basic Rendering', () => {
    it('renders with default title and description', () => {
      render(<ErrorFallback error={testError} />);

      expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
      expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
    });

    it('always displays a reload button for recovery', () => {
      render(<ErrorFallback error={testError} />);

      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('renders custom title when provided', () => {
      render(<ErrorFallback error={testError} title="Unable to Load Page" />);

      expect(screen.getByRole('heading', { name: /unable to load page/i })).toBeInTheDocument();
    });

    it('renders custom description when provided', () => {
      render(
        <ErrorFallback
          error={testError}
          description="We encountered an error. You can try going back, retrying, or reloading."
        />
      );

      expect(screen.getByText(/we encountered an error/i)).toBeInTheDocument();
    });
  });

  describe('Go Back Button (onNavigateBack)', () => {
    it('shows Go Back button when onNavigateBack callback is provided', () => {
      const handleNavigateBack = vi.fn();

      render(<ErrorFallback error={testError} onNavigateBack={handleNavigateBack} />);

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('does not show Go Back button when onNavigateBack is not provided', () => {
      render(<ErrorFallback error={testError} />);

      expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
    });

    it('calls onNavigateBack callback when Go Back button is clicked', async () => {
      const user = userEvent.setup();
      const handleNavigateBack = vi.fn();

      render(<ErrorFallback error={testError} onNavigateBack={handleNavigateBack} />);

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(handleNavigateBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Try Again Button (reset)', () => {
    it('shows Try Again button when reset function is provided', () => {
      const handleReset = vi.fn();

      render(<ErrorFallback error={testError} reset={handleReset} />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('does not show Try Again button when reset is not provided', () => {
      render(<ErrorFallback error={testError} />);

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('calls reset callback when Try Again button is clicked', async () => {
      const user = userEvent.setup();
      const handleReset = vi.fn();

      render(<ErrorFallback error={testError} reset={handleReset} />);

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      expect(handleReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Details', () => {
    it('shows error message when showDetails is true', () => {
      render(<ErrorFallback error={testError} showDetails />);

      expect(screen.getByText(testError.message)).toBeInTheDocument();
    });

    it('hides error message when showDetails is false (default)', () => {
      render(<ErrorFallback error={testError} />);

      expect(screen.queryByText(testError.message)).not.toBeInTheDocument();
    });

    it('handles errors with empty message gracefully', () => {
      const emptyError = new Error('');

      render(<ErrorFallback error={emptyError} showDetails />);

      // Should not crash, and the pre element shouldn't render for empty messages
      expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    });
  });

  describe('Actionable Guidance', () => {
    it('provides actionable guidance in default description (not just error message)', () => {
      render(<ErrorFallback error={testError} />);

      // The description should guide users on what they can do
      const description = screen.getByText(/please try again or reload/i);
      expect(description).toBeInTheDocument();
    });

    it('can display enhanced actionable guidance with custom description', () => {
      render(
        <ErrorFallback
          error={testError}
          description="We encountered an error loading this page. You can try going back, retrying, or reloading the page."
        />
      );

      // Should contain multiple recovery options
      expect(screen.getByText(/going back/i)).toBeInTheDocument();
    });

    it('provides multiple recovery options when all callbacks provided', () => {
      render(<ErrorFallback error={testError} onNavigateBack={vi.fn()} reset={vi.fn()} />);

      // All three recovery options should be available
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });
  });
});
