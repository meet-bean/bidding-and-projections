import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';

export { toast } from 'sonner';
export { type ToasterProps };

/**
 * Toast classNames configuration.
 * Extracted for testability and reuse.
 *
 * Theme support:
 * - Uses CSS variables that automatically adapt to dark/light mode
 * - bg-background/text-foreground are theme-aware (defined in globals.css)
 *
 * Sentiment styling (solid backgrounds for visibility):
 * - success: green background with contrasting text
 * - error: red/destructive background with contrasting text
 * - warning: yellow/amber background with dark text for contrast
 * - info: blue background with contrasting text
 *
 * Loading state:
 * - Uses muted styling while promise is pending
 * - Sonner automatically shows spinner for promise toasts
 */
export function getToastClassNames() {
  return {
    // Base toast styling - theme-aware
    toast: 'cn-toast',

    // Text styling
    title: 'text-foreground font-medium',
    description: 'text-muted-foreground',

    // Button styling
    actionButton:
      'bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    cancelButton:
      'bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',

    // Sentiment toasts - solid backgrounds for visibility
    success: 'border-success bg-success text-success-foreground',
    error: 'border-destructive bg-destructive text-destructive-foreground',
    warning: 'border-warning bg-warning text-warning-foreground',
    info: 'border-info bg-info text-info-foreground',

    // Loading state for promise toasts
    loading: 'border-muted bg-muted text-muted-foreground',
  };
}

const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: getToastClassNames(),
      }}
      {...props}
    />
  );
};

export { Toaster };
