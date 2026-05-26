/**
 * HoverCard component tests.
 *
 * @see Issue #186: P14 UI fixes and components review
 *
 * Tests verify:
 * - All component parts are exported
 * - Custom className can be applied
 * - Animation classes are present
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';

describe('HoverCard', () => {
  describe('Custom className', () => {
    it('HoverCardContent accepts custom className', () => {
      render(
        <HoverCard defaultOpen>
          <HoverCardTrigger>Trigger</HoverCardTrigger>
          <HoverCardContent className="custom-class" data-testid="content">
            Content
          </HoverCardContent>
        </HoverCard>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-class');
    });
  });

  describe('Styling', () => {
    it('HoverCardContent has animation classes', () => {
      render(
        <HoverCard defaultOpen>
          <HoverCardTrigger>Trigger</HoverCardTrigger>
          <HoverCardContent data-testid="content">Content</HoverCardContent>
        </HoverCard>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('data-open:animate-in');
    });

    it('HoverCardContent has popover background', () => {
      render(
        <HoverCard defaultOpen>
          <HoverCardTrigger>Trigger</HoverCardTrigger>
          <HoverCardContent data-testid="content">Content</HoverCardContent>
        </HoverCard>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('bg-popover');
    });

    it('HoverCardContent has rounded styling', () => {
      render(
        <HoverCard defaultOpen>
          <HoverCardTrigger>Trigger</HoverCardTrigger>
          <HoverCardContent data-testid="content">Content</HoverCardContent>
        </HoverCard>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('rounded-lg');
    });

    it('HoverCardContent has shadow', () => {
      render(
        <HoverCard defaultOpen>
          <HoverCardTrigger>Trigger</HoverCardTrigger>
          <HoverCardContent data-testid="content">Content</HoverCardContent>
        </HoverCard>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('shadow-md');
    });

    it('HoverCardContent has close animation', () => {
      render(
        <HoverCard defaultOpen>
          <HoverCardTrigger>Trigger</HoverCardTrigger>
          <HoverCardContent data-testid="content">Content</HoverCardContent>
        </HoverCard>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('data-closed:animate-out');
    });

    it('HoverCardContent has default width', () => {
      render(
        <HoverCard defaultOpen>
          <HoverCardTrigger>Trigger</HoverCardTrigger>
          <HoverCardContent data-testid="content">Content</HoverCardContent>
        </HoverCard>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('w-64');
    });
  });
});
