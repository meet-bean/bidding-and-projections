/**
 * TableCard - Compound card chrome for a table or tabbed table set.
 *
 * Supports two modes:
 * - Single-table: pass `table` (a ReactNode).
 * - Tabbed: pass `tabs` (array of { key, label, count?, table }).
 *
 * Pass exactly one of `table` or `tabs`. Passing both throws in dev mode
 * (via `process.env.NODE_ENV !== 'production'` guard) to surface developer
 * mistakes early.
 *
 * @example
 * ```tsx
 * <TableCard
 *   title="At-Risk Trainings"
 *   tabs={[
 *     { key: 'overdue', label: 'Overdue', count: 5, table: <Table>...</Table> },
 *     { key: '7d',      label: 'Due in 7 Days', count: 12, table: <Table>...</Table> },
 *   ]}
 * />
 * ```
 */

import { type ReactNode, type Ref } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, type TabsListProps, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface TableCardTab {
  /** Unique key for this tab — used as the Tabs value. */
  key: string;
  /** Tab trigger label. */
  label: ReactNode;
  /** Optional badge count shown next to the label. */
  count?: number;
  /** The table to render when this tab is active. */
  table: ReactNode;
}

export interface TableCardProps {
  /** Card title shown in the header. Omit (along with description) for a headerless card. */
  title?: ReactNode;
  /** Optional sub-title shown beneath the title. */
  description?: ReactNode;
  /** Single-table mode — pass exactly one of `table` or `tabs`. */
  table?: ReactNode;
  /** Tabbed mode — pass exactly one of `table` or `tabs`. */
  tabs?: TableCardTab[];
  /** Default active tab key (when in tabbed mode). Defaults to the first tab. */
  defaultTab?: string;
  /** Show a loading skeleton in place of the body. */
  loading?: boolean;
  /** Replace the body with this slot when neither `table` nor `tabs` are provided. */
  empty?: ReactNode;
  /** Optional content rendered below the body in a CardFooter with a top border. */
  footer?: ReactNode;
  /** Extra classes merged onto the root Card. */
  className?: string;
  /** Forwarded to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;

  slotProps?: Partial<{
    tabList: TabsListProps;
  }>;
}

export function TableCard({
  title,
  description,
  table,
  tabs,
  defaultTab,
  loading,
  empty,
  footer,
  className,
  ref,
  slotProps,
}: TableCardProps) {
  if (process.env.NODE_ENV !== 'production' && table && tabs) {
    throw new Error('TableCard: pass either `table` or `tabs`, not both.');
  }
  const hasTabs = Array.isArray(tabs) && tabs.length > 0;
  const firstTab = tabs?.[0];
  // Clamp defaultTab to a valid key so a stale/misspelled value doesn't mount
  // Tabs with a non-matching value (which renders the body blank).
  const initialTab =
    defaultTab && tabs?.some((t) => t.key === defaultTab) ? defaultTab : firstTab?.key;
  let body: ReactNode;
  if (loading) {
    body = <Skeleton className="h-48 w-full" />;
  } else if (hasTabs) {
    // Destructure className + variant out of slotProps.tabList so that a
    // caller-supplied value doesn't silently overwrite the explicit
    // `variant='line'` and the `px-6` layout class via the trailing spread.
    // `_variant` is intentionally discarded — TableCard owns the variant.
    const {
      className: tabListClassName,
      variant: _variant,
      ...tabListRest
    } = slotProps?.tabList ?? {};
    body = (
      <Tabs defaultValue={initialTab}>
        <TabsList variant="line" className={cn('px-6', tabListClassName)} {...tabListRest}>
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="flex-grow-0 gap-2">
              {t.label}
              {t.count != null && <Badge variant="secondary">{t.count}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>
        <CardContent>
          {tabs.map((t) => (
            <TabsContent key={t.key} value={t.key}>
              {t.table}
            </TabsContent>
          ))}
        </CardContent>
      </Tabs>
    );
  } else if (table) {
    body = <CardContent>{table}</CardContent>;
  } else {
    body = <CardContent>{empty}</CardContent>;
  }

  return (
    <Card ref={ref} className={cn(hasTabs && 'pt-1', className)} data-slot="table-card">
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      {body}
      {footer && <CardFooter className="border-t">{footer}</CardFooter>}
    </Card>
  );
}
