/**
 * OverflowText - A text component that handles text overflow with ellipsis.
 *
 * Fills available space in flex/grid containers without pushing siblings,
 * then truncates with ellipsis when content exceeds available width.
 * Shows a tooltip with the full text when the content is overflowing.
 *
 * @example
 * ```tsx
 * <OverflowText>Some long text that might overflow</OverflowText>
 * <OverflowText maxWidth="200px">Constrained width text</OverflowText>
 * <OverflowText display="inline">Inline text with overflow</OverflowText>
 * ```
 */

import {
  type HTMLAttributes,
  type CSSProperties,
  forwardRef,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent } from '@/components/ui/tooltip';
import { useHydrated } from '@/hooks/use-hydrated';

export interface OverflowTextProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Maximum width before truncation occurs.
   * Can be any valid CSS width value (e.g., "200px", "50%", "20rem").
   * If not specified, text will truncate based on parent container width.
   */
  maxWidth?: string;
  /**
   * Display mode for the text.
   * - "block": Fills available space in flex/grid, truncates on overflow (default)
   * - "inline": Only takes necessary width, no line break
   */
  display?: 'block' | 'inline';
}

/**
 * Overflow text component that truncates text with ellipsis.
 *
 * In block mode (default), the element is flex-friendly:
 * - `min-w-0` allows shrinking below content width in flex/grid parents
 * - `overflow: hidden` (from truncate) establishes block formatting context
 * - Naturally fills available space without pushing siblings
 *
 * Shows a styled tooltip with full text content when the text is truncated.
 *
 * In inline mode, uses inline-block with explicit overflow styles for
 * proper vertical alignment within paragraph context.
 */
export const OverflowText = forwardRef<HTMLSpanElement, OverflowTextProps>(
  ({ children, className, maxWidth, display = 'block', style, title, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLSpanElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const isHydrated = useHydrated();

    const checkOverflow = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    }, []);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      checkOverflow();
      const observer = new ResizeObserver(checkOverflow);
      observer.observe(el);
      return () => observer.disconnect();
    }, [checkOverflow]);

    // Merge forwarded ref with internal ref
    const setRefs = useCallback(
      (node: HTMLSpanElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    // For inline display, apply explicit styles for proper alignment and truncation
    const inlineStyles: CSSProperties =
      display === 'inline'
        ? {
            verticalAlign: 'middle',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }
        : {};

    // Merge styles: inline-specific styles + maxWidth + user-provided styles
    const mergedStyle: CSSProperties = {
      ...inlineStyles,
      ...(maxWidth ? { maxWidth } : {}),
      ...(style || {}),
    };

    const classes = cn(
      'truncate',
      display === 'inline'
        ? 'inline-block'
        : // Block mode: min-w-0 allows shrinking in flex/grid parents,
          // flex-1 fills available space without pushing siblings
          'block min-w-0 flex-1',
      className
    );

    // Extract string content for tooltip
    const titleText = title ?? (typeof children === 'string' ? children : undefined);

    const spanElement = (
      <span
        ref={setRefs}
        className={classes}
        style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
        {...props}
      >
        {children}
      </span>
    );

    // Show styled tooltip only when overflowing and we have text content
    if (isOverflowing && titleText && isHydrated) {
      return (
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipPrimitive.Trigger render={spanElement} />
            <TooltipContent>{titleText}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return spanElement;
  }
);
