/**
 * Tabs component built on @base-ui/react/tabs.
 *
 * Provides accessible, keyboard-navigable tab panels using Base UI primitives.
 * API mirrors shadcn/ui Tabs for drop-in compatibility.
 *
 * Supports two visual variants:
 * - `default` (pill style with muted background)
 * - `line` (underline-style with bottom border indicator)
 */

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '@/lib/utils';

type TabsVariant = 'default' | 'line';

const TabsVariantContext = React.createContext<TabsVariant>('default');

/**
 * Root Tabs container. Controls which panel is visible.
 *
 * @example
 * <Tabs defaultValue="details">
 *   <TabsList>
 *     <TabsTrigger value="details">Details</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="details">...</TabsContent>
 * </Tabs>
 */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: TabsVariant;
};
/**
 * The list of tab triggers rendered as a horizontal row.
 *
 * @param variant - Visual style: "default" (pill) or "line" (underline). Default: "default".
 */
function TabsList({
  className,
  variant = 'default',
  ...props
}: TabsListProps) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        className={cn(
          'text-muted-foreground inline-flex h-9 w-full items-center justify-start',
          variant === 'default' && 'bg-muted rounded-lg p-1',
          variant === 'line' && 'border-b bg-transparent p-0',
          className
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  );
}

/**
 * A single tab trigger button.
 *
 * Reads the variant from the parent TabsList via context.
 */
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  const variant = React.useContext(TabsVariantContext);

  return (
    <TabsPrimitive.Tab
      className={cn(
        'ring-offset-background focus-visible:ring-ring inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' &&
          'data-[active]:bg-background data-[active]:text-foreground rounded-md data-[active]:shadow',
        variant === 'line' &&
          'data-[active]:border-primary data-[active]:text-foreground rounded-none border-b-2 border-transparent shadow-none data-[active]:bg-transparent',
        className
      )}
      {...props}
    />
  );
}

/**
 * The content panel shown when the associated tab is selected.
 */
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      className={cn(
        'ring-offset-background focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, type TabsListProps, TabsTrigger, TabsContent };
