import type { ComponentRenderFn } from '@base-ui/react';
import type { PropsWithChildren, FC, ComponentProps, ReactElement } from 'react';
import { isValidElement } from 'react';

interface RendererBaseProps extends PropsWithChildren {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: ComponentRenderFn<any, any> | React.ReactElement;
}
export type RenderAsChildProps<T extends RendererBaseProps> = T & { asChild?: true };

/**
 * Higher-order component to add "asChild" support to a trigger component.
 * When "asChild" is true, the children are used as the trigger `render` prop.
 *
 * @example
 * const TooltipTrigger = renderAsChild(TooltipPrimitive.Trigger, { delay: 0 });
 */
export function renderAsChild<T extends RendererBaseProps>(
  Renderer: FC<T>,
  defaultProps?: Omit<ComponentProps<typeof Renderer>, 'children' | 'render'> & {
    // Allows any data- attribute
    [key: `data-${string}`]: string | number | boolean | undefined;
  }
): (props: RenderAsChildProps<T>) => ReactElement {
  return function ({ asChild, children, render, ...props }: RenderAsChildProps<T>): ReactElement {
    // When asChild is true, use render prop to pass trigger props to child
    if (asChild && isValidElement(children)) {
      if (render) {
        console.warn(
          `${Renderer.displayName ?? 'renderAsChild(Component)'}: Both "asChild" and "render" props are provided. "render" will be ignored in favor of "asChild".`
        );
      }
      render = children;
      children = undefined;
    }
    return <Renderer children={children} render={render} {...defaultProps} {...(props as T)} />;
  };
}
