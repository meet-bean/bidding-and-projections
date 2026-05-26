/**
 * Popover component tests.
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
import { Popover, PopoverTrigger, PopoverContent } from './popover';

describe('Popover', () => {
  describe('Custom className', () => {
    it('PopoverContent accepts custom className', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent className="custom-class" data-testid="content">
            Content
          </PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-class');
    });
  });

  describe('Styling', () => {
    it('PopoverContent has animation classes', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent data-testid="content">Content</PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('data-open:animate-in');
    });

    it('PopoverContent has popover background', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent data-testid="content">Content</PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('bg-popover');
    });

    it('PopoverContent has rounded styling', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent data-testid="content">Content</PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('rounded-md');
    });

    it('PopoverContent has shadow', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent data-testid="content">Content</PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('shadow-md');
    });

    it('PopoverContent has close animation', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent data-testid="content">Content</PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('data-closed:animate-out');
    });

    it('PopoverContent has default width', () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent data-testid="content">Content</PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('w-72');
    });
  });
});
