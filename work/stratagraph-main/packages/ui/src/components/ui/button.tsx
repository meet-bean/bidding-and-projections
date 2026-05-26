import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { Slot } from '@/lib/slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 aria-invalid:ring-2 group/button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-clip-padding text-sm font-medium outline-none transition-all focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground shadow-xs',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        destructive:
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive dark:text-destructive-foreground focus-visible:border-destructive/40 dark:hover:bg-destructive/80',
        success:
          'bg-success/20 hover:bg-success/30 focus-visible:ring-success/20 dark:focus-visible:ring-success/40 text-success dark:text-success-foreground focus-visible:border-success/40 dark:bg-success dark:hover:bg-success/80',
        warning:
          'bg-warning/10 hover:bg-warning/20 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40 dark:bg-warning/20 text-warning dark:text-warning-foreground focus-visible:border-warning/40 dark:bg-warning dark:hover:bg-warning/80',
        info: 'bg-info/10 hover:bg-info/20 focus-visible:ring-info/20 dark:focus-visible:ring-info/40 dark:bg-info text-info dark:text-info-foreground focus-visible:border-info/40 dark:hover:bg-info/80',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 h-9 gap-1.5 px-2.5',
        xs: "in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: 'in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5',
        lg: 'has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 h-10 gap-1.5 px-2.5',
        icon: 'size-9',
        'icon-xs':
          "in-data-[slot=button-group]:rounded-md size-6 rounded-[min(var(--radius-md),8px)] [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'in-data-[slot=button-group]:rounded-md size-8 rounded-[min(var(--radius-md),10px)]',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type ButtonProps = React.ComponentPropsWithoutRef<typeof ButtonPrimitive> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : ButtonPrimitive;
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
