'use client';

import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem as BreadcrumbItemPrimitive,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface AppBreadcrumbItem {
  label: string;
  href?: string;
}

export interface AppLayoutProps {
  children: React.ReactNode;
  /**
   * Complete sidebar element. When provided, brand/navigation/user/variant/collapsible are ignored.
   * Use this when you have a pre-composed sidebar component.
   */
  sidebar?: React.ReactNode;
  /** Brand element displayed at the top of the sidebar */
  brand?: React.ReactNode;
  /** Navigation element displayed in the main sidebar content area */
  navigation?: React.ReactNode;
  /** User element displayed at the bottom of the sidebar */
  user?: React.ReactNode;
  /** Additional header content (right side of the header bar) */
  headerActions?: React.ReactNode;
  /** Breadcrumb items to display in the header (mutually exclusive with breadcrumbSlot) */
  breadcrumbs?: AppBreadcrumbItem[];
  /**
   * Custom breadcrumb element. When provided, breadcrumbs array is ignored.
   * Use this for framework-specific breadcrumb components (e.g., TanStack Router integration).
   */
  breadcrumbSlot?: React.ReactNode;
  /** Default open state for sidebar */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Sidebar variant (ignored when sidebar prop is provided) */
  variant?: 'sidebar' | 'floating' | 'inset';
  /** Collapsible mode (ignored when sidebar prop is provided) */
  collapsible?: 'offcanvas' | 'icon' | 'none';
}

export function AppLayout({
  children,
  sidebar,
  brand,
  navigation,
  user,
  headerActions,
  breadcrumbs,
  breadcrumbSlot,
  defaultOpen = true,
  open,
  onOpenChange,
  variant = 'sidebar',
  collapsible = 'icon',
}: AppLayoutProps) {
  // Render default sidebar from slots, or use custom sidebar if provided
  const sidebarElement = sidebar ?? (
    <Sidebar variant={variant} collapsible={collapsible}>
      {brand && <SidebarHeader>{brand}</SidebarHeader>}
      <SidebarContent>{navigation}</SidebarContent>
      {user && <SidebarFooter>{user}</SidebarFooter>}
      <SidebarRail />
    </Sidebar>
  );

  // Render breadcrumbs from slot or array
  const breadcrumbElement =
    breadcrumbSlot ??
    (breadcrumbs && breadcrumbs.length > 0 ? (
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItemPrimitive>
                {item.href ? (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItemPrimitive>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    ) : null);

  return (
    <SidebarProvider defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange}>
      {sidebarElement}
      {/*
       * min-w-0 is load-bearing: SidebarInset ships with `w-full flex-1`, which
       * (without a zero min-width) refuses to shrink below its content and
       * settles at the FULL viewport width while still being offset by the
       * sidebar gap — pushing its right edge past the viewport and giving the
       * whole page a phantom horizontal scroll equal to the sidebar width. That
       * page-level overflow is what made the header "widen" and forced a
       * double-scroll before wide tables' own overflow-x-auto engaged. min-w-0
       * lets flex-1 size the inset to (viewport − sidebar) so only the table
       * scrolls horizontally.
       */}
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          {breadcrumbElement || headerActions ? (
            <Separator orientation="vertical" className="mr-2 h-4 !self-center" />
          ) : null}
          {breadcrumbElement}
          {headerActions && (
            <div className="ml-auto flex flex-grow items-center justify-end gap-2">
              {headerActions}
            </div>
          )}
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
