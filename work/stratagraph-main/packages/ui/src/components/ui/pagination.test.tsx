/**
 * Pagination component tests.
 *
 * @see Issue #182: P14-022: Add Pagination component
 *
 * Tests verify:
 * - All components are exported
 * - Renders correctly
 * - Proper styling
 * - Accessible navigation landmarks
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './pagination';

describe('Pagination', () => {
  describe('Accessibility - Issue #182', () => {
    it('Pagination has navigation role with aria-label', () => {
      render(
        <Pagination data-testid="pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );

      const nav = screen.getByTestId('pagination');
      expect(nav).toHaveAttribute('role', 'navigation');
      expect(nav).toHaveAttribute('aria-label', 'pagination');
    });

    it('PaginationLink can indicate current page with aria-current', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#" isActive data-testid="active-link">
                1
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );

      const link = screen.getByTestId('active-link');
      expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('PaginationEllipsis has screen reader text', () => {
      render(<PaginationEllipsis data-testid="ellipsis" />);

      expect(screen.getByText('More pages')).toBeInTheDocument();
    });
  });

  describe('PaginationContent styling', () => {
    it('has flex layout for page items', () => {
      render(
        <PaginationContent data-testid="content">
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('flex');
    });

    it('has gap between items', () => {
      render(
        <PaginationContent data-testid="content">
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('gap-1');
    });
  });

  describe('PaginationLink styling - Issue #182', () => {
    it('has icon size by default', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#" data-testid="link">
                1
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );

      const link = screen.getByTestId('link');
      // Icon size button has size-9
      expect(link).toHaveClass('size-9');
    });

    it('highlights current page visually when isActive', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="#" isActive data-testid="link">
                1
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );

      const link = screen.getByTestId('link');
      expect(link).toHaveAttribute('data-active', 'true');
    });
  });

  describe('PaginationPrevious/Next', () => {
    it('PaginationPrevious has chevron icon indicator', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" data-testid="prev" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );

      const prev = screen.getByTestId('prev');
      expect(prev).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    it('PaginationNext has chevron icon indicator', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationNext href="#" data-testid="next" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );

      const next = screen.getByTestId('next');
      expect(next).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('PaginationPrevious has aria-label', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" data-testid="prev" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );

      const prev = screen.getByTestId('prev');
      expect(prev).toHaveAttribute('aria-label', 'Go to previous page');
    });

    it('PaginationNext has aria-label', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationNext href="#" data-testid="next" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );

      const next = screen.getByTestId('next');
      expect(next).toHaveAttribute('aria-label', 'Go to next page');
    });
  });

  describe('PaginationEllipsis', () => {
    it('has flex layout for centering', () => {
      render(<PaginationEllipsis data-testid="ellipsis" />);

      const ellipsis = screen.getByTestId('ellipsis');
      expect(ellipsis).toHaveClass('flex');
    });

    it('has size matching other pagination items', () => {
      render(<PaginationEllipsis data-testid="ellipsis" />);

      const ellipsis = screen.getByTestId('ellipsis');
      expect(ellipsis).toHaveClass('size-9');
    });
  });
});
