/**
 * ViewFilters — generic adapter bridging URL search params and the Filters component.
 *
 * Reads params via `useSearch()`, derives `Filter[]` with `useMemo`,
 * and writes back via `navigate()` on change. No local state.
 *
 * @see Issue #294: SP-002: Create ViewFilters generic component
 * @see docs/specs/url-search-params-spec.md
 */

'use client';

import { useMemo, useCallback } from 'react';
import type React from 'react';
import { Filters, type Filter, type FilterFieldConfig, type FilterI18nConfig } from './filters';
import { Button } from './button';

/**
 * Describes a single filter field's mapping between URL params and Filter state.
 *
 * - `field`: the FilterFieldConfig for the Filters component
 * - `fromParams`: derives a Filter from the current URL params, or null if inactive
 * - `toParams`: converts a Filter (or null on removal) back to URL param updates
 */
export interface ViewFilterField<TParams> {
  field: FilterFieldConfig;
  fromParams: (params: TParams) => Filter | null;
  toParams: (filter: Filter | null) => Partial<TParams>;
}

/**
 * Configuration for ViewFilters, containing all filter field mappings.
 */
export interface ViewFiltersConfig<TParams> {
  fields: ViewFilterField<TParams>[];
}

/**
 * Props for the ViewFilters component.
 *
 * Accepts a `config` with field mappings and a `routeId` for useSearch().
 * Additional Filters props (variant, size, etc.) are passed through.
 */
export interface ViewFiltersProps<TParams> {
  config: ViewFiltersConfig<TParams>;
  params: TParams;
  navigate: (options: {
    search: (prev: Record<string, unknown>) => Record<string, unknown>;
    replace: boolean;
  }) => void;
  className?: string;
  showAddButton?: boolean;
  disableAddButtonWhenEmpty?: boolean;
  addButtonText?: string;
  addButtonIcon?: React.ReactNode;
  addButtonClassName?: string;
  addButton?: React.ReactNode;
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  radius?: 'md' | 'full';
  i18n?: Partial<FilterI18nConfig>;
  showSearchInput?: boolean;
  cursorPointer?: boolean;
  trigger?: React.ReactNode;
  allowMultiple?: boolean;
  popoverContentClassName?: string;
  showClearButton?: boolean;
  clearButtonText?: string;
}

/**
 * ViewFilters — URL-driven filter component.
 *
 * No `useState` is used. All filter state is derived from URL search params
 * and changes are written back to the URL via `navigate()`.
 */
export function ViewFilters<TParams extends Record<string, unknown>>({
  config,
  params,
  navigate,
  showClearButton = true,
  clearButtonText = 'Clear',
  allowMultiple = false,
  ...filtersProps
}: ViewFiltersProps<TParams>) {
  // Derive Filter[] from URL params via each field's fromParams
  const filters: Filter[] = useMemo(() => {
    const result: Filter[] = [];
    for (const viewField of config.fields) {
      const filter = viewField.fromParams(params);
      if (filter !== null) {
        result.push(filter);
      }
    }
    return result;
  }, [config.fields, params]);

  // Extract the FilterFieldConfig[] for the Filters component
  const fieldConfigs = useMemo(() => config.fields.map((vf) => vf.field), [config.fields]);

  // Handle filter changes — compute merged toParams and navigate
  const handleChange = useCallback(
    (nextFilters: Filter[]) => {
      // Build a set of field keys present in the new filters
      const activeFieldKeys = new Set(nextFilters.map((f) => f.field));

      // Accumulate param updates from all fields
      let updates: Partial<TParams> = {};

      for (const vf of config.fields) {
        const fieldKey = vf.field.key;
        if (!fieldKey) continue;

        const matchingFilter = nextFilters.find((f) => f.field === fieldKey);

        if (matchingFilter) {
          // Field is active — convert filter to params
          const paramUpdates = vf.toParams(matchingFilter);
          updates = { ...updates, ...paramUpdates };
        } else if (!activeFieldKeys.has(fieldKey)) {
          // Field was removed — call toParams(null) to clear params
          const paramUpdates = vf.toParams(null);
          updates = { ...updates, ...paramUpdates };
        }
      }

      navigate({
        search: (prev: Record<string, unknown>) => ({ ...prev, ...updates, page: undefined }),
        replace: false,
      });
    },
    [config.fields, navigate]
  );

  const handleClearAll = useCallback(() => {
    // Clear all filter params by calling toParams(null) for each field
    const updates: Partial<TParams> = {};
    for (const vf of config.fields) {
      const paramUpdates = vf.toParams(null);
      Object.assign(updates, paramUpdates);
    }
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, ...updates }),
      replace: false,
    });
  }, [config.fields, navigate]);

  return (
    <Filters
      filters={filters}
      fields={fieldConfigs}
      onChange={handleChange}
      allowMultiple={allowMultiple}
      {...filtersProps}
    >
      {showClearButton && filters.length > 0 && (
        <Button
          variant="ghost"
          size="xs"
          onClick={handleClearAll}
          className="text-muted-foreground hover:text-foreground"
        >
          {clearButtonText}
        </Button>
      )}
    </Filters>
  );
}
