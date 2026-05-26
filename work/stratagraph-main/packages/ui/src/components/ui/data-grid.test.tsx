/**
 * DataGrid component tests.
 *
 * Tests verify:
 * - DataGrid passes isFetching to context
 * - DataGridFetchingIndicator shows spinner when isFetching is true and isLoading is false
 * - DataGridFetchingIndicator does not show when isFetching is false
 * - DataGridFetchingIndicator does not show when isLoading is true (even if isFetching is true)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataGrid, DataGridContainer, useDataGrid } from './data-grid';
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table';

// Simple test data type
interface TestRow {
  id: string;
  name: string;
}

// Create a column helper for our test data
const columnHelper = createColumnHelper<TestRow>();

const columns = [
  columnHelper.accessor('id', { header: 'ID' }),
  columnHelper.accessor('name', { header: 'Name' }),
];

// A helper component that uses the DataGrid with a real table instance
function TestDataGrid({
  data = [],
  isLoading,
  isFetching,
  children,
}: {
  data?: TestRow[];
  isLoading?: boolean;
  isFetching?: boolean;
  children?: React.ReactNode;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid table={table} recordCount={data.length} isLoading={isLoading} isFetching={isFetching}>
      <DataGridContainer>{children}</DataGridContainer>
    </DataGrid>
  );
}

// A component to test context values
function ContextReader() {
  const { isFetching, isLoading } = useDataGrid();
  return (
    <div data-testid="context-reader">
      <span data-testid="is-fetching">{String(isFetching)}</span>
      <span data-testid="is-loading">{String(isLoading)}</span>
    </div>
  );
}

describe('DataGrid', () => {
  it('passes isFetching to context', () => {
    render(
      <TestDataGrid isFetching={true}>
        <ContextReader />
      </TestDataGrid>
    );

    expect(screen.getByTestId('is-fetching')).toHaveTextContent('true');
  });

  it('passes isLoading to context', () => {
    render(
      <TestDataGrid isLoading={true}>
        <ContextReader />
      </TestDataGrid>
    );

    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('defaults isFetching to false when not provided', () => {
    render(
      <TestDataGrid>
        <ContextReader />
      </TestDataGrid>
    );

    expect(screen.getByTestId('is-fetching')).toHaveTextContent('false');
  });

  it('defaults isLoading to false when not provided', () => {
    render(
      <TestDataGrid>
        <ContextReader />
      </TestDataGrid>
    );

    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });
});

describe('DataGridFetchingIndicator', () => {
  it('shows spinner when isFetching is true and isLoading is false', () => {
    render(
      <TestDataGrid isFetching={true} isLoading={false}>
        <div>Content</div>
      </TestDataGrid>
    );

    // The spinner is an SVG with animate-spin class
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not show spinner when isFetching is false', () => {
    render(
      <TestDataGrid isFetching={false} isLoading={false}>
        <div>Content</div>
      </TestDataGrid>
    );

    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });

  it('does not show spinner when isLoading is true even if isFetching is true', () => {
    render(
      <TestDataGrid isFetching={true} isLoading={true}>
        <div>Content</div>
      </TestDataGrid>
    );

    // The loading state takes precedence - no fetching indicator
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });

  it('does not show spinner when both isFetching and isLoading are false', () => {
    render(
      <TestDataGrid isFetching={false} isLoading={false}>
        <div>Content</div>
      </TestDataGrid>
    );

    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });
});

describe('DataGridContainer', () => {
  it('includes the fetching indicator', () => {
    render(
      <TestDataGrid isFetching={true}>
        <div>Content</div>
      </TestDataGrid>
    );

    // Container should have the data-slot attribute
    const container = document.querySelector('[data-slot="data-grid"]');
    expect(container).toBeInTheDocument();

    // And the spinner should be inside
    const spinner = container?.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
