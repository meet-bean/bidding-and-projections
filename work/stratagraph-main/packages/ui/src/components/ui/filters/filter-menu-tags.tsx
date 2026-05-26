'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DynamicSetContent } from './filter-menu-dynamic';
import type { FilterOperator, FilterOption } from './filter-types';
import { isStandaloneOperator } from './filter-utils';

export interface OperatorDynamicSetContentProps<T = unknown> {
  operators: FilterOperator[];
  options: FilterOption<T>[];
  selectedOperator: string | undefined;
  selectedValues: T[];
  onOperatorChange: (operator: string | undefined) => void;
  onValuesChange: (values: T[]) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
}

function OperatorDynamicSetContent<T = unknown>({
  operators,
  options,
  selectedOperator,
  selectedValues,
  onOperatorChange,
  onValuesChange,
  isLoading = false,
  searchPlaceholder,
}: OperatorDynamicSetContentProps<T>) {
  const standaloneOperators = React.useMemo(
    () => operators.filter(isStandaloneOperator),
    [operators]
  );
  const valueOperators = React.useMemo(
    () => operators.filter((op) => !isStandaloneOperator(op)),
    [operators]
  );

  // When there's exactly one value-based operator and no standalone operators,
  // auto-select it implicitly and skip rendering the operator rows entirely.
  const implicitOperator = valueOperators.length === 1 && standaloneOperators.length === 0;
  const implicitValue = implicitOperator ? valueOperators[0]?.value : undefined;

  const effectiveOperator = implicitValue ?? selectedOperator;

  // Auto-select the implicit operator on first render if not already set
  React.useEffect(() => {
    if (implicitValue && selectedOperator !== implicitValue) {
      onOperatorChange(implicitValue);
    }
  }, [implicitValue, selectedOperator, onOperatorChange]);

  const selectedOp = operators.find((op) => op.value === effectiveOperator);
  const showValues = selectedOp !== undefined && !isStandaloneOperator(selectedOp);

  return (
    <div data-slot="filter-menu-tags" className="flex flex-col">
      {/* Standalone operators first */}
      {standaloneOperators.length > 0 && (
        <div className="flex flex-col gap-0.5 p-1">
          {standaloneOperators.map((op) => {
            const isSelected = effectiveOperator === op.value;
            return (
              <button
                key={op.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onOperatorChange(op.value)}
                className={cn(
                  'flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:ring-ring/50 focus-visible:ring-2',
                  isSelected && 'bg-accent/50'
                )}
              >
                <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
                <span>{op.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Separator if both exist */}
      {standaloneOperators.length > 0 && valueOperators.length > 0 && (
        <div className="bg-border my-1 h-px" role="separator" />
      )}

      {/* Value-based operators — hidden when implicit (single operator, no standalone) */}
      {!implicitOperator && valueOperators.length > 0 && (
        <div className="flex flex-col gap-0.5 p-1">
          {valueOperators.map((op) => {
            const isSelected = effectiveOperator === op.value;
            return (
              <button
                key={op.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onOperatorChange(op.value)}
                className={cn(
                  'flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:ring-ring/50 focus-visible:ring-2',
                  isSelected && 'bg-accent/50'
                )}
              >
                <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
                <span>{op.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Value sections: only show when a value-based operator is selected */}
      {showValues && (
        <>
          {!implicitOperator && <div className="bg-border my-1 h-px" role="separator" />}
          <DynamicSetContent
            options={options}
            selectedValues={selectedValues}
            onSelect={onValuesChange}
            isLoading={isLoading}
            searchPlaceholder={searchPlaceholder}
          />
        </>
      )}
    </div>
  );
}

OperatorDynamicSetContent.displayName = 'OperatorDynamicSetContent';

export { OperatorDynamicSetContent };
