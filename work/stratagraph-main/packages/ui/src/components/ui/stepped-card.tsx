import * as React from 'react';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

interface SteppedCardContextValue {
  activeStep: number | string;
  setActiveStep: (s: number | string) => void;
  steps: Array<number | string>;
  registerStep: (s: number | string) => void;
  unregisterStep: (s: number | string) => void;
}

const SteppedCardContext = React.createContext<SteppedCardContextValue | null>(null);

export interface UseSteppedCardValue {
  activeStep: number | string;
  setActiveStep: (s: number | string) => void;
  steps: Array<number | string>;
  isFirst: boolean;
  isLast: boolean;
  currentIndex: number;
}

export function useSteppedCard(): UseSteppedCardValue {
  const ctx = React.useContext(SteppedCardContext);
  if (!ctx) throw new Error('useSteppedCard must be used inside <SteppedCard>');
  const idx = ctx.steps.indexOf(ctx.activeStep);
  return {
    activeStep: ctx.activeStep,
    setActiveStep: ctx.setActiveStep,
    steps: ctx.steps,
    isFirst: idx === 0,
    isLast: idx >= 0 && idx === ctx.steps.length - 1,
    currentIndex: idx,
  };
}

export interface SteppedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep: number | string;
  onStepChange?: (s: number | string) => void;
  children: React.ReactNode;
}

const SteppedCardRoot = React.forwardRef<HTMLDivElement, SteppedCardProps>(function SteppedCardRoot(
  { activeStep, onStepChange, className, children, ...rest },
  ref
) {
  const [steps, setSteps] = React.useState<Array<number | string>>([]);

  const registerStep = React.useCallback((s: number | string) => {
    setSteps((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }, []);

  const unregisterStep = React.useCallback((s: number | string) => {
    setSteps((prev) => prev.filter((x) => x !== s));
  }, []);

  const setActiveStep = React.useCallback(
    (s: number | string) => {
      onStepChange?.(s);
    },
    [onStepChange]
  );

  const value = React.useMemo<SteppedCardContextValue>(
    () => ({ activeStep, setActiveStep, steps, registerStep, unregisterStep }),
    [activeStep, setActiveStep, steps, registerStep, unregisterStep]
  );

  return (
    <SteppedCardContext.Provider value={value}>
      <Card
        ref={ref}
        data-slot="stepped-card"
        className={cn('w-full max-w-md gap-0 overflow-hidden p-0 shadow-md', className)}
        {...rest}
      >
        {children}
      </Card>
    </SteppedCardContext.Provider>
  );
});

SteppedCardRoot.displayName = 'SteppedCard';

interface StepProps {
  value: number | string;
  children: React.ReactNode;
  className?: string;
}

function Step({ value, children, className }: StepProps) {
  const ctx = React.useContext(SteppedCardContext);
  if (!ctx) throw new Error('SteppedCard.Step must be used inside <SteppedCard>');

  const { registerStep, unregisterStep } = ctx;
  React.useEffect(() => {
    registerStep(value);
    return () => unregisterStep(value);
  }, [value, registerStep, unregisterStep]);

  if (ctx.activeStep !== value) return null;

  return (
    <CardContent
      data-slot="stepped-card-step"
      data-step={value}
      className={cn('flex flex-col gap-6 p-8', className)}
    >
      {children}
    </CardContent>
  );
}

interface HeadingProps {
  children: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

function Heading({ children, description, className }: HeadingProps) {
  return (
    <div data-slot="stepped-card-heading" className={cn('flex flex-col gap-1', className)}>
      <h1 className="text-foreground text-xl font-semibold tracking-tight">{children}</h1>
      {description && <p className="text-muted-foreground text-sm leading-5">{description}</p>}
    </div>
  );
}

interface FooterProps {
  children: React.ReactNode;
  className?: string;
}

function Footer({ children, className }: FooterProps) {
  return (
    <div data-slot="stepped-card-footer" className={cn('flex flex-col gap-2 pt-2', className)}>
      {children}
    </div>
  );
}

export const SteppedCard = Object.assign(SteppedCardRoot, {
  Step,
  Heading,
  Footer,
});
