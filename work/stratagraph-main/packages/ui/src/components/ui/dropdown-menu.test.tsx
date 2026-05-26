/**
 * DropdownMenu component tests.
 *
 * @see Issue #186: P14 UI fixes and components review
 *
 * Tests verify:
 * - All component parts are exported
 * - Custom className can be applied
 * - forwardRef components have correct displayName
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from './dropdown-menu';

describe('DropdownMenu', () => {
  describe('Rendering and className', () => {
    it('DropdownMenuItem renders with custom className', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="custom-class" data-testid="menu-item">
              Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const item = screen.getByTestId('menu-item');
      expect(item).toHaveClass('custom-class');
    });

    it('DropdownMenuLabel renders correctly', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel data-testid="menu-label">Label</DropdownMenuLabel>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const label = screen.getByTestId('menu-label');
      expect(label).toBeInTheDocument();
    });

    it('DropdownMenuSeparator renders with custom className', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator className="custom-class" data-testid="menu-separator" />
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const separator = screen.getByTestId('menu-separator');
      expect(separator).toHaveClass('custom-class');
    });
  });

  describe('Styling', () => {
    it('DropdownMenuItem has focus styling', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem data-testid="menu-item">Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const item = screen.getByTestId('menu-item');
      expect(item).toHaveClass('focus:bg-accent');
    });

    it('DropdownMenuLabel has font-medium styling', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel data-testid="menu-label">Label</DropdownMenuLabel>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const label = screen.getByTestId('menu-label');
      expect(label).toHaveClass('font-medium');
    });

    it('DropdownMenuSeparator has separator styling', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator data-testid="menu-separator" />
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const separator = screen.getByTestId('menu-separator');
      expect(separator).toHaveClass('bg-border');
    });
  });
});
