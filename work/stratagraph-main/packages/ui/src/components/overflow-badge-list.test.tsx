/**
 * OverflowBadgeList component tests.
 *
 * Tests verify:
 * - Renders all items via the library primitive
 * - Shows overflow badge when library reports hidden items
 * - renderOverflow receives the correct array of hidden items
 * - Handles empty items array (renders nothing)
 * - Applies custom className
 * - Passes maxRows to the library primitive
 * - Passes renderItemVisibility to bypass React.Activity
 * - Sets SSR style (flexWrap, no maxHeight)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverflowBadgeList } from './overflow-badge-list';

// --- Mock react-responsive-overflow-list ---

// Store the last props passed to the library so tests can inspect them
let lastProps: Record<string, unknown> = {};

vi.mock('react-responsive-overflow-list', () => ({
  OverflowList: vi.fn(
    ({
      items,
      renderItem,
      renderOverflow,
      renderItemVisibility,
      className,
      maxRows,
      maxVisibleItems,
      style,
      ...rest
    }: {
      items: unknown[];
      renderItem: (item: unknown, index: number) => React.ReactNode;
      renderOverflow?: (items: unknown[]) => React.ReactNode;
      renderItemVisibility?: (
        node: React.ReactNode,
        meta: { visible: boolean; index: number }
      ) => React.ReactNode;
      className?: string;
      maxRows?: number;
      maxVisibleItems?: number;
      style?: React.CSSProperties;
    }) => {
      lastProps = { items, renderOverflow, renderItemVisibility, className, maxRows, maxVisibleItems, style, ...rest };

      return (
        <div
          data-testid="overflow-list-primitive"
          className={className}
          data-max-rows={maxRows}
          style={style}
        >
          {items.map((item, index) => (
            <div key={index}>{renderItem(item, index)}</div>
          ))}
        </div>
      );
    }
  ),
}));

import type React from 'react';

// --- Helpers ---

const items = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];

function renderItem(item: string) {
  return <span data-testid={`item-${item}`}>{item}</span>;
}

function renderOverflow(overflowItems: string[]) {
  return <span data-testid="overflow-indicator">+{overflowItems.length}</span>;
}

beforeEach(() => {
  lastProps = {};
});

// --- Tests ---

describe('OverflowBadgeList', () => {
  describe('Empty items', () => {
    it('renders nothing when items array is empty', () => {
      const { container } = render(
        <OverflowBadgeList items={[]} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      expect(container.innerHTML).toBe('');
    });
  });

  describe('Renders items via library primitive', () => {
    it('renders all items through the OverflowListPrimitive', () => {
      render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      for (const item of items) {
        expect(screen.getByTestId(`item-${item}`)).toBeInTheDocument();
      }
    });

    it('passes items to the library primitive', () => {
      render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      expect(lastProps.items).toEqual(items);
    });

    it('passes renderItem directly to the library (no wrapper div)', () => {
      const renderItemSpy = vi.fn((item: string) => (
        <span data-testid={`item-${item}`}>{item}</span>
      ));

      render(
        <OverflowBadgeList
          items={items}
          renderItem={renderItemSpy}
          renderOverflow={renderOverflow}
        />
      );

      // renderItem is passed directly — the library calls it
      expect(renderItemSpy).toHaveBeenCalledTimes(items.length);
      expect(renderItemSpy).toHaveBeenCalledWith('Alpha', 0, expect.any(Object));
    });
  });

  describe('renderItemVisibility', () => {
    it('passes a custom renderItemVisibility to bypass React.Activity', () => {
      render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      expect(lastProps.renderItemVisibility).toBeDefined();
      expect(typeof lastProps.renderItemVisibility).toBe('function');
    });

    it('returns null for hidden items (minItems handled in renderOverflow)', () => {
      render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      const riv = lastProps.renderItemVisibility as (
        node: React.ReactNode,
        meta: { visible: boolean; index: number }
      ) => React.ReactNode;
      expect(riv(<span>test</span>, { visible: false, index: 0 })).toBeNull();
      expect(riv(<span>test</span>, { visible: false, index: 1 })).toBeNull();
    });

    it('renderItemVisibility returns node for visible items', () => {
      render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      const riv = lastProps.renderItemVisibility as (
        node: React.ReactNode,
        meta: { visible: boolean; index: number }
      ) => React.ReactNode;
      const result = riv(<span>test</span>, { visible: true, index: 0 });
      expect(result).not.toBeNull();
    });
  });

  describe('maxRows', () => {
    it('passes maxRows to the library primitive (default 1)', () => {
      render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      expect(lastProps.maxRows).toBe(1);
    });

    it('passes custom maxRows to the library primitive', () => {
      render(
        <OverflowBadgeList
          items={items}
          renderItem={renderItem}
          renderOverflow={renderOverflow}
          maxRows={3}
        />
      );

      expect(lastProps.maxRows).toBe(3);
    });
  });

  describe('SSR / hydration', () => {
    it('sets flexWrap to wrap when hydrated', () => {
      render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      const style = lastProps.style as React.CSSProperties;
      expect(style.flexWrap).toBe('wrap');
    });

    it('does not set maxHeight (overflow is handled by the library)', () => {
      render(
        <OverflowBadgeList
          items={items}
          renderItem={renderItem}
          renderOverflow={renderOverflow}
          maxRows={2}
        />
      );

      const style = lastProps.style as React.CSSProperties;
      expect(style.maxHeight).toBeUndefined();
    });
  });

  describe('className', () => {
    it('applies custom className to the library primitive', () => {
      render(
        <OverflowBadgeList
          items={items}
          renderItem={renderItem}
          renderOverflow={renderOverflow}
          className="custom-class"
        />
      );

      const primitive = screen.getByTestId('overflow-list-primitive');
      expect(primitive.className).toContain('custom-class');
    });

    it('includes base classes on the library primitive', () => {
      render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      const primitive = screen.getByTestId('overflow-list-primitive');
      expect(primitive.className).toContain('w-full');
      expect(primitive.className).toContain('min-w-0');
      expect(primitive.className).toContain('items-start');
      expect(primitive.className).toContain('gap-1');
      expect(primitive.className).toContain('overflow-hidden');
    });
  });

  describe('maxItems', () => {
    it('passes maxVisibleItems to the library when maxItems is finite', () => {
      render(
        <OverflowBadgeList
          items={items}
          renderItem={renderItem}
          renderOverflow={renderOverflow}
          maxItems={2}
        />
      );

      expect(lastProps.maxVisibleItems).toBe(2);
    });

    it('does not pass maxVisibleItems when maxItems is Infinity (default)', () => {
      render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      expect(lastProps.maxVisibleItems).toBeUndefined();
    });
  });

  describe('minItems', () => {
    it('renderOverflow force-shows items below minItems threshold', () => {
      const renderItemSpy = vi.fn(renderItem);

      render(
        <OverflowBadgeList
          items={items}
          renderItem={renderItemSpy}
          renderOverflow={renderOverflow}
          minItems={2}
        />
      );

      const ro = lastProps.renderOverflow as (hiddenItems: string[]) => React.ReactNode;
      // Simulate library reporting 0 visible items (all hidden)
      const { container } = render(<div>{ro(items)}</div>);

      // Force-shown items (index 0 and 1) should be rendered inside overflow area
      expect(container.querySelector('[data-testid="item-Alpha"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="item-Beta"]')).toBeInTheDocument();
      // Overflow indicator for remaining 3 items
      expect(container.querySelector('[data-testid="overflow-indicator"]')).toBeInTheDocument();
    });

    it('force-shown items are rendered inside a flex-nowrap container', () => {
      render(
        <OverflowBadgeList
          items={items}
          renderItem={renderItem}
          renderOverflow={renderOverflow}
          minItems={1}
        />
      );

      const ro = lastProps.renderOverflow as (hiddenItems: string[]) => React.ReactNode;
      // Simulate library reporting 0 visible items
      const { container } = render(<div>{ro(items)}</div>);

      // Force-shown items should be inside a min-w-0 inline-flex container
      const wrapper = container.querySelector('.inline-flex.min-w-0');
      expect(wrapper).toBeInTheDocument();
    });

    it('clamps minItems to maxItems when maxItems < minItems', () => {
      render(
        <OverflowBadgeList
          items={items}
          renderItem={renderItem}
          renderOverflow={renderOverflow}
          minItems={3}
          maxItems={1}
        />
      );

      const ro = lastProps.renderOverflow as (hiddenItems: string[]) => React.ReactNode;
      // Simulate library reporting 0 visible items
      const { container } = render(<div>{ro(items)}</div>);

      // effectiveMinItems = min(3, 1, 5) = 1, so only 1 force-shown
      expect(container.querySelector('[data-testid="item-Alpha"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="item-Beta"]')).not.toBeInTheDocument();
    });
  });

  describe('No wrapper div', () => {
    it('renders library primitive as the top-level element (no wrapper div)', () => {
      const { container } = render(
        <OverflowBadgeList items={items} renderItem={renderItem} renderOverflow={renderOverflow} />
      );

      // The first child should be the library primitive directly
      expect(container.firstElementChild).toBe(screen.getByTestId('overflow-list-primitive'));
    });
  });
});
