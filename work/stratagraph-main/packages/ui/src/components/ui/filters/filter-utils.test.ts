import { describe, it, expect } from 'vitest';
import { isStandaloneOperator, isStandaloneOperatorValue, getSubmenuType } from './filter-utils';
import type { FilterFieldConfig, FilterOperator } from './filter-types';

describe('isStandaloneOperator', () => {
  it('returns true when needsValue is explicitly false', () => {
    const op: FilterOperator = { value: 'isExpired', label: 'is expired', needsValue: false };
    expect(isStandaloneOperator(op)).toBe(true);
  });

  it('returns false when needsValue is explicitly true', () => {
    const op: FilterOperator = { value: 'before', label: 'is before', needsValue: true };
    expect(isStandaloneOperator(op)).toBe(false);
  });

  it('returns true for empty/not_empty via fallback heuristic when needsValue is undefined', () => {
    const op: FilterOperator = { value: 'empty', label: 'is empty' };
    expect(isStandaloneOperator(op)).toBe(true);

    const op2: FilterOperator = { value: 'not_empty', label: 'is not empty' };
    expect(isStandaloneOperator(op2)).toBe(true);
  });

  it('returns false for value-based operators when needsValue is undefined', () => {
    const op: FilterOperator = { value: 'before', label: 'is before' };
    expect(isStandaloneOperator(op)).toBe(false);
  });

  it('returns true for isExpired with needsValue: false', () => {
    const op: FilterOperator = { value: 'isExpired', label: 'is expired', needsValue: false };
    expect(isStandaloneOperator(op)).toBe(true);
  });

  it('returns true for isExpiring with needsValue: false', () => {
    const op: FilterOperator = { value: 'isExpiring', label: 'is expiring', needsValue: false };
    expect(isStandaloneOperator(op)).toBe(true);
  });

  it('returns true for lastWeek with needsValue: false', () => {
    const op: FilterOperator = { value: 'lastWeek', label: 'in the last week', needsValue: false };
    expect(isStandaloneOperator(op)).toBe(true);
  });

  it('returns true for lastMonth with needsValue: false', () => {
    const op: FilterOperator = {
      value: 'lastMonth',
      label: 'in the last month',
      needsValue: false,
    };
    expect(isStandaloneOperator(op)).toBe(true);
  });

  it('returns true for lastYear with needsValue: false', () => {
    const op: FilterOperator = {
      value: 'lastYear',
      label: 'in the last year',
      needsValue: false,
    };
    expect(isStandaloneOperator(op)).toBe(true);
  });
});

describe('isStandaloneOperatorValue', () => {
  const operators: FilterOperator[] = [
    { value: 'before', label: 'is before' },
    { value: 'after', label: 'is after' },
    { value: 'isExpired', label: 'is expired', needsValue: false },
    { value: 'empty', label: 'is empty' },
  ];

  it('returns true for operator with needsValue: false', () => {
    expect(isStandaloneOperatorValue('isExpired', operators)).toBe(true);
  });

  it('returns false for value-based operator', () => {
    expect(isStandaloneOperatorValue('before', operators)).toBe(false);
  });

  it('returns true for empty operator via heuristic fallback', () => {
    expect(isStandaloneOperatorValue('empty', operators)).toBe(true);
  });

  it('falls back to heuristic for unknown operator values', () => {
    expect(isStandaloneOperatorValue('not_empty', [])).toBe(true);
    expect(isStandaloneOperatorValue('between', [])).toBe(false);
  });
});

describe('getSubmenuType', () => {
  it('returns "date" for date type fields', () => {
    const field: FilterFieldConfig = { key: 'created', type: 'date' };
    expect(getSubmenuType(field)).toBe('date');
  });

  it('returns "date" for daterange type fields', () => {
    const field: FilterFieldConfig = { key: 'range', type: 'daterange' };
    expect(getSubmenuType(field)).toBe('date');
  });

  it('returns "operator-dynamic" for multiselect fields', () => {
    const field: FilterFieldConfig = { key: 'tags', type: 'multiselect' };
    expect(getSubmenuType(field)).toBe('operator-dynamic');
  });

  it('returns "dynamic" for select fields with searchable: true', () => {
    const field: FilterFieldConfig = { key: 'user', type: 'select', searchable: true };
    expect(getSubmenuType(field)).toBe('dynamic');
  });

  it('returns "dynamic" for select fields with maxSelections', () => {
    const field: FilterFieldConfig = { key: 'priority', type: 'select', maxSelections: 3 };
    expect(getSubmenuType(field)).toBe('dynamic');
  });

  it('returns "exclusive" for plain select fields', () => {
    const field: FilterFieldConfig = { key: 'status', type: 'select' };
    expect(getSubmenuType(field)).toBe('exclusive');
  });

  it('returns "exclusive" when type is undefined (defaults to select)', () => {
    const field: FilterFieldConfig = { key: 'status' };
    expect(getSubmenuType(field)).toBe('exclusive');
  });
});
