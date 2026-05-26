/**
 * VersionBadge component tests.
 *
 * @see MEE-1415: Procedure Detail Header Shows Duplicate "Draft" Status Badge
 *
 * Tests verify:
 * - Renders version number as "vN" for published procedures
 * - Renders nothing when version is null and renderAsDraft is false
 * - Renders "Draft" when version is null and renderAsDraft is true (backwards compat)
 * - Defaults renderAsDraft to true for backwards compatibility
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionBadge } from './version-badge';

describe('VersionBadge', () => {
  it('renders version number for published procedures', () => {
    render(<VersionBadge version={3} data-testid="badge" />);
    expect(screen.getByText('v3')).toBeInTheDocument();
  });

  it('renders "Draft" when version is null and renderAsDraft is true', () => {
    render(<VersionBadge version={null} renderAsDraft={true} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders nothing when version is null and renderAsDraft is false', () => {
    const { container } = render(<VersionBadge version={null} renderAsDraft={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('defaults renderAsDraft to true for backwards compatibility', () => {
    render(<VersionBadge version={null} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders version 1 as "v1"', () => {
    render(<VersionBadge version={1} />);
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('renders version when renderAsDraft is false and version is set', () => {
    render(<VersionBadge version={2} renderAsDraft={false} />);
    expect(screen.getByText('v2')).toBeInTheDocument();
  });
});
