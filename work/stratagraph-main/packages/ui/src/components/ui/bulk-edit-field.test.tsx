/**
 * BulkEditField component tests.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BulkEditField } from './bulk-edit-field';

describe('BulkEditField', () => {
  it('renders the label', () => {
    render(
      <BulkEditField label="Status" aligned>
        <input type="text" />
      </BulkEditField>
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders children (the form control)', () => {
    render(
      <BulkEditField label="Name" aligned>
        <input type="text" aria-label="Name input" />
      </BulkEditField>
    );

    expect(screen.getByRole('textbox', { name: 'Name input' })).toBeInTheDocument();
  });

  it('does not show warning when aligned=true', () => {
    render(
      <BulkEditField label="Status" aligned>
        <input type="text" />
      </BulkEditField>
    );

    expect(
      screen.queryByText('Selected items have different values. Saving will replace all.')
    ).not.toBeInTheDocument();
  });

  it('shows warning with alert icon when aligned=false', () => {
    render(
      <BulkEditField label="Status" aligned={false}>
        <input type="text" />
      </BulkEditField>
    );

    expect(
      screen.getByText('Selected items have different values. Saving will replace all.')
    ).toBeInTheDocument();

    // Verify the AlertTriangleIcon is present (rendered as an SVG)
    const warning = screen.getByRole('status');
    const svg = warning.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders label above the field', () => {
    const { container } = render(
      <BulkEditField label="Priority" aligned>
        <input type="text" data-testid="field-input" />
      </BulkEditField>
    );

    const label = container.querySelector('[data-slot="bulk-edit-field-label"]');
    const fieldInput = screen.getByTestId('field-input');

    expect(label).toBeInTheDocument();
    // Label should appear before the input in DOM order
    expect(label!.compareDocumentPosition(fieldInput)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders warning between label and field when aligned=false', () => {
    render(
      <BulkEditField label="Priority" aligned={false}>
        <input type="text" data-testid="field-input" />
      </BulkEditField>
    );

    const warning = screen.getByText(
      'Selected items have different values. Saving will replace all.'
    );
    const fieldInput = screen.getByTestId('field-input');

    // Warning should appear before the field input in DOM order
    expect(warning.compareDocumentPosition(fieldInput)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('warning has accessible role', () => {
    render(
      <BulkEditField label="Status" aligned={false}>
        <input type="text" />
      </BulkEditField>
    );

    // Warning should be accessible as an alert or status region
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('associates label with the field group via aria-labelledby', () => {
    render(
      <BulkEditField label="Status" aligned>
        <input type="text" />
      </BulkEditField>
    );

    const group = screen.getByRole('group', { name: 'Status' });
    expect(group).toBeInTheDocument();
  });

  it('does not render status node when aligned=true', () => {
    render(
      <BulkEditField label="Status" aligned>
        <input type="text" />
      </BulkEditField>
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('applies data-slot attribute to root element', () => {
    const { container } = render(
      <BulkEditField label="Status" aligned>
        <input type="text" />
      </BulkEditField>
    );

    const root = container.firstElementChild;
    expect(root).toHaveAttribute('data-slot', 'bulk-edit-field');
  });

  it('applies custom className to root element', () => {
    const { container } = render(
      <BulkEditField label="Status" aligned className="custom-class">
        <input type="text" />
      </BulkEditField>
    );

    const root = container.firstElementChild;
    expect(root).toHaveClass('custom-class');
  });
});
