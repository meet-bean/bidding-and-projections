'use client';

import type React from 'react';
import { useMemo, type PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

import type {
  Filter,
  FilterFieldConfig,
  FilterFieldsConfig,
  FilterI18nConfig,
} from './filter-types';
import { DEFAULT_I18N, flattenFields, getFieldsMap } from './filter-utils';
import { FilterContext } from './filter-context';
import type { FilterContextValue } from './filter-types';
import { FilterMenu } from './filter-menu';
import { FilterChipPopover } from './filter-chip-popover';

// Re-export types so view-filters.tsx can import them from './filters'
export type { Filter, FilterFieldConfig, FilterI18nConfig };

interface FiltersProps<T = unknown> {
  filters: Filter<T>[];
  fields: FilterFieldsConfig<T>;
  onChange: (filters: Filter<T>[]) => void;
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
}

export function Filters<T = unknown>({
  children,
  filters,
  fields,
  onChange,
  className,
  showAddButton = true,
  variant = 'outline',
  size = 'md',
  radius = 'md',
  i18n: i18nOverrides,
  cursorPointer = true,
  addButtonText,
  addButtonIcon,
  addButtonClassName,
  addButton,
  showSearchInput,
  trigger,
  allowMultiple,
  disableAddButtonWhenEmpty = false,
}: PropsWithChildren<FiltersProps<T>>) {
  const flatFields = useMemo(() => flattenFields(fields), [fields]);
  const fieldsMap = useMemo(() => getFieldsMap(flatFields), [flatFields]);

  const mergedI18n: FilterI18nConfig = useMemo(
    () => ({
      ...DEFAULT_I18N,
      ...i18nOverrides,
      operators: {
        ...DEFAULT_I18N.operators,
        ...i18nOverrides?.operators,
      },
      placeholders: {
        ...DEFAULT_I18N.placeholders,
        ...i18nOverrides?.placeholders,
      },
      helpers: {
        ...DEFAULT_I18N.helpers,
        ...i18nOverrides?.helpers,
      },
      validation: {
        ...DEFAULT_I18N.validation,
        ...i18nOverrides?.validation,
      },
    }),
    [i18nOverrides]
  );

  const contextValue: FilterContextValue = useMemo(
    () => ({
      variant,
      size,
      radius,
      i18n: mergedI18n,
      cursorPointer,
      className,
      showAddButton,
      addButtonText,
      addButtonIcon,
      addButtonClassName,
      addButton,
      showSearchInput,
      trigger,
      allowMultiple,
    }),
    [
      variant,
      size,
      radius,
      mergedI18n,
      cursorPointer,
      className,
      showAddButton,
      addButtonText,
      addButtonIcon,
      addButtonClassName,
      addButton,
      showSearchInput,
      trigger,
      allowMultiple,
    ]
  );

  return (
    <FilterContext.Provider value={contextValue}>
      <div className={cn('flex flex-wrap items-center gap-1 [&>*]:leading-none', className)}>
        {/* 1. Filter menu button (always first) */}
        <FilterMenu<T>
          fields={flatFields}
          filters={filters}
          onFilterChange={onChange}
          disabled={
            disableAddButtonWhenEmpty &&
            flatFields.every((f) => filters.some((fl) => fl.field === f.key))
          }
        />

        {/* 2. Active filter chips */}
        {filters.map((filter) => {
          const field = fieldsMap[filter.field];
          if (!field) return null;
          return (
            <FilterChipPopover<T>
              key={filter.id}
              field={field}
              filter={filter}
              onFilterChange={(updatedFilter) => {
                onChange(filters.map((f) => (f.id === filter.id ? updatedFilter : f)));
              }}
              onRemove={() => {
                onChange(filters.filter((f) => f.id !== filter.id));
              }}
            />
          );
        })}

        {/* 3. Any additional children */}
        {children}
      </div>
    </FilterContext.Provider>
  );
}
