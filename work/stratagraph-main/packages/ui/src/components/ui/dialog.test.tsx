/**
 * Dialog component tests.
 *
 * @see Issue #173: P14-013: Fix Dialog animation origin
 *
 * Tests verify:
 * - All components are exported
 * - Dialog opens with centered zoom-in animation
 * - Dialog closes with centered zoom-out animation
 * - Backdrop has blur effect
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogOverlay } from './dialog';

describe('Dialog', () => {
  describe('DialogOverlay Animation Classes - Issue #173', () => {
    it('has backdrop blur effect', () => {
      render(
        <Dialog defaultOpen>
          <DialogOverlay data-testid="overlay" />
        </Dialog>
      );

      const overlay = screen.getByTestId('overlay');
      // Base UI uses supports query for backdrop blur
      expect(overlay.className).toContain('backdrop-blur');
    });

    it('has fade animations', () => {
      render(
        <Dialog defaultOpen>
          <DialogOverlay data-testid="overlay" />
        </Dialog>
      );

      const overlay = screen.getByTestId('overlay');
      // Base UI uses data-open/data-closed instead of data-[state=...]
      expect(overlay).toHaveClass('data-open:fade-in-0');
      expect(overlay).toHaveClass('data-closed:fade-out-0');
    });
  });

  describe('DialogContent Animation Classes - Issue #173', () => {
    it('has centered zoom animations (not slide)', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent data-testid="content">Test content</DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('content');
      // Should have zoom animations for centered effect
      expect(content).toHaveClass('data-open:zoom-in-95');
      expect(content).toHaveClass('data-closed:zoom-out-95');

      // Should NOT have slide animations that cause top-left origin
      expect(content.className).not.toContain('slide-out-to-left');
      expect(content.className).not.toContain('slide-out-to-top');
    });

    it('has animation duration', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent data-testid="content">Test content</DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('duration-100');
    });

    it('is centered with translate transforms', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent data-testid="content">Test content</DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('content');
      // Should maintain center positioning
      expect(content).toHaveClass('left-1/2');
      expect(content).toHaveClass('top-1/2');
      expect(content).toHaveClass('-translate-x-1/2');
      expect(content).toHaveClass('-translate-y-1/2');
    });
  });
});
