import * as React from 'react';

/**
 * Slot component for polymorphic composition.
 *
 * When used with asChild pattern, merges its props with its single child element.
 * This enables composition patterns like:
 *
 * ```tsx
 * <Button asChild>
 *   <Link href="/foo">Click me</Link>
 * </Button>
 * ```
 *
 * The Button's styles and props are merged onto the Link element.
 */
export type SlotProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function mergeProps(
  slotProps: Record<string, unknown>,
  childProps: Record<string, unknown>
): Record<string, unknown> {
  const overrideProps: Record<string, unknown> = { ...childProps };

  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];

    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      // Compose event handlers
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args: unknown[]) => {
          (childPropValue as (...args: unknown[]) => void)(...args);
          (slotPropValue as (...args: unknown[]) => void)(...args);
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === 'style') {
      // Merge styles
      overrideProps[propName] = { ...(slotPropValue as object), ...(childPropValue as object) };
    } else if (propName === 'className') {
      // Concatenate classNames
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(' ');
    }
  }

  return { ...slotProps, ...overrideProps };
}

export const Slot = React.forwardRef<HTMLElement, SlotProps>(({ children, ...slotProps }, ref) => {
  const childrenArray = React.Children.toArray(children as React.ReactNode);
  const slottable = childrenArray.find((child) => React.isValidElement(child));

  if (!slottable) {
    return null;
  }

  const child = slottable as React.ReactElement<Record<string, unknown>>;
  const childRef = (child as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref;

  const mergedProps = mergeProps(slotProps, child.props);

  // Only include ref in cloneElement when we have a ref to forward
  // This preserves the child's original ref when Slot has no ref
  const hasSlotRef = ref !== null && ref !== undefined;
  const hasChildRef = childRef !== null && childRef !== undefined;

  if (!hasSlotRef && !hasChildRef) {
    // Neither Slot nor child has a ref, omit ref entirely
    return React.cloneElement(child, mergedProps);
  }

  // Compose refs when needed
  const composedRef = (node: HTMLElement) => {
    // Forward to Slot's ref if it exists
    if (hasSlotRef) {
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }
    // Forward to child's ref if it exists
    if (hasChildRef) {
      if (typeof childRef === 'function') {
        childRef(node);
      } else {
        (childRef as React.MutableRefObject<HTMLElement>).current = node;
      }
    }
  };

  return React.cloneElement(child, {
    ...mergedProps,
    ref: composedRef,
  });
});

Slot.displayName = 'Slot';
