import { CheckIcon, LoaderCircleIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Stepper,
  StepperNav,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperSeparator,
  StepperPanel,
  StepperContent,
  type StepperProps,
} from '@/components/ui/stepper';
import { cn } from '@/lib/utils';

export type Step =
  | string
  | {
      title: string;
      content?: ReactNode;
      loading?: boolean;
      disabled?: boolean;
    };

export interface StepsInlineProps extends StepperProps {
  steps: Step[];
}

function getStepContent(step: Step): ReactNode | undefined {
  return typeof step === 'string' ? undefined : step.content;
}
function getStepTitle(step: Step): string {
  return typeof step === 'string' ? step : step.title;
}
function getStepLoading(step: Step): boolean {
  return typeof step === 'string' ? false : step.loading === true;
}
function getStepDisabled(step: Step): boolean {
  return typeof step === 'string' ? false : step.disabled === true;
}

export function StepsInline({ className, indicators, steps, ...props }: StepsInlineProps) {
  const hasContent = steps.some((step) => getStepContent(step) !== undefined);

  return (
    <Stepper
      indicators={
        indicators ?? {
          completed: <CheckIcon className="size-3.5" />,
          loading: <LoaderCircleIcon className="size-3.5 animate-spin" />,
        }
      }
      className={cn('w-full max-w-md space-y-8', className)}
      {...props}
    >
      <StepperNav>
        {steps.map((step, index) => (
          <StepperItem
            key={index}
            step={index + 1}
            loading={getStepLoading(step)}
            disabled={getStepDisabled(step)}
            className="relative"
          >
            <StepperTrigger className="flex justify-start gap-1.5">
              <StepperIndicator>{index + 1}</StepperIndicator>
              <StepperTitle>{getStepTitle(step)}</StepperTitle>
            </StepperTrigger>
            {steps.length > index + 1 && (
              <StepperSeparator className="group-data-[state=completed]/step:bg-primary md:mx-2.5" />
            )}
          </StepperItem>
        ))}
      </StepperNav>
      {hasContent && (
        <StepperPanel className="text-sm">
          {steps.map(
            (step, index) =>
              getStepContent(step) && (
                <StepperContent
                  key={index}
                  value={index + 1}
                  className="flex items-center justify-center"
                >
                  {getStepContent(step)}
                </StepperContent>
              )
          )}
        </StepperPanel>
      )}
    </Stepper>
  );
}
