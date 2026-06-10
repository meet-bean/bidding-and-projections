import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useStore } from '~/lib/store';
import { TENANTS } from '~/lib/tenant';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  useSidebar,
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
  ArrowRightLeft,
  ToggleRight,
  Sun,
  Moon,
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
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    // When expanding from the icon rail, the trigger's own toggle races the
    // forced open — clamp to open so the group always lands expanded.
    <Collapsible
      open={open}
      onOpenChange={(next) => setOpen(sidebarOpen ? next : true)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={item.label}
              isActive={isActive}
              // Groups have no page of their own: in the collapsed icon rail,
              // clicking one expands the sidebar so its children are pickable.
              onClick={() => {
                if (!sidebarOpen) {
                  setSidebarOpen(true);
                  setOpen(true);
                }
              }}
            />
          }
        >
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
  const demoMode = useStore((s) => s.demoMode);
  const toggleDemoMode = useStore((s) => s.toggleDemoMode);
  const otherTenant = tenantId === 'stratagraph' ? 'superior' : 'stratagraph';

  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(next);
    localStorage.setItem('stratagraph-theme', next);
    setIsDark(!isDark);
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
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm outline-none transition-colors cursor-pointer"
                >
                  <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    MR
                  </div>
                  <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium">Morgan Reed</span>
                    <span className="text-muted-foreground truncate text-xs">morgan@{TENANTS[tenantId]?.id ?? 'company'}.com</span>
                  </div>
                  <ChevronsUpDown className="text-muted-foreground ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Options</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => {
                      setTenant(otherTenant);
                      window.location.href = `/home?tenant=${otherTenant}`;
                    }}
                  >
                    <ArrowRightLeft className="mr-2 size-4" />
                    Switch to {TENANTS[otherTenant]?.name ?? otherTenant}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Preferences</DropdownMenuLabel>
                  <DropdownMenuItem onClick={toggleDemoMode}>
                    <ToggleRight className="mr-2 size-4" />
                    <span>Demo Data</span>
                    <div className={`ml-auto relative h-5 w-9 rounded-full transition-colors ${demoMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                      <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${demoMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme}>
                    {isDark ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
                    <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
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
