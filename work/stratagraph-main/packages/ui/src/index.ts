// Shared UI components (shadcn/ui)
export * from './lib/utils';
export * from './lib/color-utils';
export * from './components/ui/button';
export * from './components/ui/button-group';
export * from './components/ui/input';
export * from './components/ui/password-input';
export * from './components/ui/stepped-card';
export * from './components/ui/textarea';
export * from './components/ui/label';
export * from './components/ui/checkbox';
export * from './components/ui/select';
export * from './components/ui/skeleton';
export * from './components/ui/stepper';
export * from './components/ui/progress';
export * from './components/ui/dialog';
export * from './components/ui/table';
export * from './components/ui/badge';
export * from './components/status-badge';
export * from './components/steps-inline';
export * from './components/procedure-status-badge';
export * from './components/execution-status-badge';
export * from './components/execution-type-badge';
export * from './components/event-type-badge';
export * from './components/task-status-badge';
export * from './components/approval-status-badge';
export * from './components/comment-status-badge';
export * from './components/approval-type-badge';
export * from './components/user-role-badge';
export * from './components/ui/card';
export * from './components/error-fallback';
export * from './components/ui/sonner';

// Form components with react-hook-form integration
export * from './components/form';

// Alert components
export * from './components/ui/alert';
export * from './components/ui/alert-dialog';

// Data display components
export * from './components/data-table';
export {
  createColumnHelper,
  type ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState,
  type ExpandedState,
} from '@tanstack/react-table';
export * from './components/ui/empty';
export * from './components/loading-state';
export * from './components/overflow-text';

// Layout components
export * from './components/page-header';
export * from './components/section';
export * from './components/section-label';

// Date formatting utilities
export * from './lib/format-date-range';

// Composite input components
export * from './components/search-input';
export * from './components/date-picker';
export * from './components/date-range-picker';
export * from './components/ui/calendar';
export * from './components/ui/popover';
export * from './components/ui/multi-select';
export * from './components/ui/filters';
export * from './components/ui/view-filters';

// Navigation components
export * from './components/ui/breadcrumb';
export * from './components/ui/pagination';

// Accordion components
export * from './components/ui/accordion';

// Tooltip components
export * from './components/ui/tooltip';

// Spinner component
export * from './components/ui/spinner';

// Toolbar components
export * from './components/ui/toolbar';

// FloatingToolbar component
export * from './components/ui/floating-toolbar';

// Dropdown menu components
export * from './components/ui/dropdown-menu';
export * from './components/ui/context-menu';

// Avatar components
export * from './components/ui/avatar';

// HoverCard components
export * from './components/ui/hover-card';

// Tabs components
export * from './components/ui/tabs';

// Toggle components
export * from './components/ui/toggle';
export * from './components/ui/toggle-group';

// Switch component
export * from './components/ui/switch';

// Sidebar components
export * from './components/ui/sidebar';
export * from './components/ui/sidebar-menu-link';
export * from './components/ui/sheet';
export * from './components/ui/separator';
export * from './components/ui/collapsible';

// Kbd components
export * from './components/ui/kbd';

// Command components
export * from './components/ui/command';

// Scroll area components
export * from './components/ui/scroll-area';

// Resizable components
export * from './components/ui/resizable';

// Theme components
export * from './components/theme-mode-button';

// Hooks
export { useIsMobile } from './hooks/useIsMobile';
export { useDebounce } from './hooks/useDebounce';
export {
  useShiftSelection,
  type UseShiftSelectionOptions,
  type UseShiftSelectionReturn,
} from './hooks/use-shift-selection';

// Layouts
export * from './layouts';

// Import dialog component
export * from './components/import-dialog';

// Badge display components
export * from './components/user-badge';
export * from './components/site-badge';
export * from './components/version-badge';
export * from './components/tag-badge';
export * from './components/tags-badge-list';
export * from './components/sites-badge-list';
export * from './components/overflow-badge-list';
export * from './components/users-badge-list';

// Date display components
export * from './components/date-badge';

// DataGrid components
export * from './components/ui/data-grid';
export * from './components/ui/data-grid-table';
export * from './components/ui/data-grid-pagination';
export * from './components/ui/data-grid-column-header';
export * from './components/ui/data-grid-column-filter';
export * from './components/ui/data-grid-column-visibility';
export * from './components/ui/data-grid-table-dnd';
export * from './components/ui/data-grid-table-dnd-rows';

// View components (URL-driven wrappers)
export * from './components/ui/view-pagination';

// PickerMenu composition (MEE-1765) — new picker family over ContextMenu primitives
export * from './components/picker-menu';

// Entity card components (data display)
export * from './components/procedure-card';
export * from './components/execution-card';
export * from './components/task-card';
export * from './components/site-card-display';
export * from './components/user-card-display';

// Score color utilities
export * from './lib/score-colors';

// Score badge component
export * from './components/ui/score-badge';

// StatCard atomic component
export * from './components/stat-card';

// InlineComplianceBar atomic component
export * from './components/inline-compliance-bar';

// KpiCard compound component (StatCard + delta trend chip)
export * from './components/kpi-card';

// DonutCard compound component
export * from './components/donut-card';

// BarChartCard compound component
export * from './components/bar-chart-card';

// TableCard compound component
export * from './components/table-card';

// Chart components
export * from './components/charts';
// NOTE: shadcn `chart.tsx` (recharts wrapper) is intentionally NOT re-exported
// here because it exposes a `ChartContainer` that collides with the existing
// visx `ChartContainer`. Consumers import the recharts wrappers via the deep
// path `@repo/ui/components/ui/chart` (matches the convention documented in
// `./components/charts/index.ts`). When the visx legacy charts are removed,
// this can be promoted to a regular re-export.
//
// `ChartConfig` is a pure type and doesn't collide, so it is re-exported here
// so app-specific compositions can write `import { type ChartConfig } from '@repo/ui'`.
export type { ChartConfig } from './components/ui/chart';

// Bulk edit dialog component
export * from './components/ui/bulk-edit-dialog';

// Bulk edit field component
export * from './components/ui/bulk-edit-field';
