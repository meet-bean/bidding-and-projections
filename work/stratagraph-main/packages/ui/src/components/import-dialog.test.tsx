/**
 * ImportDialog component tests.
 *
 * @see Issue #246: P17-022: Implement CSV Import Dialog with Preview
 *
 * Tests verify:
 * - Dialog shows CSV template format
 * - File upload accepts .csv files
 * - Parser handles columns in different order
 * - Parser handles missing optional columns
 * - Preview shows parsed data
 * - Invalid rows show error highlighting
 * - Rows can be bulk-deleted via FloatingToolbar
 * - Submit button disabled when errors exist
 * - Submit button enabled when all rows valid
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportDialog, parseCSV, type ImportColumn, type ParsedRow } from './import-dialog';

// Test column definitions
const testColumns: ImportColumn[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'role', label: 'Role', required: false },
];

// Test columns with editable enabled (matches Users/Sites pattern)
const editableColumns: ImportColumn[] = [
  { key: 'name', label: 'Name', required: true, editable: true },
  { key: 'category', label: 'Category', required: true, editable: true },
];

// Helper to create a CSV File
function createCSVFile(content: string, name = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('ImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders dialog trigger', () => {
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
    });

    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Import Users')).toBeInTheDocument();
    });
  });

  describe('CSV Template Display', () => {
    it('shows expected CSV template format', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      // Should show column headers in template (the mono-formatted column list)
      const templateSection = screen.getByTestId('csv-template');
      expect(within(templateSection).getByText('name,email,role')).toBeInTheDocument();
    });

    it('indicates required columns in template', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      // Required indicator should be visible
      const templateSection = screen.getByTestId('csv-template');
      expect(within(templateSection).getByText(/required/i)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('accepts .csv files', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const input = screen.getByTestId('csv-file-input') as HTMLInputElement;
      expect(input.accept).toBe('.csv');
    });

    it('switches to editing state after upload', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });
      // Upload area hidden, preview visible
      expect(screen.queryByTestId('csv-file-input')).not.toBeInTheDocument();
      expect(screen.getByTestId('validation-status-bar')).toBeInTheDocument();
    });
  });

  describe('CSV Parsing', () => {
    it('parses CSV with columns in standard order', () => {
      const csv = 'name,email,role\nJohn,john@example.com,admin';
      const result = parseCSV(csv, testColumns);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];
      expect(row).toBeDefined();
      expect(row?.data).toEqual({
        name: 'John',
        email: 'john@example.com',
        role: 'admin',
      });
    });

    it('handles columns in different order', () => {
      const csv = 'email,role,name\njohn@example.com,admin,John';
      const result = parseCSV(csv, testColumns);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];
      expect(row).toBeDefined();
      expect(row?.data).toEqual({
        name: 'John',
        email: 'john@example.com',
        role: 'admin',
      });
    });

    it('handles missing optional columns', () => {
      const csv = 'name,email\nJohn,john@example.com';
      const result = parseCSV(csv, testColumns);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];
      expect(row).toBeDefined();
      expect(row?.data).toEqual({
        name: 'John',
        email: 'john@example.com',
        role: '',
      });
      expect(row?.errors).toHaveLength(0);
    });

    it('marks rows with missing required columns as invalid', () => {
      const csv = 'name,role\nJohn,admin';
      const result = parseCSV(csv, testColumns);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];
      expect(row).toBeDefined();
      expect(row?.errors).toContainEqual(expect.objectContaining({ column: 'email' }));
    });

    it('handles empty values in required columns', () => {
      const csv = 'name,email,role\nJohn,,admin';
      const result = parseCSV(csv, testColumns);

      const row = result.rows[0];
      expect(row).toBeDefined();
      expect(row?.errors).toContainEqual(expect.objectContaining({ column: 'email' }));
    });

    it('handles quoted values with commas', () => {
      const csv = 'name,email,role\n"Doe, John",john@example.com,admin';
      const result = parseCSV(csv, testColumns);

      const row = result.rows[0];
      expect(row).toBeDefined();
      expect(row?.data.name).toBe('Doe, John');
    });

    it('trims whitespace from values', () => {
      const csv = 'name,email,role\n  John  ,  john@example.com  ,admin';
      const result = parseCSV(csv, testColumns);

      const row = result.rows[0];
      expect(row).toBeDefined();
      expect(row?.data.name).toBe('John');
      expect(row?.data.email).toBe('john@example.com');
    });
  });

  describe('Preview Display', () => {
    it('shows parsed data in table after file upload', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
      });
    });

    it('highlights invalid rows with error styling', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        const row = screen.getByTestId('import-row-0');
        expect(row).toHaveAttribute('data-has-errors', 'true');
      });
    });

    it('shows error message for invalid cells', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('FloatingToolbar Bulk Actions', () => {
    it('FloatingToolbar does not appear when no rows are selected', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // No rows selected → toolbar should not be present
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    it('FloatingToolbar appears when a row is selected', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const rowCheckbox = screen.getByRole('checkbox', { name: /select row/i });
      await user.click(rowCheckbox);

      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('FloatingToolbar shows "{N} selected" text', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const selectAll = screen.getByRole('checkbox', { name: /select all/i });
      await user.click(selectAll);

      const toolbar = screen.getByRole('toolbar');
      expect(within(toolbar).getByText('2 selected')).toBeInTheDocument();
    });

    it('FloatingToolbar has a "Delete selected" button', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('checkbox', { name: /select row/i }));

      const toolbar = screen.getByRole('toolbar');
      expect(within(toolbar).getByRole('button', { name: /delete selected/i })).toBeInTheDocument();
    });

    it('clicking "Delete selected" removes selected rows from the grid', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      // Select first row
      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      await user.click(rowCheckboxes[0]!);

      const toolbar = screen.getByRole('toolbar');
      const deleteSelected = within(toolbar).getByRole('button', { name: /delete selected/i });
      await user.click(deleteSelected);

      // John should be gone, Jane should remain
      expect(screen.queryByText('John')).not.toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });

    it('FloatingToolbar disappears after bulk delete clears selection', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select first row only
      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      await user.click(rowCheckboxes[0]!);

      const toolbar = screen.getByRole('toolbar');
      const deleteSelected = within(toolbar).getByRole('button', { name: /delete selected/i });
      await user.click(deleteSelected);

      // Toolbar should be gone (selection cleared after delete)
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    it('Clear button in toolbar deselects all rows', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select all
      const selectAll = screen.getByRole('checkbox', { name: /select all/i });
      await user.click(selectAll);

      expect(screen.getByRole('toolbar')).toBeInTheDocument();

      // Click clear in toolbar
      const toolbar = screen.getByRole('toolbar');
      const clearButton = within(toolbar).getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // Toolbar should disappear
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();

      // All checkboxes should be unchecked
      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      rowCheckboxes.forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });
  });

  describe('Row Deletion', () => {
    it('allows deleting rows via FloatingToolbar bulk delete', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      // Select the first row
      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      await user.click(rowCheckboxes[0]!);

      // Use toolbar to delete
      const toolbar = screen.getByRole('toolbar');
      await user.click(within(toolbar).getByRole('button', { name: /delete selected/i }));

      // John should be gone
      expect(screen.queryByText('John')).not.toBeInTheDocument();
      // Jane should still be there
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });

  describe('Submit Button State', () => {
    it('disables submit button when there are validation errors', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit|confirm|import data/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('enables submit button when all rows are valid', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit|confirm|import data/i });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('disables submit button when no data is loaded', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const submitButton = screen.getByRole('button', { name: /submit|confirm|import data/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Import Submission', () => {
    it('calls onImport with valid data when submitted', async () => {
      const user = userEvent.setup();
      const onImport = vi.fn().mockResolvedValue(undefined);
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={onImport} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit|confirm|import data/i });
      await user.click(submitButton);

      expect(onImport).toHaveBeenCalledWith(
        [
          {
            name: 'John',
            email: 'john@example.com',
            role: 'admin',
          },
        ],
        { conflictStrategy: 'skip' }
      );
    });

    it('shows loading state during import', async () => {
      const user = userEvent.setup();
      let resolveImport: () => void;
      const importPromise = new Promise<void>((resolve) => {
        resolveImport = resolve;
      });
      const onImport = vi.fn().mockReturnValue(importPromise);

      render(<ImportDialog title="Import Users" columns={testColumns} onImport={onImport} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit|confirm|import data/i });
      await user.click(submitButton);

      // Should show loading state in button (no body spinner)
      expect(screen.getByRole('button', { name: /importing/i })).toBeInTheDocument();

      // Resolve the import
      resolveImport!();

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes dialog and shows success message on successful import', async () => {
      const user = userEvent.setup();
      const onImport = vi.fn().mockResolvedValue(undefined);
      const onSuccess = vi.fn();

      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={onImport}
          onSuccess={onSuccess}
        />
      );

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit|confirm|import data/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('awaits async onSuccess before closing dialog so invalidation completes (MEE-1290)', async () => {
      const user = userEvent.setup();
      const onImport = vi.fn().mockResolvedValue(undefined);

      // Track the order of events: invalidation must complete before close
      const events: string[] = [];
      let resolveSuccess: () => void;
      const successPromise = new Promise<void>((resolve) => {
        resolveSuccess = resolve;
      });

      // Async onSuccess simulates utils.*.list.invalidate() — slow network call
      const onSuccess = vi.fn(async () => {
        events.push('onSuccess-start');
        await successPromise;
        events.push('onSuccess-end');
      });

      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={onImport}
          onSuccess={onSuccess}
        />
      );

      await user.click(screen.getByRole('button', { name: /import/i }));
      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      await user.upload(screen.getByTestId('csv-file-input'), file);
      await waitFor(() => expect(screen.getByText('John')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /submit|confirm|import data/i }));

      // onSuccess started but has not resolved yet — dialog must still be open
      await waitFor(() => expect(events).toContain('onSuccess-start'));
      // Dialog should stay open while onSuccess is pending
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Resolve the success callback (simulating invalidate completing)
      resolveSuccess!();
      await waitFor(() => expect(events).toContain('onSuccess-end'));

      // NOW the dialog should be gone
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('shows error message on failed import', async () => {
      const user = userEvent.setup();
      const onImport = vi.fn().mockRejectedValue(new Error('Import failed'));

      render(<ImportDialog title="Import Users" columns={testColumns} onImport={onImport} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit|confirm|import data/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/import failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Custom Trigger', () => {
    it('supports custom trigger element', async () => {
      const user = userEvent.setup();
      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={vi.fn()}
          trigger={<button>Custom Import Button</button>}
        />
      );

      expect(screen.getByRole('button', { name: 'Custom Import Button' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Custom Import Button' }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Custom Validation', () => {
    it('supports custom column validation', () => {
      const columnsWithValidation: ImportColumn[] = [
        {
          key: 'email',
          label: 'Email',
          required: true,
          validate: (value) => {
            if (!value.includes('@')) {
              return 'Invalid email format';
            }
            return null;
          },
        },
      ];

      const csv = 'email\nnotanemail';
      const result = parseCSV(csv, columnsWithValidation);

      const row = result.rows[0];
      expect(row).toBeDefined();
      expect(row?.errors).toContainEqual(
        expect.objectContaining({
          column: 'email',
          message: 'Invalid email format',
        })
      );
    });
  });

  describe('DataGrid Preview', () => {
    it('renders preview as a DataGrid (data-slot="data-grid") not a plain table', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // DataGrid uses data-slot="data-grid" on its container
      const dataGrid = document.querySelector('[data-slot="data-grid"]');
      expect(dataGrid).toBeInTheDocument();
    });

    it('renders the DataGrid table element (data-slot="data-grid-table")', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(document.querySelector('[data-slot="data-grid-table"]')).toBeInTheDocument();
      });
    });

    it('renders a checkbox column in the header (Select all checkbox)', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Should have a "Select all" checkbox in the header
      expect(screen.getByRole('checkbox', { name: /select all/i })).toBeInTheDocument();
    });

    it('renders a checkbox for each data row', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      // Should have a checkbox per row (aria-label="Select row")
      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      expect(rowCheckboxes).toHaveLength(2);
    });

    it('clicking a row checkbox selects that row', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const rowCheckbox = screen.getByRole('checkbox', { name: /select row/i });
      expect(rowCheckbox).not.toBeChecked();

      await user.click(rowCheckbox);

      expect(rowCheckbox).toBeChecked();
    });

    it('clicking a selected row checkbox deselects it', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const rowCheckbox = screen.getByRole('checkbox', { name: /select row/i });
      // Select
      await user.click(rowCheckbox);
      expect(rowCheckbox).toBeChecked();

      // Deselect
      await user.click(rowCheckbox);
      expect(rowCheckbox).not.toBeChecked();
    });

    it('select all checkbox selects all rows', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const selectAll = screen.getByRole('checkbox', { name: /select all/i });
      await user.click(selectAll);

      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      rowCheckboxes.forEach((cb) => {
        expect(cb).toBeChecked();
      });
    });

    it('clicking select all again deselects all rows', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const selectAll = screen.getByRole('checkbox', { name: /select all/i });
      // Select all
      await user.click(selectAll);
      // Deselect all
      await user.click(selectAll);

      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      rowCheckboxes.forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });

    it('shift+click selects range between anchor and clicked row', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nAlice,alice@example.com,admin\nBob,bob@example.com,user\nCarol,carol@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Carol')).toBeInTheDocument();
      });

      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      expect(rowCheckboxes).toHaveLength(3);

      // Click first row checkbox (no shift) — sets anchor
      await user.click(rowCheckboxes[0]!);
      expect(rowCheckboxes[0]).toBeChecked();

      // Shift+click last row — selects range from first to last
      await user.keyboard('{Shift>}');
      await user.click(rowCheckboxes[2]!);
      await user.keyboard('{/Shift}');

      // All three rows should be selected (range selection)
      expect(rowCheckboxes[0]).toBeChecked();
      expect(rowCheckboxes[1]).toBeChecked();
      expect(rowCheckboxes[2]).toBeChecked();
    });

    it('error row styling still applies with DataGrid (data-has-errors attribute)', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        const row = screen.getByTestId('import-row-0');
        expect(row).toHaveAttribute('data-has-errors', 'true');
      });
    });

    it('row selection state resets when dialog closes and reopens', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select the row
      const rowCheckbox = screen.getByRole('checkbox', { name: /select row/i });
      await user.click(rowCheckbox);
      expect(rowCheckbox).toBeChecked();

      // Close dialog
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Reopen dialog
      await user.click(screen.getByRole('button', { name: /import/i }));

      // Upload again
      const input2 = screen.getByTestId('csv-file-input');
      await user.upload(input2, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // The row checkbox should not be checked (state was reset)
      const rowCheckbox2 = screen.getByRole('checkbox', { name: /select row/i });
      expect(rowCheckbox2).not.toBeChecked();
    });
  });

  describe('Validation Status Bar', () => {
    it('shows validation status bar with valid and invalid counts after file upload', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      // 1 valid, 1 invalid row
      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin\nJane,,user');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('validation-status-bar')).toBeInTheDocument();
        expect(screen.getByTestId('valid-count')).toHaveTextContent('1');
        expect(screen.getByTestId('invalid-count')).toHaveTextContent('1');
      });
    });

    it('shows 2 valid 0 invalid when all rows are valid', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('valid-count')).toHaveTextContent('2');
        expect(screen.getByTestId('invalid-count')).toHaveTextContent('0');
      });
    });

    it('updates counts when rows are bulk-deleted via FloatingToolbar', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('valid-count')).toHaveTextContent('2');
      });

      // Select first row and delete via toolbar
      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      await user.click(rowCheckboxes[0]!);

      const toolbar = screen.getByRole('toolbar');
      await user.click(within(toolbar).getByRole('button', { name: /delete selected/i }));

      await waitFor(() => {
        expect(screen.getByTestId('valid-count')).toHaveTextContent('1');
        expect(screen.getByTestId('invalid-count')).toHaveTextContent('0');
      });
    });

    it('shows filter ButtonGroup with All, Valid, Invalid buttons', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin\nJane,,user');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('filter-button-group')).toBeInTheDocument();
        expect(screen.getByTestId('filter-all')).toBeInTheDocument();
        expect(screen.getByTestId('filter-valid')).toBeInTheDocument();
        expect(screen.getByTestId('filter-invalid')).toBeInTheDocument();
      });
    });

    it('defaults to "All" filter showing all rows', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin\nJane,,user');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      expect(screen.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'true');
    });

    it('clicking "Invalid" filter shows only invalid rows', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin\nJane,,user');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('filter-invalid'));

      await waitFor(() => {
        expect(screen.queryByText('John')).not.toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });
    });

    it('clicking "Valid" filter shows only valid rows', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin\nJane,,user');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('filter-valid'));

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.queryByText('Jane')).not.toBeInTheDocument();
      });
    });

    it('clicking "All" after filtering shows all rows again', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin\nJane,,user');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Filter to invalid only
      await user.click(screen.getByTestId('filter-invalid'));
      await waitFor(() => {
        expect(screen.queryByText('John')).not.toBeInTheDocument();
      });

      // Back to all
      await user.click(screen.getByTestId('filter-all'));
      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });
    });

    it('status bar always shows total counts even when filter is active', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin\nJane,,user');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('valid-count')).toHaveTextContent('1');
        expect(screen.getByTestId('invalid-count')).toHaveTextContent('1');
      });

      // Filter to invalid
      await user.click(screen.getByTestId('filter-invalid'));

      // Counts should still reflect total (1 valid, 1 invalid), not filtered view
      await waitFor(() => {
        expect(screen.getByTestId('valid-count')).toHaveTextContent('1');
        expect(screen.getByTestId('invalid-count')).toHaveTextContent('1');
      });
    });
  });

  describe('renderBulkEditDialog prop', () => {
    // Helper that renders a mock bulk edit dialog
    function mockRenderBulkEditDialog(
      selectedRows: ParsedRow[],
      onSave: (updates: Record<string, string>) => void,
      onClose: () => void
    ) {
      return (
        <div data-testid="mock-bulk-edit-dialog">
          <span data-testid="bulk-edit-count">{selectedRows.length}</span>
          <button
            data-testid="bulk-edit-save"
            onClick={() => onSave({ email: 'bulk@example.com' })}
          >
            Save
          </button>
          <button data-testid="bulk-edit-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      );
    }

    it('"Bulk Edit..." button does NOT appear when renderBulkEditDialog is not provided', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select a row so FloatingToolbar is visible
      await user.click(screen.getByRole('checkbox', { name: /select row/i }));

      expect(screen.getByRole('toolbar')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /bulk edit/i })).not.toBeInTheDocument();
    });

    it('"Bulk Edit..." button appears in FloatingToolbar when renderBulkEditDialog is provided and rows are selected', async () => {
      const user = userEvent.setup();
      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={vi.fn()}
          renderBulkEditDialog={mockRenderBulkEditDialog}
        />
      );

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select a row so FloatingToolbar is visible
      await user.click(screen.getByRole('checkbox', { name: /select row/i }));

      const toolbar = screen.getByRole('toolbar');
      expect(within(toolbar).getByRole('button', { name: /bulk edit/i })).toBeInTheDocument();
    });

    it('clicking "Bulk Edit..." calls renderBulkEditDialog with selected rows', async () => {
      const user = userEvent.setup();
      const renderBulkEditDialog = vi.fn(mockRenderBulkEditDialog);

      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={vi.fn()}
          renderBulkEditDialog={renderBulkEditDialog}
        />
      );

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile(
        'name,email,role\nJohn,john@example.com,admin\nJane,jane@example.com,user'
      );
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select first row only
      const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
      await user.click(rowCheckboxes[0]!);

      // Click "Bulk Edit..."
      const toolbar = screen.getByRole('toolbar');
      await user.click(within(toolbar).getByRole('button', { name: /bulk edit/i }));

      // renderBulkEditDialog should have been called with the 1 selected row
      expect(renderBulkEditDialog).toHaveBeenCalled();
      const [calledRows] =
        renderBulkEditDialog.mock.calls[renderBulkEditDialog.mock.calls.length - 1]!;
      expect(calledRows).toHaveLength(1);
      expect(calledRows[0]?.data.name).toBe('John');

      // The mock dialog should be visible
      expect(screen.getByTestId('mock-bulk-edit-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-edit-count')).toHaveTextContent('1');
    });

    it('calling onSave updates selected rows data', async () => {
      const user = userEvent.setup();
      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={vi.fn()}
          renderBulkEditDialog={mockRenderBulkEditDialog}
        />
      );

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Select row
      await user.click(screen.getByRole('checkbox', { name: /select row/i }));

      // Open bulk edit
      const toolbar = screen.getByRole('toolbar');
      await user.click(within(toolbar).getByRole('button', { name: /bulk edit/i }));

      // Save with new email
      await user.click(screen.getByTestId('bulk-edit-save'));

      // Row should now show updated email
      await waitFor(() => {
        expect(screen.getByText('bulk@example.com')).toBeInTheDocument();
        expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
      });
    });

    it('calling onSave re-validates updated rows (fixing a required field error)', async () => {
      const user = userEvent.setup();

      // renderBulkEditDialog that saves with a valid email (fixing the error)
      function renderBulkEditDialogFixEmail(
        _selectedRows: ParsedRow[],
        onSave: (updates: Record<string, string>) => void,
        _onClose: () => void
      ) {
        return (
          <div data-testid="mock-bulk-edit-dialog">
            <button
              data-testid="bulk-edit-save"
              onClick={() => onSave({ email: 'fixed@example.com' })}
            >
              Save
            </button>
          </div>
        );
      }

      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={vi.fn()}
          renderBulkEditDialog={renderBulkEditDialogFixEmail}
        />
      );

      await user.click(screen.getByRole('button', { name: /import/i }));

      // Row with missing email (invalid)
      const file = createCSVFile('name,email,role\nJohn,,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Before bulk edit: submit should be disabled
      const submitButton = screen.getByRole('button', { name: /submit|confirm|import data/i });
      expect(submitButton).toBeDisabled();

      // Select the invalid row
      await user.click(screen.getByRole('checkbox', { name: /select row/i }));

      // Open bulk edit
      const toolbar = screen.getByRole('toolbar');
      await user.click(within(toolbar).getByRole('button', { name: /bulk edit/i }));

      // Save with fixed email
      await user.click(screen.getByTestId('bulk-edit-save'));

      // Row should now be valid (no error message, submit enabled)
      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('selection is cleared after onSave', async () => {
      const user = userEvent.setup();
      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={vi.fn()}
          renderBulkEditDialog={mockRenderBulkEditDialog}
        />
      );

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select row
      await user.click(screen.getByRole('checkbox', { name: /select row/i }));
      expect(screen.getByRole('toolbar')).toBeInTheDocument();

      // Open bulk edit
      const toolbar = screen.getByRole('toolbar');
      await user.click(within(toolbar).getByRole('button', { name: /bulk edit/i }));

      // Save
      await user.click(screen.getByTestId('bulk-edit-save'));

      // Selection should be cleared → toolbar disappears
      await waitFor(() => {
        expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
      });

      // Row checkbox should be unchecked
      const rowCheckbox = screen.getByRole('checkbox', { name: /select row/i });
      expect(rowCheckbox).not.toBeChecked();
    });

    it('bulk edit dialog closes after onSave', async () => {
      const user = userEvent.setup();
      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={vi.fn()}
          renderBulkEditDialog={mockRenderBulkEditDialog}
        />
      );

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select row and open bulk edit
      await user.click(screen.getByRole('checkbox', { name: /select row/i }));
      const toolbar = screen.getByRole('toolbar');
      await user.click(within(toolbar).getByRole('button', { name: /bulk edit/i }));

      expect(screen.getByTestId('mock-bulk-edit-dialog')).toBeInTheDocument();

      // Save
      await user.click(screen.getByTestId('bulk-edit-save'));

      // Mock dialog should be gone
      await waitFor(() => {
        expect(screen.queryByTestId('mock-bulk-edit-dialog')).not.toBeInTheDocument();
      });
    });

    it('can close bulk edit without saving and reopen it', async () => {
      const user = userEvent.setup();
      render(
        <ImportDialog
          title="Import Users"
          columns={testColumns}
          onImport={vi.fn()}
          renderBulkEditDialog={mockRenderBulkEditDialog}
        />
      );

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select row and open bulk edit
      await user.click(screen.getByRole('checkbox', { name: /select row/i }));
      const toolbar = screen.getByRole('toolbar');
      await user.click(within(toolbar).getByRole('button', { name: /bulk edit/i }));

      expect(screen.getByTestId('mock-bulk-edit-dialog')).toBeInTheDocument();

      // Cancel (close without saving)
      await user.click(screen.getByTestId('bulk-edit-cancel'));

      // Dialog should be gone
      await waitFor(() => {
        expect(screen.queryByTestId('mock-bulk-edit-dialog')).not.toBeInTheDocument();
      });

      // Reopen — selection should still be active so toolbar is visible
      const toolbar2 = screen.getByRole('toolbar');
      await user.click(within(toolbar2).getByRole('button', { name: /bulk edit/i }));

      // Dialog should be visible again
      expect(screen.getByTestId('mock-bulk-edit-dialog')).toBeInTheDocument();
    });
  });

  describe('Modal View States (MEE-948)', () => {
    it('shows upload state (instructions + drag-drop) when dialog first opens', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      // Upload state: template instructions and file input visible
      expect(screen.getByTestId('csv-template')).toBeInTheDocument();
      expect(screen.getByTestId('csv-file-input')).toBeInTheDocument();
      // No preview grid
      expect(screen.queryByTestId('validation-status-bar')).not.toBeInTheDocument();
    });

    it('hides instructions and drag-drop after CSV is uploaded (editing state)', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Editing state: template and file upload area should be hidden
      expect(screen.queryByTestId('csv-template')).not.toBeInTheDocument();
      expect(screen.queryByTestId('csv-file-input')).not.toBeInTheDocument();
      // Preview grid visible
      expect(screen.getByTestId('validation-status-bar')).toBeInTheDocument();
    });

    it('returns to upload state when all rows are deleted', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Select the row
      const rowCheckbox = screen.getByRole('checkbox', { name: /select row 1/i });
      await user.click(rowCheckbox);

      // Delete selected
      const deleteButton = screen.getByRole('button', { name: /delete selected/i });
      await user.click(deleteButton);

      // Should return to upload state with clean file input (no stale fileName)
      await waitFor(() => {
        expect(screen.getByTestId('csv-template')).toBeInTheDocument();
      });
      expect(screen.getByTestId('csv-file-input')).toBeInTheDocument();
      expect(screen.queryByTestId('validation-status-bar')).not.toBeInTheDocument();
      expect(screen.getByText('Click to upload')).toBeInTheDocument();
      expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
    });

    it('starts in upload state when dialog is reopened after close', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      // Open, upload, close
      await user.click(screen.getByRole('button', { name: /import/i }));
      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // Close
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Reopen
      await user.click(screen.getByRole('button', { name: /import/i }));

      // Should be in upload state
      expect(screen.getByTestId('csv-template')).toBeInTheDocument();
      expect(screen.getByTestId('csv-file-input')).toBeInTheDocument();
      expect(screen.queryByTestId('validation-status-bar')).not.toBeInTheDocument();
    });

    it('does not show loading spinner in modal body during import', async () => {
      const user = userEvent.setup();
      let resolveImport: () => void;
      const importPromise = new Promise<void>((resolve) => {
        resolveImport = resolve;
      });
      const onImport = vi.fn().mockReturnValue(importPromise);

      render(<ImportDialog title="Import Users" columns={testColumns} onImport={onImport} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /import data/i });
      await user.click(submitButton);

      // Button should show loading state
      expect(screen.getByRole('button', { name: /importing/i })).toBeInTheDocument();
      // Body loading spinner should NOT exist
      expect(screen.queryByTestId('import-loading')).not.toBeInTheDocument();

      resolveImport!();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop', () => {
    /** Helper: open dialog, return the dropzone element */
    async function openDialogAndGetDropzone() {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: /import/i }));
      const dropzone = screen.getByTestId('csv-dropzone');
      return { user, dropzone };
    }

    it('has a dropzone element with data-testid', async () => {
      const { dropzone } = await openDialogAndGetDropzone();
      expect(dropzone).toBeInTheDocument();
    });

    it('shows visual feedback when dragging a file over the dropzone', async () => {
      const { dropzone } = await openDialogAndGetDropzone();

      fireEvent.dragEnter(dropzone, {
        dataTransfer: { types: ['Files'], files: [] },
      });

      expect(dropzone).toHaveAttribute('data-drag-active', 'true');
    });

    it('removes visual feedback when drag leaves the dropzone', async () => {
      const { dropzone } = await openDialogAndGetDropzone();

      fireEvent.dragEnter(dropzone, {
        dataTransfer: { types: ['Files'], files: [] },
      });
      expect(dropzone).toHaveAttribute('data-drag-active', 'true');

      fireEvent.dragLeave(dropzone, {
        dataTransfer: { types: ['Files'], files: [] },
      });
      expect(dropzone).not.toHaveAttribute('data-drag-active');
    });

    it('processes a valid CSV file dropped onto the dropzone', async () => {
      const { dropzone } = await openDialogAndGetDropzone();

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };

      fireEvent.dragOver(dropzone, { dataTransfer });
      fireEvent.drop(dropzone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('switches to editing state after a valid drop', async () => {
      const { dropzone } = await openDialogAndGetDropzone();

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin', 'dropped.csv');
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });
      // Dropzone hidden in editing state, preview visible
      expect(screen.queryByTestId('csv-dropzone')).not.toBeInTheDocument();
      expect(screen.getByTestId('validation-status-bar')).toBeInTheDocument();
    });

    it('rejects non-CSV files with an error', async () => {
      const { dropzone } = await openDialogAndGetDropzone();

      const file = new File(['hello'], 'photo.png', { type: 'image/png' });
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/only .csv files are accepted/i)).toBeInTheDocument();
      });
    });

    it('removes drag-active state after drop', async () => {
      const { dropzone } = await openDialogAndGetDropzone();

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };

      fireEvent.dragEnter(dropzone, { dataTransfer });
      expect(dropzone).toHaveAttribute('data-drag-active', 'true');

      fireEvent.drop(dropzone, { dataTransfer });
      expect(dropzone).not.toHaveAttribute('data-drag-active');
    });
  });

  describe('Inline Cell Editing (MEE-1120)', () => {
    it('editable cells have cursor-text styling and aria attributes', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Tags" columns={editableColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,category\nSafety,Equipment');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Safety')).toBeInTheDocument();
      });

      // Editable cells should have role="button" and aria-label
      const editableCell = screen.getByRole('button', { name: /edit name/i });
      expect(editableCell).toBeInTheDocument();
    });

    it('double-clicking an editable cell opens an inline input', async () => {
      const user = userEvent.setup();
      render(<ImportDialog title="Import Tags" columns={editableColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,category\nSafety,Equipment');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Safety')).toBeInTheDocument();
      });

      // Double-click the editable cell
      const editableCell = screen.getByRole('button', { name: /edit name/i });
      await user.dblClick(editableCell);

      // An input should appear with the current value
      const editInput = screen.getByDisplayValue('Safety');
      expect(editInput.tagName).toBe('INPUT');
    });

    it('editing a cell value and pressing Enter updates the row data', async () => {
      const user = userEvent.setup();
      const onImport = vi.fn().mockResolvedValue(undefined);
      render(<ImportDialog title="Import Tags" columns={editableColumns} onImport={onImport} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,category\nSafety,Equipment');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Safety')).toBeInTheDocument();
      });

      // Double-click to edit
      const editableCell = screen.getByRole('button', { name: /edit name/i });
      await user.dblClick(editableCell);

      // Clear and type new value
      const editInput = screen.getByDisplayValue('Safety');
      await user.clear(editInput);
      await user.type(editInput, 'Hazard{Enter}');

      // Should show the updated value
      await waitFor(() => {
        expect(screen.getByText('Hazard')).toBeInTheDocument();
        expect(screen.queryByText('Safety')).not.toBeInTheDocument();
      });
    });

    it('non-editable columns do NOT show edit button role', async () => {
      const user = userEvent.setup();
      // Use testColumns which have no editable flag
      render(<ImportDialog title="Import Users" columns={testColumns} onImport={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /import/i }));

      const file = createCSVFile('name,email,role\nJohn,john@example.com,admin');
      const input = screen.getByTestId('csv-file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });

      // No editable cell buttons should exist (besides dialog/toolbar buttons)
      expect(screen.queryByRole('button', { name: /edit name/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit email/i })).not.toBeInTheDocument();
    });
  });

  describe('transform', () => {
    it('applies transform during CSV parsing', () => {
      const columns: ImportColumn[] = [
        {
          key: 'role',
          label: 'Role',
          required: true,
          transform: (raw) => raw.toLowerCase(),
        },
        { key: 'name', label: 'Name', required: true },
      ];
      const csv = 'name,role\nAlice,ADMIN';
      const result = parseCSV(csv, columns);
      expect(result.rows[0]?.data.role).toBe('admin');
      expect(result.rows[0]?.data.name).toBe('Alice'); // no transform, unchanged
    });

    it('validates the transformed value, not the raw value', () => {
      const columns: ImportColumn[] = [
        {
          key: 'role',
          label: 'Role',
          required: true,
          transform: (raw) => {
            const map: Record<string, string> = { admin: 'admin', operator: 'operator' };
            return map[raw.toLowerCase()] ?? raw;
          },
          validate: (value) => {
            if (!['admin', 'operator'].includes(value)) return 'Invalid role';
            return null;
          },
        },
      ];
      // "Admin" transforms to "admin" which passes validation
      const csv = 'role\nAdmin';
      const result = parseCSV(csv, columns);
      expect(result.rows[0]?.errors).toHaveLength(0);
      expect(result.rows[0]?.data.role).toBe('admin');
    });

    it('leaves value unchanged when transform returns the original', () => {
      const columns: ImportColumn[] = [
        {
          key: 'site',
          label: 'Site',
          required: false,
          transform: (raw) => {
            const sites: Record<string, string> = { 'miami dc': 'site-1' };
            return sites[raw.toLowerCase()] ?? raw;
          },
          validate: (value) => {
            if (value && value !== 'site-1') return 'Invalid site';
            return null;
          },
        },
      ];
      // Unmatched site name stays as-is, validation flags it
      const csv = 'site\nUnknown Site';
      const result = parseCSV(csv, columns);
      expect(result.rows[0]?.data.site).toBe('Unknown Site');
      expect(result.rows[0]?.errors[0]?.message).toBe('Invalid site');
    });
  });
});
