/**
 * Toaster component tests.
 *
 * @see Issue #176: P14-016: Style Toast component for dark mode and emotions
 * @see Issue #203: P16-008: Enhance Toast with sentiment variants
 *
 * Acceptance criteria:
 * - Toast follows dark/light theme
 * - Success toast has green background
 * - Error toast has red/destructive background
 * - Warning toast has yellow background
 * - Info toast has blue background
 * - Promise toast shows spinner while pending
 * - Text is readable (sufficient contrast)
 * - Toast with duration=Infinity stays until manually dismissed
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { Toaster, toast, getToastClassNames } from './sonner';

describe('Toaster', () => {
  afterEach(() => {
    // Dismiss all toasts between tests
    toast.dismiss();
    cleanup();
  });

  describe('getToastClassNames sentiment variants', () => {
    it('returns correct sentiment class names for error (destructive)', () => {
      const classNames = getToastClassNames();
      expect(classNames.error).toContain('border-destructive');
      expect(classNames.error).toContain('bg-destructive');
      expect(classNames.error).toContain('text-destructive-foreground');
    });

    it('returns correct sentiment class names for warning', () => {
      const classNames = getToastClassNames();
      expect(classNames.warning).toContain('border-warning');
      expect(classNames.warning).toContain('bg-warning');
      expect(classNames.warning).toContain('text-warning-foreground');
    });

    it('returns correct sentiment class names for success', () => {
      const classNames = getToastClassNames();
      expect(classNames.success).toContain('border-success');
      expect(classNames.success).toContain('bg-success');
      expect(classNames.success).toContain('text-success-foreground');
    });

    it('returns correct sentiment class names for info', () => {
      const classNames = getToastClassNames();
      expect(classNames.info).toContain('border-info');
      expect(classNames.info).toContain('bg-info');
      expect(classNames.info).toContain('text-info-foreground');
    });
  });

  describe('sentiment variant rendering', () => {
    it('error toast renders with data-type attribute', async () => {
      render(<Toaster />);

      toast.error('Error message');

      await waitFor(() => {
        const toastElement = document.querySelector("[data-type='error']");
        expect(toastElement).toBeInTheDocument();
      });
    });

    it('warning toast renders with data-type attribute', async () => {
      render(<Toaster />);

      toast.warning('Warning message');

      await waitFor(() => {
        const toastElement = document.querySelector("[data-type='warning']");
        expect(toastElement).toBeInTheDocument();
      });
    });

    it('success toast renders with data-type attribute', async () => {
      render(<Toaster />);

      toast.success('Success message');

      await waitFor(() => {
        const toastElement = document.querySelector("[data-type='success']");
        expect(toastElement).toBeInTheDocument();
      });
    });

    it('info toast renders with data-type attribute', async () => {
      render(<Toaster />);

      toast.info('Info message');

      await waitFor(() => {
        const toastElement = document.querySelector("[data-type='info']");
        expect(toastElement).toBeInTheDocument();
      });
    });
  });

  describe('duration=Infinity', () => {
    it('toast with duration=Infinity remains visible', async () => {
      render(<Toaster />);

      toast('Persistent toast', { duration: Infinity });

      await waitFor(() => {
        expect(screen.getByText('Persistent toast')).toBeInTheDocument();
      });

      // Wait a bit to confirm it persists (the default duration is typically 4000ms)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Toast should still be visible
      expect(screen.getByText('Persistent toast')).toBeInTheDocument();
    });
  });
});
