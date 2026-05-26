import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { inputVariants } from './input';

export interface PasswordInputProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'type'> {
  showStrength?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength, value, onChange, disabled, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
      typeof props.defaultValue === 'string' ? props.defaultValue : ''
    );
    const stringValue = typeof value === 'string' ? value : uncontrolledValue;

    return (
      <div data-slot="password-input" className="flex flex-col gap-1.5">
        <div className="relative">
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            value={value}
            data-slot="input"
            className={cn(inputVariants(), 'pr-9', className)}
            disabled={disabled}
            onChange={(event) => {
              if (value === undefined) setUncontrolledValue(event.currentTarget.value);
              onChange?.(event);
            }}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground absolute inset-y-0 right-1 my-auto"
            disabled={disabled}
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        {showStrength && <PasswordStrengthBar value={stringValue} />}
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Strong'] as const;

function PasswordStrengthBar({ value }: { value: string }) {
  const score = usePasswordScore(value);
  const label = STRENGTH_LABELS[Math.max(0, Math.min(score, 3))];
  return (
    <div>
      <p role="status" className="sr-only" aria-live="polite">
        Password strength: {label}
      </p>
      <div data-testid="password-strength-bar" className="flex h-1 gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn('flex-1 rounded-sm', i < score ? scoreColor(score) : 'bg-muted')}
          />
        ))}
      </div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 3) return 'bg-success';
  if (score === 2) return 'bg-warning';
  return 'bg-destructive';
}

function usePasswordScore(value: string): number {
  const [score, setScore] = React.useState(0);
  React.useEffect(() => {
    let cancelled = false;
    if (!value) {
      setScore(0);
      return;
    }
    void (async () => {
      try {
        const [{ zxcvbn, zxcvbnOptions }, common, en] = await Promise.all([
          import('@zxcvbn-ts/core'),
          import('@zxcvbn-ts/language-common'),
          import('@zxcvbn-ts/language-en'),
        ]);
        zxcvbnOptions.setOptions({
          translations: en.translations,
          graphs: common.adjacencyGraphs,
          dictionary: { ...common.dictionary, ...en.dictionary },
        });
        const result = zxcvbn(value);
        if (!cancelled) setScore(result.score);
      } catch (err) {
        console.error('[PasswordInput] Failed to load strength library:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);
  return score;
}
