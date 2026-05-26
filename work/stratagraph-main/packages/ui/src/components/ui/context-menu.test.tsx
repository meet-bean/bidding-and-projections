/**
 * ContextMenu primitives tests.
 * Covers open/close, keyboard navigation, submenu, hover-card item, ARIA.
 */
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuItemHoverCard,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './context-menu';

describe('ContextMenu', () => {
  describe('open/close', () => {
    it('renders trigger and opens the menu on click', async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>First</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      await user.click(screen.getByText('Open'));
      expect(await screen.findByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'First' })).toBeInTheDocument();
    });

    it('closes on Escape', async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>First</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );

      expect(await screen.findByRole('menu')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('label + separator + shortcut', () => {
    it('renders a section label and a separator inside the menu', async () => {
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel>Section</ContextMenuLabel>
              <ContextMenuItem>One</ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuItem>
              Two <ContextMenuShortcut>⌘K</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );

      expect(await screen.findByText('Section')).toBeInTheDocument();
      expect(screen.getByText('Section')).toHaveAttribute('data-slot', 'context-menu-label');
      expect(screen.getByText('⌘K')).toHaveAttribute('data-slot', 'context-menu-shortcut');
      // Group wrapper carries the data-slot root attribute
      expect(document.querySelector('[data-slot="context-menu-group"]')).toBeInTheDocument();
      // Separator: query by data-slot since it has no accessible name
      expect(document.querySelector('[data-slot="context-menu-separator"]')).toBeInTheDocument();
    });
  });

  describe('submenu', () => {
    it('opens a submenu when ArrowRight is pressed on the sub-trigger', async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Before</ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Nested</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      );

      const subTrigger = await screen.findByRole('menuitem', { name: /More/ });
      expect(subTrigger).toHaveAttribute('aria-haspopup', 'menu');
      expect(subTrigger).toHaveAttribute('aria-expanded', 'false');

      // Move focus into the menu via keyboard. Base UI puts initial keyboard
      // focus on the first item with ArrowDown from the open menu.
      await user.keyboard('{ArrowDown}'); // focus 'Before'
      await user.keyboard('{ArrowDown}'); // focus the sub-trigger

      // Sanity-check we're on the sub-trigger before pressing ArrowRight.
      await waitFor(() => {
        expect(subTrigger).toHaveFocus();
      });

      await user.keyboard('{ArrowRight}');

      await screen.findByRole('menuitem', { name: 'Nested' });
      await waitFor(() => {
        expect(subTrigger).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('ARIA attributes', () => {
    it('exposes role="menu" on the popup and role="menuitem" on each item', async () => {
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>First</ContextMenuItem>
            <ContextMenuItem>Second</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );

      expect(await screen.findByRole('menu')).toBeInTheDocument();
      expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    });

    it('marks the sub-trigger with aria-haspopup="menu"', async () => {
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Nested</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      );

      const sub = await screen.findByRole('menuitem', { name: /More/ });
      expect(sub).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  describe('keyboard navigation', () => {
    it('moves focus to previous item with ArrowUp', async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>First</ContextMenuItem>
            <ContextMenuItem>Second</ContextMenuItem>
            <ContextMenuItem>Third</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );

      await screen.findByRole('menu');
      await user.keyboard('{ArrowDown}'); // First
      await user.keyboard('{ArrowDown}'); // Second
      await user.keyboard('{ArrowDown}'); // Third
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Third' })).toHaveFocus();
      });
      await user.keyboard('{ArrowUp}');
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Second' })).toHaveFocus();
      });
    });

    it('activates focused item with Enter', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={onSelect}>Activate me</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );

      await screen.findByRole('menu');
      await user.keyboard('{ArrowDown}');
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Activate me' })).toHaveFocus();
      });
      await user.keyboard('{Enter}');
      expect(onSelect).toHaveBeenCalled();
    });
  });

  describe('ContextMenuItemHoverCard', () => {
    it('opens the hover-card popup when the item is focused', async () => {
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItemHoverCard preview={<div>Preview body</div>}>
              Item with preview
            </ContextMenuItemHoverCard>
          </ContextMenuContent>
        </ContextMenu>
      );

      const item = await screen.findByRole('menuitem', { name: 'Item with preview' });
      expect(screen.queryByText('Preview body')).not.toBeInTheDocument();

      await act(async () => {
        item.focus();
      });
      expect(await screen.findByText('Preview body')).toBeInTheDocument();
    });

    it('closes the hover-card on Escape without closing the parent menu', async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItemHoverCard preview={<div>Preview body</div>}>
              Item with preview
            </ContextMenuItemHoverCard>
          </ContextMenuContent>
        </ContextMenu>
      );

      const item = await screen.findByRole('menuitem', { name: 'Item with preview' });
      await act(async () => {
        item.focus();
      });
      await screen.findByText('Preview body');

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByText('Preview body')).not.toBeInTheDocument();
      });
      // Parent menu remains open
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('closes the hover-card on Tab without closing the parent menu', async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItemHoverCard preview={<button type="button">Inside</button>}>
              Item
            </ContextMenuItemHoverCard>
            <ContextMenuItem>After</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );

      const item = await screen.findByRole('menuitem', { name: 'Item' });
      await act(async () => {
        item.focus();
      });
      await screen.findByRole('button', { name: 'Inside' });

      await user.keyboard('{Tab}');
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Inside' })).not.toBeInTheDocument();
      });
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('restores focus to the item when the popup is dismissed via Escape from inside', async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItemHoverCard preview={<button type="button">Inside</button>}>
              Item
            </ContextMenuItemHoverCard>
          </ContextMenuContent>
        </ContextMenu>
      );

      const item = await screen.findByRole('menuitem', { name: 'Item' });
      await act(async () => {
        item.focus();
      });
      const inside = await screen.findByRole('button', { name: 'Inside' });

      // Move focus into the popup (simulating a click)
      await act(async () => {
        inside.focus();
      });
      expect(inside).toHaveFocus();

      // Escape from inside the popup
      await user.keyboard('{Escape}');

      // Popup is gone, menu remains, focus is restored to the item
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Inside' })).not.toBeInTheDocument();
      });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(item).toHaveFocus();
    });
  });
});
