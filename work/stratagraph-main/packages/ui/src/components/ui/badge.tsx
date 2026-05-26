import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@/lib/utils';
import { X } from 'lucide-react';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  adornment?: React.ReactNode;
  asChild?: boolean;
  dotClassName?: string;
  disabled?: boolean;
  onClose?: React.MouseEventHandler<HTMLButtonElement>;
}

export interface BadgeButtonProps
  extends React.ButtonHTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeButtonVariants> {
  asChild?: boolean;
}

export type BadgeDotProps = React.HTMLAttributes<HTMLSpanElement>;

const badgeVariants = cva(
  'focus:outline-hidden focus:ring-ring inline-flex items-center justify-center whitespace-nowrap border border-transparent font-medium focus:ring-2 focus:ring-offset-2 [&_svg]:-ms-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success:
          'bg-[var(--success-accent,var(--color-green-500))] text-[var(--success-foreground,var(--color-white))]',
        warning:
          'bg-[var(--warning-accent,var(--color-yellow-500))] text-[var(--warning-foreground,var(--color-white))]',
        info: 'bg-[var(--info-accent,var(--color-violet-500))] text-[var(--info-foreground,var(--color-white))]',
        outline: 'border-border text-secondary-foreground border bg-transparent',
        destructive: 'bg-destructive text-white',
      },

      appearance: {
        default: '',
        light: '',
        outline: '',
        ghost: 'border-transparent bg-transparent',
      },
      disabled: {
        true: 'pointer-events-none opacity-50',
      },
      size: {
        lg: 'h-7 min-w-7 gap-1.5 rounded-md px-[0.5rem] text-xs [&_svg]:size-3.5',
        md: 'h-6 min-w-6 gap-1.5 rounded-md px-[0.45rem] text-xs [&_svg]:size-3.5',
        sm: 'h-5 min-w-5 gap-1 rounded-sm px-[0.325rem] text-[0.6875rem] leading-[0.75rem] [&_svg]:size-3',
        xs: 'h-4 min-w-4 gap-1 rounded-sm px-[0.25rem] text-[0.625rem] leading-[0.5rem] [&_svg]:size-3',
      },
      shape: {
        default: '',
        circle: 'rounded-full',
      },
    },
    compoundVariants: [
      /* Light */
      {
        variant: 'primary',
        appearance: 'light',
        className:
          'bg-[var(--primary-soft,var(--color-blue-50))] text-[var(--primary-accent,var(--color-blue-700))] dark:bg-[var(--primary-soft)] dark:text-[var(--primary)]',
      },
      {
        variant: 'secondary',
        appearance: 'light',
        className: 'bg-secondary dark:bg-secondary/50 text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'light',
        className:
          'bg-[var(--success-soft,var(--color-green-100))] text-[var(--success-accent,var(--color-green-800))] dark:bg-[var(--success-soft)] dark:text-[var(--success)]',
      },
      {
        variant: 'warning',
        appearance: 'light',
        className:
          'bg-[var(--warning-soft,var(--color-yellow-100))] text-[var(--warning-accent,var(--color-yellow-700))] dark:bg-[var(--warning-soft)] dark:text-[var(--warning)]',
      },
      {
        variant: 'info',
        appearance: 'light',
        className:
          'bg-[var(--info-soft,var(--color-violet-100))] text-[var(--info-accent,var(--color-violet-700))] dark:bg-[var(--info-soft)] dark:text-[var(--info)]',
      },
      {
        variant: 'destructive',
        appearance: 'light',
        className:
          'bg-(--color-destructive-soft) text-(--color-destructive-accent) dark:bg-(--color-destructive-soft) dark:text-(--color-destructive)',
      },
      /* Outline */
      {
        variant: 'primary',
        appearance: 'outline',
        className:
          'border-[var(--primary-soft,var(--color-blue-100))] bg-[var(--primary-soft,var(--color-blue-50))] text-[var(--primary-accent,var(--color-blue-700))] dark:border-[var(--primary-accent)] dark:bg-[var(--primary-soft)] dark:text-[var(--primary)]',
      },
      {
        variant: 'success',
        appearance: 'outline',
        className:
          'border-[var(--success-soft,var(--color-green-200))] bg-[var(--success-soft,var(--color-green-50))] text-[var(--success-accent,var(--color-green-700))] dark:border-[var(--success-accent)] dark:bg-[var(--success-soft)] dark:text-[var(--success)]',
      },
      {
        variant: 'warning',
        appearance: 'outline',
        className:
          'border-[var(--warning-soft,var(--color-yellow-200))] bg-[var(--warning-soft,var(--color-yellow-50))] text-[var(--warning-accent,var(--color-yellow-700))] dark:border-[var(--warning-accent)] dark:bg-[var(--warning-soft)] dark:text-[var(--warning)]',
      },
      {
        variant: 'info',
        appearance: 'outline',
        className:
          'border-[var(--info-soft,var(--color-violet-100))] bg-[var(--info-soft,var(--color-violet-50))] text-[var(--info-accent,var(--color-violet-700))] dark:border-[var(--info-accent)] dark:bg-[var(--info-soft)] dark:text-[var(--info)]',
      },
      {
        variant: 'destructive',
        appearance: 'outline',
        className:
          'border-(--color-destructive-soft) bg-(--color-destructive-soft) text-(--color-destructive-accent) dark:border-(--color-destructive-accent) dark:bg-(--color-destructive-soft) dark:text-(--color-destructive)',
      },
      /* Ghost */
      {
        variant: 'primary',
        appearance: 'ghost',
        className: 'text-primary',
      },
      {
        variant: 'secondary',
        appearance: 'ghost',
        className: 'text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'ghost',
        className: 'text-[var(--success-accent,var(--color-green-500))]',
      },
      {
        variant: 'warning',
        appearance: 'ghost',
        className: 'text-[var(--warning-accent,var(--color-yellow-500))]',
      },
      {
        variant: 'info',
        appearance: 'ghost',
        className: 'text-[var(--info-accent,var(--color-violet-500))]',
      },
      {
        variant: 'destructive',
        appearance: 'ghost',
        className: 'text-destructive',
      },

      { size: 'lg', appearance: 'ghost', className: 'px-0' },
      { size: 'md', appearance: 'ghost', className: 'px-0' },
      { size: 'sm', appearance: 'ghost', className: 'px-0' },
      { size: 'xs', appearance: 'ghost', className: 'px-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'default',
      size: 'md',
    },
  }
);

const badgeButtonVariants = cva(
  '[&>svg]:opacity-100! [&>svg]:size-3.5! -me-0.5 inline-flex size-3.5 cursor-pointer items-center justify-center rounded-md p-0 leading-none opacity-60 transition-all hover:opacity-100',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
//React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }
function Badge({
  adornment,
  children,
  className,
  variant,
  size,
  appearance,
  shape,
  asChild = false,
  disabled,
  onClose,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, appearance, shape, disabled }), className)}
      {...props}
    >
      {adornment}
      {children}
      {onClose && <CloseButton onClose={onClose} />}
    </Comp>
  );
}

function CloseButton({ onClose }: { onClose: React.MouseEventHandler<HTMLButtonElement> }) {
  return (
    <BadgeButton key="close-button" variant="default" onClick={onClose} aria-label="Close badge">
      <X className="size-3" />
    </BadgeButton>
  );
}

function BadgeButton({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof badgeButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp
      data-slot="badge-button"
      className={cn(badgeButtonVariants({ variant, className }))}
      role="button"
      {...props}
    />
  );
}

function BadgeDot({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="badge-dot"
      className={cn('size-1.5 rounded-full bg-[currentColor] opacity-75', className)}
      {...props}
    />
  );
}

export { Badge, BadgeButton, BadgeDot, badgeVariants };
