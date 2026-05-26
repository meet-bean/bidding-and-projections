'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';
import { Separator } from './separator';

// ============================================================================
// Toolbar Root
// ============================================================================

const toolbarVariants = cva('relative flex select-none items-center', {
  defaultVariants: {
    variant: 'default',
  },
  variants: {
    variant: {
      default: 'bg-background gap-1',
      media:
        'z-2 absolute h-[26px] max-w-[calc(100%-16px)] overflow-hidden rounded-sm bg-black/60 transition-opacity',
    },
  },
});

interface ToolbarProps extends React.ComponentProps<'div'>, VariantProps<typeof toolbarVariants> {
  /**
   * The orientation of the toolbar.
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';
}

function Toolbar({ className, variant, orientation = 'horizontal', ...props }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-orientation={orientation}
      data-slot="toolbar"
      className={cn(toolbarVariants({ variant }), className)}
      {...props}
    />
  );
}

// ============================================================================
// Toolbar Toggle Group
// ============================================================================

interface ToolbarToggleGroupContextValue {
  type: 'single' | 'multiple';
  value: string | string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const ToolbarToggleGroupContext = React.createContext<ToolbarToggleGroupContextValue | null>(null);

function useToolbarToggleGroup() {
  return React.useContext(ToolbarToggleGroupContext);
}

interface ToolbarToggleGroupProps extends React.ComponentProps<'div'> {
  type: 'single' | 'multiple';
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
}

function ToolbarToggleGroup({
  className,
  type,
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled,
  children,
  ...props
}: ToolbarToggleGroupProps) {
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    () => defaultValue ?? (type === 'single' ? '' : [])
  );

  const value = valueProp ?? internalValue;

  const handleValueChange = React.useCallback(
    (itemValue: string) => {
      let newValue: string | string[];

      if (type === 'single') {
        newValue = value === itemValue ? '' : itemValue;
      } else {
        const currentValue = Array.isArray(value) ? value : [];
        newValue = currentValue.includes(itemValue)
          ? currentValue.filter((v) => v !== itemValue)
          : [...currentValue, itemValue];
      }

      if (valueProp === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [type, value, valueProp, onValueChange]
  );

  const contextValue = React.useMemo(
    () => ({
      type,
      value,
      onValueChange: handleValueChange,
      disabled,
    }),
    [type, value, handleValueChange, disabled]
  );

  return (
    <ToolbarToggleGroupContext.Provider value={contextValue}>
      <div
        role="group"
        data-slot="toolbar-toggle-group"
        className={cn('flex items-center', className)}
        {...props}
      >
        {children}
      </div>
    </ToolbarToggleGroupContext.Provider>
  );
}

// ============================================================================
// Toolbar Button Variants
// ============================================================================

const toolbarButtonVariants = cva(
  'text-foreground/80 ring-offset-background transition-bg-ease focus-visible:outline-hidden focus-visible:ring-ring inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([data-icon])]:size-4',
  {
    defaultVariants: {
      size: 'sm',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-10 px-3',
        lg: 'h-11 px-5',
        none: '',
        sm: 'h-[28px] px-1.5',
      },
      variant: {
        default:
          'aria-checked:bg-accent aria-checked:text-accent-foreground hover:bg-muted bg-transparent',
        media:
          'no-focus-ring not-last:border-r not-last:border-r-white/20 m-0 h-auto rounded-none bg-black/20 px-1.5 py-1 text-white hover:bg-white/5 focus:bg-white/5 [&_svg]:size-[14px] [&_svg]:text-white',
        outline: 'border-input hover:bg-accent hover:text-accent-foreground border bg-transparent',
      },
    },
  }
);

// ============================================================================
// Toolbar Toggle Item
// ============================================================================

interface ToolbarToggleItemProps
  extends
    Omit<React.ComponentProps<'button'>, 'value'>,
    VariantProps<typeof toolbarButtonVariants> {
  value: string;
}

function ToolbarToggleItem({
  className,
  size,
  variant,
  value,
  disabled: disabledProp,
  onClick,
  ...props
}: ToolbarToggleItemProps) {
  const context = useToolbarToggleGroup();

  const isPressed = context
    ? context.type === 'single'
      ? context.value === value
      : Array.isArray(context.value) && context.value.includes(value)
    : false;

  const disabled = disabledProp ?? context?.disabled;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    context?.onValueChange(value);
    onClick?.(e);
  };

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isPressed}
      data-state={isPressed ? 'on' : 'off'}
      data-slot="toolbar-toggle-item"
      disabled={disabled}
      className={cn(toolbarButtonVariants({ size, variant }), className)}
      onClick={handleClick}
      {...props}
    />
  );
}

// ============================================================================
// Toolbar Button
// ============================================================================

interface ToolbarButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof toolbarButtonVariants> {
  /** When true, renders as a toggle button with pressed state */
  pressed?: boolean;
  /** When true, adds dropdown indicator styling */
  isDropdown?: boolean;
}

function ToolbarButton({
  className,
  size,
  variant,
  pressed,
  isDropdown,
  disabled,
  children,
  // Exclude button's native value attribute to avoid type conflicts
  value: _value,
  ...props
}: ToolbarButtonProps) {
  // If pressed is defined, render as a toggle item within an implicit group
  if (typeof pressed === 'boolean') {
    return (
      <ToolbarToggleGroup disabled={disabled} type="single" value={pressed ? 'single' : ''}>
        <ToolbarToggleItem
          className={cn(
            toolbarButtonVariants({ size, variant }),
            isDropdown && 'justify-between gap-0.5 pr-1',
            className
          )}
          value="single"
          {...props}
        >
          {children}
        </ToolbarToggleItem>
      </ToolbarToggleGroup>
    );
  }

  return (
    <button
      type="button"
      data-slot="toolbar-button"
      disabled={disabled}
      className={cn(toolbarButtonVariants({ size, variant }), isDropdown && 'pr-1', className)}
      {...props}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Toolbar Separator
// ============================================================================

function ToolbarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      orientation="vertical"
      data-slot="toolbar-separator"
      className={cn('mx-2 my-1 h-auto self-stretch', className)}
      {...props}
    />
  );
}

// ============================================================================
// Toolbar Link
// ============================================================================

function ToolbarLink({ className, ...props }: React.ComponentProps<'a'>) {
  return (
    <a
      data-slot="toolbar-link"
      className={cn('font-medium underline underline-offset-4', className)}
      {...props}
    />
  );
}

// ============================================================================
// Toolbar Group (visual grouping with separator)
// ============================================================================

function ToolbarGroup({ children, className }: React.ComponentProps<'div'>) {
  const childArr = React.Children.map(children, (c) => c);

  if (!childArr || childArr.length === 0) return null;

  return (
    <div
      data-slot="toolbar-group"
      className={cn('group/toolbar-group relative flex shrink-0', className)}
    >
      <div className="flex items-center gap-0.5">{children}</div>

      <div className="group-last/toolbar-group:hidden! mx-1.5 hidden py-0.5 group-has-[button]/toolbar-group:block">
        <Separator orientation="vertical" />
      </div>
    </div>
  );
}

export {
  Toolbar,
  ToolbarToggleGroup,
  ToolbarToggleItem,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarLink,
  ToolbarGroup,
  toolbarVariants,
  toolbarButtonVariants,
};

export type { ToolbarProps, ToolbarToggleGroupProps, ToolbarToggleItemProps, ToolbarButtonProps };
