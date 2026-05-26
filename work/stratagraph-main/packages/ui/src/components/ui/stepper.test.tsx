import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperTitle,
  StepperTrigger,
} from './stepper';

function basicStepper(props?: { defaultValue?: number }) {
  return (
    <Stepper defaultValue={props?.defaultValue ?? 1}>
      <StepperNav>
        {[1, 2, 3].map((step) => (
          <StepperItem key={step} step={step}>
            <StepperTrigger>
              <StepperIndicator>{step}</StepperIndicator>
              <StepperTitle>Step {step}</StepperTitle>
            </StepperTrigger>
          </StepperItem>
        ))}
      </StepperNav>
      <StepperPanel>
        {[1, 2, 3].map((step) => (
          <StepperContent key={step} value={step}>
            Panel {step}
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  );
}

describe('Stepper', () => {
  it('renders triggers with type="button" so clicks do not submit forms', () => {
    render(basicStepper());

    const triggers = screen.getAllByRole('tab');
    expect(triggers).toHaveLength(3);
    for (const trigger of triggers) {
      expect(trigger).toHaveAttribute('type', 'button');
    }
  });

  it('places role="tablist" on StepperNav, not on the outer container', () => {
    const { container } = render(basicStepper());

    const nav = container.querySelector('nav[data-slot="stepper-nav"]');
    expect(nav).toHaveAttribute('role', 'tablist');

    const root = container.querySelector('[data-slot="stepper"]');
    expect(root).not.toHaveAttribute('role', 'tablist');
  });

  it('links each trigger to its panel via aria-controls/aria-labelledby', () => {
    render(basicStepper({ defaultValue: 2 }));

    const trigger = screen.getByRole('tab', { name: /step 2/i });
    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();

    const panel = document.getElementById(panelId!);
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('role', 'tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', trigger.id);
  });

  it('assigns displayName to StepperItem so the children filter can match it', () => {
    expect((StepperItem as { displayName?: string }).displayName).toBe('StepperItem');
  });

  it('generates unique trigger/panel ids across multiple Stepper instances', () => {
    render(
      <>
        {basicStepper()}
        {basicStepper()}
      </>
    );

    const triggers = screen.getAllByRole('tab', { name: /step 1/i });
    expect(triggers).toHaveLength(2);
    const [first, second] = triggers;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.id).not.toBe(second!.id);
    expect(first!.getAttribute('aria-controls')).not.toBe(second!.getAttribute('aria-controls'));
  });
});
