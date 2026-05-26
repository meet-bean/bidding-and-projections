/**
 * Form components for building accessible forms with TanStack Form.
 *
 * @see Issue #72: P10-003: Create atomic UI component library
 * @see Issue #186: P14 UI fixes and components review
 *
 * These are presentation-only components that work with TanStack Form's
 * form.Field pattern. They provide consistent styling and ARIA attributes.
 *
 * Usage with TanStack Form:
 * ```tsx
 * import { FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@repo/ui";
 * import { useForm } from "@tanstack/react-form";
 *
 * const form = useForm({ defaultValues: { email: "" } });
 *
 * <form onSubmit={...}>
 *   <form.Field
 *     name="email"
 *     children={(field) => (
 *       <FormItem>
 *         <FormLabel error={field.state.meta.errors.length > 0}>Email</FormLabel>
 *         <FormControl error={field.state.meta.errors.length > 0}>
 *           <Input
 *             value={field.state.value}
 *             onChange={(e) => field.handleChange(e.target.value)}
 *           />
 *         </FormControl>
 *         <FormDescription>Your email address</FormDescription>
 *         <FormMessage>{field.state.meta.errors[0]}</FormMessage>
 *       </FormItem>
 *     )}
 *   />
 * </form>
 * ```
 */

import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

/**
 * Context for sharing FormItem ID with child components.
 */
interface FormItemContextValue {
  id: string;
}

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

/**
 * Hook to access form item IDs for ARIA attributes.
 * Returns consistent IDs for label, description, and message elements.
 */
function useFormField() {
  const context = React.useContext(FormItemContext);

  if (!context) {
    // Return default values when used outside FormItem
    return {
      id: '',
      formItemId: '',
      formDescriptionId: '',
      formMessageId: '',
    };
  }

  return {
    id: context.id,
    formItemId: `${context.id}-form-item`,
    formDescriptionId: `${context.id}-form-item-description`,
    formMessageId: `${context.id}-form-item-message`,
  };
}

/**
 * Container for a form field with proper spacing.
 * Provides context for ARIA ID generation.
 */
const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} data-slot="form-item" className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = 'FormItem';

/**
 * Label for a form field with error state styling.
 * When error is true, applies destructive styling.
 */
const FormLabel = React.forwardRef<
  React.ComponentRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label> & { error?: boolean }
>(({ className, error, ...props }, ref) => {
  const { formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      data-slot="form-label"
      className={cn(error && 'text-destructive', className)}
      htmlFor={formItemId || undefined}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

/**
 * Wrapper for form input elements with proper ARIA attributes.
 * When error is true, sets aria-invalid on the child element.
 * Merges props to the single child element (replaces Radix Slot).
 */
interface FormControlProps {
  error?: boolean;
  children: React.ReactElement<Record<string, unknown>>;
}

const FormControl = React.forwardRef<HTMLElement, FormControlProps>(({ error, children }, ref) => {
  const { formItemId, formDescriptionId, formMessageId } = useFormField();

  const controlProps: Record<string, unknown> = {
    ref,
    'data-slot': 'form-control',
    id: formItemId || undefined,
    'aria-describedby':
      formDescriptionId && formMessageId
        ? error
          ? `${formDescriptionId} ${formMessageId}`
          : formDescriptionId
        : undefined,
    'aria-invalid': error || undefined,
  };

  const child = React.Children.only(children);
  const mergedProps = mergeProps(controlProps, child.props);

  return React.cloneElement(child, mergedProps);
});
FormControl.displayName = 'FormControl';

/**
 * Description text for a form field.
 * Provides additional context or help text.
 */
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      data-slot="form-description"
      id={formDescriptionId || undefined}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

/**
 * Error message display for a form field.
 * Renders nothing when there's no message to display.
 */
const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { formMessageId } = useFormField();

  if (!children) {
    return null;
  }

  return (
    <p
      ref={ref}
      data-slot="form-message"
      id={formMessageId || undefined}
      className={cn('text-destructive text-sm font-medium', className)}
      {...props}
    >
      {children}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

/**
 * Passthrough components for gradual migration.
 * These are no-ops that allow existing code to continue working.
 */
const Form = React.Fragment;
const FormField = React.Fragment;

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
