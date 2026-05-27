import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useStore } from '~/lib/store';
import { TENANTS, type TenantId } from '~/lib/tenant';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
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
  ChevronsUpDown,
  LogOut,
  User,
  Sun,
  Moon,
  Flag,
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

const FLAGGABLE_ITEMS = [
  { id: 'bids', label: 'Show Bids' },
  { id: 'jobs', label: 'Show Jobs' },
  { id: 'projections', label: 'Show Projections' },
  { id: 'invoices', label: 'Show Invoices' },
] as const;

export function AppSidebar({ navItems, currentPath, tenantName = 'Stratagraph', tenantShortName = 'SG' }: AppSidebarProps) {
  const tenantId = useStore((s) => s.tenantId);
  const setTenant = useStore((s) => s.setTenant);
  const hiddenNavItems = useStore((s) => s.hiddenNavItems);
  const toggleNavItem = useStore((s) => s.toggleNavItem);
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
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full">
                <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent cursor-pointer">
                  <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
                    MR
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">Morgan Reed</span>
                    <span className="text-muted-foreground truncate text-xs">morgan@{TENANTS[tenantId]?.id ?? 'company'}.com</span>
                  </div>
                  <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={8}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
                        MR
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">Morgan Reed</span>
                        <span className="text-muted-foreground truncate text-xs">morgan@{TENANTS[tenantId]?.id ?? 'company'}.com</span>
                        <span className="bg-muted text-muted-foreground mt-1 w-fit rounded px-1.5 py-0.5 text-[10px] font-medium">Ops Manager</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <User className="mr-2 size-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    document.documentElement.classList.toggle('dark');
                  }}>
                    <Sun className="mr-2 size-4 dark:hidden" />
                    <Moon className="mr-2 hidden size-4 dark:block" />
                    Toggle theme
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Flag className="mr-2 size-4" />
                      Switch Tenant
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={tenantId} onValueChange={(v) => handleTenantChange(v as TenantId)}>
                        {Object.values(TENANTS).map((t) => (
                          <DropdownMenuRadioItem key={t.id} value={t.id}>
                            {t.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Flag className="mr-2 size-4" />
                      Feature Flags
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {FLAGGABLE_ITEMS.map((item) => (
                        <DropdownMenuCheckboxItem
                          key={item.id}
                          checked={!hiddenNavItems[item.id]}
                          onCheckedChange={() => toggleNavItem(item.id)}
                        >
                          {item.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
