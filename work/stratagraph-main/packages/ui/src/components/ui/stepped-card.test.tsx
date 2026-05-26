import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SteppedCard, useSteppedCard } from './stepped-card';

describe('SteppedCard', () => {
  it('renders only the active step', () => {
    render(
      <SteppedCard activeStep={2}>
        <SteppedCard.Step value={1}>step one content</SteppedCard.Step>
        <SteppedCard.Step value={2}>step two content</SteppedCard.Step>
        <SteppedCard.Step value={3}>step three content</SteppedCard.Step>
      </SteppedCard>
    );
    expect(screen.queryByText('step one content')).not.toBeInTheDocument();
    expect(screen.getByText('step two content')).toBeInTheDocument();
    expect(screen.queryByText('step three content')).not.toBeInTheDocument();
  });

  it('renders Heading and Footer when present in active step', () => {
    render(
      <SteppedCard activeStep={1}>
        <SteppedCard.Step value={1}>
          <SteppedCard.Heading>Welcome</SteppedCard.Heading>
          <SteppedCard.Footer>
            <button type="button">Next</button>
          </SteppedCard.Footer>
        </SteppedCard.Step>
      </SteppedCard>
    );
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('exposes useSteppedCard with isFirst/isLast and step ordering', () => {
    function Probe() {
      const { activeStep, isFirst, isLast } = useSteppedCard();
      return (
        <span data-testid="probe">
          {activeStep}|{String(isFirst)}|{String(isLast)}
        </span>
      );
    }
    render(
      <SteppedCard activeStep={2}>
        <SteppedCard.Step value={1}>one</SteppedCard.Step>
        <SteppedCard.Step value={2}>
          <Probe />
        </SteppedCard.Step>
        <SteppedCard.Step value={3}>three</SteppedCard.Step>
      </SteppedCard>
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('2|false|false');
  });

  it('throws when useSteppedCard is called outside SteppedCard', () => {
    function Probe() {
      useSteppedCard();
      return null;
    }
    expect(() => render(<Probe />)).toThrow();
  });

  it('does not expose internal registerStep/unregisterStep from useSteppedCard', () => {
    const results: ReturnType<typeof useSteppedCard>[] = [];
    function Probe() {
      results.push(useSteppedCard());
      return null;
    }
    render(
      <SteppedCard activeStep={1}>
        <SteppedCard.Step value={1}>
          <Probe />
        </SteppedCard.Step>
      </SteppedCard>
    );
    expect(results.length).toBeGreaterThan(0);
    const hookResult = results.at(0);
    if (hookResult === undefined) throw new Error('No hook result captured');
    expect('registerStep' in hookResult).toBe(false);
    expect('unregisterStep' in hookResult).toBe(false);
  });

  it('reports isFirst=false when activeStep is not registered', () => {
    function Probe() {
      const { isFirst, isLast, currentIndex } = useSteppedCard();
      return (
        <span data-testid="probe">
          {String(isFirst)}|{String(isLast)}|{currentIndex}
        </span>
      );
    }
    render(
      <SteppedCard activeStep="missing">
        <Probe />
      </SteppedCard>
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('false|false|-1');
  });

  describe('className composition on sub-components', () => {
    it('SteppedCard.Step merges custom className with its defaults', () => {
      const { container } = render(
        <SteppedCard activeStep={1}>
          <SteppedCard.Step value={1} className="custom-step">
            content
          </SteppedCard.Step>
        </SteppedCard>
      );
      const step = container.querySelector('[data-slot="stepped-card-step"]');
      expect(step).not.toBeNull();
      expect(step).toHaveClass('custom-step');
      // Default class must still be present
      expect(step).toHaveClass('flex');
    });

    it('SteppedCard.Heading merges custom className with its defaults', () => {
      const { container } = render(
        <SteppedCard activeStep={1}>
          <SteppedCard.Step value={1}>
            <SteppedCard.Heading className="custom-heading">Title</SteppedCard.Heading>
          </SteppedCard.Step>
        </SteppedCard>
      );
      const heading = container.querySelector('[data-slot="stepped-card-heading"]');
      expect(heading).not.toBeNull();
      expect(heading).toHaveClass('custom-heading');
      // Default class must still be present
      expect(heading).toHaveClass('flex');
    });

    it('SteppedCard.Footer merges custom className with its defaults', () => {
      const { container } = render(
        <SteppedCard activeStep={1}>
          <SteppedCard.Step value={1}>
            <SteppedCard.Footer className="custom-footer">
              <button type="button">Next</button>
            </SteppedCard.Footer>
          </SteppedCard.Step>
        </SteppedCard>
      );
      const footer = container.querySelector('[data-slot="stepped-card-footer"]');
      expect(footer).not.toBeNull();
      expect(footer).toHaveClass('custom-footer');
      // Default class must still be present
      expect(footer).toHaveClass('flex');
    });
  });
});
