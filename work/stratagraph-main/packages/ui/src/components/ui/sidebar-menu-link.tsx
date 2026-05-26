/**
 * SidebarMenuLink - A sidebar menu button that properly supports both
 * tooltips and custom link components for SPA navigation.
 *
 * The base SidebarMenuButton has a bug where tooltip overrides the render prop,
 * breaking custom Link components. This component fixes that by wrapping the
 * link in a Tooltip correctly.
 *
 * @example
 * ```tsx
 * import { Link } from "@tanstack/react-router";
 *
 * <SidebarMenuLink
 *   to="/dashboard"
 *   tooltip="Dashboard"
 *   isActive={pathname === "/dashboard"}
 *   linkComponent={Link}
 * >
 *   <HomeIcon />
 *   <span>Dashboard</span>
 * </SidebarMenuLink>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';

const sidebarMenuLinkVariants = cva(
  'ring-sidebar-ring hover:bg-muted/50 hover:text-sidebar-foreground active:bg-muted/70 active:text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! peer/menu-button outline-hidden group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:font-medium [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'hover:bg-muted/50 hover:text-sidebar-foreground',
        outline:
          'bg-background hover:bg-muted/50 hover:text-sidebar-foreground shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'group-data-[collapsible=icon]:p-0! h-12 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * Props for a generic link component.
 * Supports both internal routing (to) and external links (href).
 * Allows additional props via index signature for data attributes.
 */
interface LinkComponentProps {
  to?: string;
  href?: string;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export interface SidebarMenuLinkProps extends VariantProps<typeof sidebarMenuLinkVariants> {
  /** The route path for SPA navigation */
  to?: string;
  /** The URL for external navigation (uses <a> tag) */
  href?: string;
  /** Custom Link component for SPA routing (e.g., TanStack Router Link) */
  linkComponent?: React.ComponentType<LinkComponentProps>;
  /** Whether this item is currently active */
  isActive?: boolean;
  /** Tooltip text shown when sidebar is collapsed */
  tooltip?: string;
  /** Additional class names */
  className?: string;
  /** Button content (icon and label) */
  children: React.ReactNode;
}

export function SidebarMenuLink({
  to,
  href,
  linkComponent: LinkComponent,
  isActive = false,
  tooltip,
  variant = 'default',
  size = 'default',
  className,
  children,
}: SidebarMenuLinkProps) {
  const { isMobile, state } = useSidebar();

  const linkClassName = cn(sidebarMenuLinkVariants({ variant, size }), className);

  // Determine what element to render
  let linkElement: React.ReactNode;

  if (href) {
    // External link - use <a> tag
    linkElement = (
      <a
        href={href}
        className={linkClassName}
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
      >
        {children}
      </a>
    );
  } else if (LinkComponent && to) {
    // SPA navigation - use provided Link component
    linkElement = (
      <LinkComponent
        to={to}
        className={linkClassName}
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
      >
        {children}
      </LinkComponent>
    );
  } else if (to) {
    // Fallback to <a> tag if no LinkComponent provided
    linkElement = (
      <a
        href={to}
        className={linkClassName}
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
      >
        {children}
      </a>
    );
  } else {
    // No navigation - just render as a div (shouldn't happen normally)
    linkElement = (
      <div
        className={linkClassName}
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
      >
        {children}
      </div>
    );
  }

  // If no tooltip, just return the link
  if (!tooltip) {
    return linkElement;
  }

  // Wrap in Tooltip - only show when sidebar is collapsed and not on mobile
  const showTooltip = state === 'collapsed' && !isMobile;

  return (
    <Tooltip>
      <TooltipTrigger render={linkElement} delay={300} />
      <TooltipContent side="right" align="center" hidden={!showTooltip}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
