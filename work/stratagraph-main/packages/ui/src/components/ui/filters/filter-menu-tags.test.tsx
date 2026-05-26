'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorDynamicSetContent } from './filter-menu-tags';
import type { FilterOperator, FilterOption } from './filter-types';

const operators: FilterOperator[] = [
  { value: 'is_any_of', label: 'Is any of' },
  { value: 'is_not_any_of', label: 'Is not any of' },
  { value: 'isEmpty', label: 'Is empty' },
  { value: 'isNotEmpty', label: 'Is not empty' },
];

const options: FilterOption<string>[] = [
  { value: 'tag-a', label: 'Tag A' },
  { value: 'tag-b', label: 'Tag B' },
];

describe('OperatorDynamicSetContent', () => {
  it('renders operator options', () => {
    render(
      <OperatorDynamicSetContent
        operators={operators}
        options={options}
        selectedOperator={undefined}
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={vi.fn()}
      />
    );

    expect(screen.getByText('Is any of')).toBeInTheDocument();
    expect(screen.getByText('Is not any of')).toBeInTheDocument();
    expect(screen.getByText('Is empty')).toBeInTheDocument();
    expect(screen.getByText('Is not empty')).toBeInTheDocument();
  });

  it('hides value sections when standalone operator selected', () => {
    render(
      <OperatorDynamicSetContent
        operators={operators}
        options={options}
        selectedOperator="isEmpty"
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={vi.fn()}
      />
    );

    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });

  it('shows value sections when value-based operator selected', () => {
    render(
      <OperatorDynamicSetContent
        operators={operators}
        options={options}
        selectedOperator="is_any_of"
        selectedValues={[]}
        onOperatorChange={vi.fn()}
        onValuesChange={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('selecting standalone operator calls onOperatorChange', async () => {
    const onOperatorChange = vi.fn();
    const user = userEvent.setup();

    render(
      <OperatorDynamicSetContent
        operators={operators}
        options={options}
        selectedOperator={undefined}
        selectedValues={[]}
        onOperatorChange={onOperatorChange}
        onValuesChange={vi.fn()}
      />
    );

    await user.click(screen.getByText('Is empty'));

    expect(onOperatorChange).toHaveBeenCalledWith('isEmpty');
  });

  it('selecting value-based operator reveals search and options', async () => {
    const onOperatorChange = vi.fn();
    const user = userEvent.setup();

    render(
      <OperatorDynamicSetContent
        operators={operators}
        options={options}
        selectedOperator={undefined}
        selectedValues={[]}
        onOperatorChange={onOperatorChange}
        onValuesChange={vi.fn()}
      />
    );

    await user.click(screen.getByText('Is any of'));

    expect(onOperatorChange).toHaveBeenCalledWith('is_any_of');
  });
});
