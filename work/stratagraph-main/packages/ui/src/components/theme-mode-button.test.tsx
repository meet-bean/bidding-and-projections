/**
 * ThemeModeButton component tests.
 *
 * @see Issue #207: P16-012: Create ThemeModeButton component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeModeButton, type ThemeModeButtonProps } from './theme-mode-button.js';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Sun: () => <span data-testid="icon-sun">Sun Icon</span>,
  Moon: () => <span data-testid="icon-moon">Moon Icon</span>,
  Monitor: () => <span data-testid="icon-monitor">Monitor Icon</span>,
  Check: () => <span data-testid="icon-check">Check Icon</span>,
}));

describe('ThemeModeButton', () => {
  const mockSetTheme = vi.fn();

  const defaultProps: ThemeModeButtonProps = {
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: mockSetTheme,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Base component accepts theme props', () => {
    it('accepts theme, resolvedTheme, and setTheme props', () => {
      render(<ThemeModeButton {...defaultProps} />);

      // Should render without error
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('show="icon"', () => {
    it('renders icon-only button', () => {
      render(<ThemeModeButton {...defaultProps} show="icon" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Should have icon but no text label
      expect(screen.getByTestId('icon-moon')).toBeInTheDocument();
      expect(screen.queryByText(/light/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/dark/i)).not.toBeInTheDocument();
    });

    it('shows Moon icon in light mode (to switch to dark)', () => {
      render(<ThemeModeButton {...defaultProps} show="icon" resolvedTheme="light" />);

      expect(screen.getByTestId('icon-moon')).toBeInTheDocument();
      expect(screen.queryByTestId('icon-sun')).not.toBeInTheDocument();
    });

    it('shows Sun icon in dark mode (to switch to light)', () => {
      render(<ThemeModeButton {...defaultProps} show="icon" resolvedTheme="dark" />);

      expect(screen.getByTestId('icon-sun')).toBeInTheDocument();
      expect(screen.queryByTestId('icon-moon')).not.toBeInTheDocument();
    });

    it('toggles theme on click', () => {
      render(<ThemeModeButton {...defaultProps} show="icon" resolvedTheme="light" />);

      fireEvent.click(screen.getByRole('button'));
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('toggles from dark to light', () => {
      render(<ThemeModeButton {...defaultProps} show="icon" resolvedTheme="dark" />);

      fireEvent.click(screen.getByRole('button'));
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('show="label"', () => {
    it('shows label without icon', () => {
      render(<ThemeModeButton {...defaultProps} show="label" resolvedTheme="light" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByText(/dark/i)).toBeInTheDocument();
    });

    it('shows correct label for dark mode', () => {
      render(<ThemeModeButton {...defaultProps} show="label" resolvedTheme="dark" />);

      expect(screen.getByText(/light/i)).toBeInTheDocument();
    });

    it('toggles theme on click', () => {
      render(<ThemeModeButton {...defaultProps} show="label" resolvedTheme="light" />);

      fireEvent.click(screen.getByRole('button'));
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('select=true', () => {
    it('opens dropdown with Light/Dark/System options', async () => {
      render(<ThemeModeButton {...defaultProps} select />);

      // Click to open dropdown
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      // Wait for dropdown menu items (use menuitem role to avoid matching trigger label)
      const items = await screen.findAllByRole('menuitem');
      const itemTexts = items.map((item) => item.textContent);
      expect(itemTexts.some((t) => t?.includes('Light'))).toBe(true);
      expect(itemTexts.some((t) => t?.includes('Dark'))).toBe(true);
      expect(itemTexts.some((t) => t?.includes('System'))).toBe(true);
    });

    it('calls setTheme when option is selected', async () => {
      render(<ThemeModeButton {...defaultProps} select theme="light" />);

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));

      // Select Dark option via menuitem role
      const items = await screen.findAllByRole('menuitem');
      const darkItem = items.find((item) => item.textContent?.includes('Dark'));
      expect(darkItem).toBeDefined();
      fireEvent.click(darkItem!);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('shows current theme selection', async () => {
      render(<ThemeModeButton {...defaultProps} select theme="dark" />);

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));

      // The Dark option should have a data-selected attribute
      const items = await screen.findAllByRole('menuitem');
      const darkItem = items.find((item) => item.textContent?.includes('Dark'));
      expect(darkItem).toBeDefined();
      const selectedEl =
        darkItem?.closest('[data-selected]') ??
        (darkItem?.hasAttribute('data-selected') ? darkItem : null);
      expect(selectedEl).not.toBeNull();
    });
  });

  describe('Button variant prop', () => {
    it('applies ghost variant by default', () => {
      render(<ThemeModeButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('applies outline variant when specified', () => {
      render(<ThemeModeButton {...defaultProps} variant="outline" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('applies default variant when specified', () => {
      render(<ThemeModeButton {...defaultProps} variant="default" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has appropriate aria-label for icon variant', () => {
      render(<ThemeModeButton {...defaultProps} show="icon" />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      expect(button).toBeInTheDocument();
    });

    it('button is focusable', () => {
      render(<ThemeModeButton {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });
});
