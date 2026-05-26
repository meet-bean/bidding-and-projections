/**
 * OverflowBadgeList - A generic component that renders a list of items with
 * overflow handling via react-responsive-overflow-list.
 *
 * Uses ResizeObserver internally to detect which items fit within the
 * container, then shows a "+X" indicator via `renderOverflow` for hidden items.
 *
 * @example
 * ```tsx
 * <OverflowBadgeList
 *   items={['Alpha', 'Beta', 'Gamma']}
 *   renderItem={(item) => <Badge>{item}</Badge>}
 *   renderOverflow={(items) => <Badge>+{items.length}</Badge>}
 * />
 * ```
 */

import { Fragment, type ReactNode, type CSSProperties, useRef, useState } from 'react';
import { OverflowList as OverflowListPrimitive } from 'react-responsive-overflow-list';
import { cn } from '@/lib/utils';
import { useHydrated } from '@/hooks/use-hydrated';
import { Skeleton } from '@/components/ui/skeleton';

type RenderItemContext = {
  visibleCount: number;
  total: number;
  hidden: boolean;
  overflowing: boolean;
};
type RenderItemFn<T> = (item: T, index: number, context: RenderItemContext) => ReactNode;

export interface OverflowBadgeListProps<T> {
  /** The items to render in the list. */
  items: T[];
  /** Render function for each item. */
  renderItem: RenderItemFn<T>;
  /** Render function for the overflow indicator, receiving the hidden items. */
  renderOverflow: (overflowItems: T[]) => ReactNode;
  /** Maximum number of visible rows. Default: 1 */
  maxRows?: number;
  /** Maximum number of visible items. Default: Infinity */
  maxItems?: number;
  /**
   * Minimum number of visible items. Default: 1
   * When set, the minItems will attempt to truncate instead of hide
   * by passing `overflowing=true` to the renderItem function for items.
   */
  minItems?: number;
  /** Gap between items in "gap-{n}" Tailwind format (e.g. 1, 2, 4). Default: 1 (0.25rem) */
  gap?: number;
  /** Custom skeleton renderer for pre-hydration loading state. */
  renderSkeleton?: () => ReactNode;
  /** Additional CSS classes. */
  className?: string;
}

/** Wraps an item with overflow truncation styling when the list is overflowing. */
export function wrapOverflowItem(node: ReactNode, options: Pick<RenderItemContext, 'overflowing'>): ReactNode {
  if (options.overflowing) {
    return <div className="min-w-0 overflow-hidden">{node}</div>;
  }
  return node;
}

export function OverflowBadgeList<T>({
  items,
  renderItem,
  renderOverflow,
  maxRows = 1,
  maxItems = Infinity,
  minItems = 1,
  renderSkeleton,
  gap = 1,
  className,
}: OverflowBadgeListProps<T>) {
  const containerRef = useRef<HTMLElement>(null);
  const overflowItemRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(items.length);

  const hydrated = useHydrated();

  if (items.length === 0) {
    return null;
  }

  if (!hydrated) {
    if (renderSkeleton) return renderSkeleton();
    const skeletonCount = Math.min(
      maxItems === Infinity ? items.length : maxItems,
      2,
    );
    const showOverflowSkeleton = items.length > skeletonCount;
    return (
      <div className={cn(
        'flex',
        gap === 1 && 'gap-1',
        gap === 2 && 'gap-2',
        gap === 3 && 'gap-3',
        gap === 4 && 'gap-4',
        DEFAULT_CLASSES,
        className
      )}>
        {Array.from({ length: skeletonCount }, (_, i) => {
          const width = 60 + Math.floor(Math.random() * 100);
          return <Skeleton key={i} className="h-5 rounded-sm" style={{ width: `${String(width)}px` }} />;
        })}
        {showOverflowSkeleton && <Skeleton className="h-5 w-8 rounded-sm" />}
      </div>
    );
  }

  // Guard: minItems can't exceed maxItems or items.length
  const effectiveMinItems = Math.min(
    minItems,
    maxItems === Infinity ? items.length : maxItems,
    items.length,
  );

  const style: CSSProperties = { flexWrap: 'wrap' };

  return (
    <OverflowListPrimitive
      ref={containerRef}
      items={items}
      maxVisibleItems={maxItems === Infinity ? undefined : maxItems}
      renderItem={(item, index) => {
        const effectiveVisible = Math.min(
          visibleCount,
          maxItems === Infinity ? visibleCount : maxItems,
        );
        const isForceShowing = visibleCount < effectiveMinItems;
        const hidden = index >= effectiveVisible;
        return renderItem(item, index, {
          visibleCount: effectiveVisible,
          total: items.length,
          hidden,
          overflowing: isForceShowing,
        });
      }}
      renderOverflow={(hiddenItems) => {
        const visible = items.length - hiddenItems.length;
        if (visible !== visibleCount) {
          queueMicrotask(() => setVisibleCount(visible));
        }

        // Items the library hid that minItems requires us to force-show
        const forceShowItems =
          visible < effectiveMinItems ? items.slice(visible, effectiveMinItems) : [];
        const adjustedOverflow =
          visible < effectiveMinItems ? items.slice(effectiveMinItems) : hiddenItems;

        const overflowContent =
          adjustedOverflow.length > 0 ? renderOverflow(adjustedOverflow) : null;

        if (forceShowItems.length === 0 && !overflowContent) {
          return <div className="hidden" />;
        }

        // When force-showing, wrap everything in a single flex-nowrap container
        // so the force-shown badge truncates instead of the overflow badge wrapping.
        if (forceShowItems.length > 0) {
          return (
            <div
              className={`inline-flex min-w-0 items-center gap-${String(gap)} self-center`}
              ref={overflowItemRef}
            >
              {forceShowItems.map((item, i) => {
                const index = visible + i;
                return (
                  <Fragment key={index}>
                    {renderItem(item, index, {
                      visibleCount: effectiveMinItems,
                      total: items.length,
                      hidden: false,
                      overflowing: true,
                    })}
                  </Fragment>
                );
              })}
              {overflowContent && (
                <span className="shrink-0">{overflowContent}</span>
              )}
            </div>
          );
        }

        return (
          <div className="inline self-center" ref={overflowItemRef}>
            {renderOverflow(adjustedOverflow)}
          </div>
        );
      }}
      // Bypass React.Activity for item visibility. React 19+ wraps hidden items
      // in <Activity mode="hidden"> which adds DOM wrapper elements that interfere
      // with flex-wrap row measurement. Returning null for hidden items avoids this.
      renderItemVisibility={(node, meta) => {
        if (meta.visible) return <Fragment key={meta.index}>{node}</Fragment>;
        return null;
      }}
      maxRows={maxRows}
      className={cn(`gap-${gap}`, DEFAULT_CLASSES, className)}
      style={style}
    />
  );
}

const DEFAULT_CLASSES = 'w-full min-w-0 items-start overflow-hidden';
