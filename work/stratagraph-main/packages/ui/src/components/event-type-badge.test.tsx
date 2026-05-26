import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventTypeBadge } from './event-type-badge';

describe('EventTypeBadge', () => {
  it('renders category and action text', () => {
    render(<EventTypeBadge type="site.created" />);
    expect(screen.getByText('Site')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('renders category as bold', () => {
    render(<EventTypeBadge type="user.created" />);
    const categorySpan = screen.getByText('User');
    expect(categorySpan.className).toContain('font-bold');
  });

  it('applies event-created class for *.created events', () => {
    const { container } = render(<EventTypeBadge type="user.created" />);
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain('event-created');
  });

  it('applies event-deleted class for *.deleted events', () => {
    const { container } = render(<EventTypeBadge type="site.deleted" />);
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain('event-deleted');
  });

  it('applies event-updated class for *.updated events', () => {
    const { container } = render(<EventTypeBadge type="tag.updated" />);
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain('event-updated');
  });

  it('applies event-workflow class for workflow events', () => {
    const { container } = render(<EventTypeBadge type="procedure.submitted_for_review" />);
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain('event-workflow');
    expect(screen.getByText('Submitted For Review')).toBeInTheDocument();
  });

  it('applies event-assignment class for assignment events', () => {
    const { container } = render(<EventTypeBadge type="task.assigned" />);
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain('event-assignment');
  });

  it('applies event-default class for unknown events', () => {
    const { container } = render(<EventTypeBadge type="unknown.event" />);
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain('event-default');
  });

  it('renders vertical divider between category and action', () => {
    const { container } = render(<EventTypeBadge type="user.deleted" />);
    const divider = container.querySelector('.bg-current.opacity-25');
    expect(divider).toBeInTheDocument();
  });

  it('renders multi-segment category label correctly', () => {
    render(<EventTypeBadge type="procedure_series.created" />);
    expect(screen.getByText('Procedure Series')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('handles type without dot', () => {
    render(<EventTypeBadge type="custom" />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});
