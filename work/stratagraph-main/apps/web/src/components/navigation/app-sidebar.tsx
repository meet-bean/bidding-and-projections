import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useStore } from '~/lib/store';
import { TENANTS, type TenantId } from '~/lib/tenant';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuLink,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@repo/ui';
import {
  Home,
  FileText,
  Users,
  Briefcase,
  Receipt,
  Truck,
  Building,
  Building2,
  ClipboardList,
  CalendarDays,
  Settings,
  MapPin,
  UserCog,
  BarChart3,
  Calculator,
  Wrench,
  ChevronRight,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'Home'
  | 'FileText'
  | 'Users'
  | 'Briefcase'
  | 'Receipt'
  | 'Truck'
  | 'Building'
  | 'Building2'
  | 'ClipboardList'
  | 'CalendarDays'
  | 'Settings'
  | 'MapPin'
  | 'UserCog'
  | 'BarChart3'
  | 'Calculator'
  | 'Wrench';

const iconMap: Record<IconName, LucideIcon> = {
  Home,
  FileText,
  Users,
  Briefcase,
  Receipt,
  Truck,
  Building,
  Building2,
  ClipboardList,
  CalendarDays,
  Settings,
  MapPin,
  UserCog,
  BarChart3,
  Calculator,
  Wrench,
};

export interface NavSubItem {
  id: string;
  label: string;
  href: string;
  icon?: IconName;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  children?: NavSubItem[];
  /** When children exist, start collapsible open by default (e.g. Admin group). */
  defaultOpen?: boolean;
}

interface AppSidebarProps {
  navItems: NavItem[];
  currentPath: string;
  tenantName?: string;
  tenantShortName?: string;
}

function isCurrentPage(href: string, currentPath: string): boolean {
  if (href === '/') return currentPath === '/';
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavItemWithChildren({
  item,
  currentPath,
}: {
  item: NavItem & { children: NavSubItem[] };
  currentPath: string;
}) {
  const Icon = iconMap[item.icon] ?? HelpCircle;
  const hasActiveChild = item.children.some((c) => isCurrentPage(c.href, currentPath));
  const isActive = isCurrentPage(item.href, currentPath) || hasActiveChild;
  const [open, setOpen] = useState(item.defaultOpen ?? isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.label} isActive={isActive} />}>
          <Icon />
          <span>{item.label}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => {
              const ChildIcon = child.icon ? (iconMap[child.icon] ?? null) : null;
              return (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton
                    render={<Link to={child.href} />}
                    isActive={currentPath === child.href}
                  >
                    {ChildIcon && <ChildIcon />}
                    <span>{child.label}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({ navItems, currentPath, tenantName = 'Stratagraph', tenantShortName = 'SG' }: AppSidebarProps) {
  const tenantId = useStore((s) => s.tenantId);
  const setTenant = useStore((s) => s.setTenant);
  const navigate = useNavigate();

  const handleTenantChange = (id: TenantId) => {
    setTenant(id);
    navigate({ to: '/home' });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:pl-0! pointer-events-none hover:bg-transparent"
            >
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-sm font-bold tracking-tight">
                {tenantShortName}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{tenantName}</span>
                <span className="text-muted-foreground truncate text-xs">Operations</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.children && item.children.length > 0) {
                  return (
                    <NavItemWithChildren
                      key={item.id}
                      item={item as NavItem & { children: NavSubItem[] }}
                      currentPath={currentPath}
                    />
                  );
                }
                const Icon = iconMap[item.icon] ?? HelpCircle;
                const isActive = isCurrentPage(item.href, currentPath);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuLink
                      to={item.href}
                      linkComponent={Link}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
          <select
            value={tenantId}
            onChange={(e) => handleTenantChange(e.target.value as TenantId)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Object.values(TENANTS).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
              <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
                MR
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">Morgan Reed</span>
                <span className="text-muted-foreground truncate text-xs">Ops Manager</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
