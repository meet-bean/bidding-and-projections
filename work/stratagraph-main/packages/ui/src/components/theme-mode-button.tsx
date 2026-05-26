/**
 * ThemeModeButton - Theme toggle component with multiple display variants.
 *
 * A base UI component that accepts theme state as props for flexibility.
 * Use the app-specific wrapper that connects to theme context.
 *
 * Features:
 * - variant="icon": Icon-only toggle button (default)
 * - variant="label": Icon with label text
 * - variant="select": Dropdown with Light/Dark/System options
 * - buttonVariant: Style the button (ghost, outline, default, etc.)
 *
 * @see Issue #207: P16-012: Create ThemeModeButton component
 */

import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
type Align = 'start' | 'center' | 'end';

export interface ThemeModeButtonProps extends ButtonProps {
  alignMenu?: Align | undefined;
  /** Current theme setting */
  theme: Theme;
  /** Resolved theme after applying system preference */
  resolvedTheme: ResolvedTheme;
  /** Callback to change theme */
  setTheme?: (theme: Theme) => void;
  /** Display variant */
  show?: 'default' | 'icon' | 'label';
  /** select or toggle */
  select?: boolean;
}

/**
 * Theme mode button component.
 * Provides icon, label, or select variants for theme switching.
 */
export function ThemeModeButton({
  theme,
  resolvedTheme,
  setTheme,
  onClick,
  show = 'default',
  select = false,
  size,
  ...props
}: ThemeModeButtonProps) {
  if (select) {
    return (
      <ThemeModeSelect
        theme={theme}
        resolvedTheme={resolvedTheme}
        setTheme={setTheme}
        show={show}
        size={size}
        {...props}
      />
    );
  }

  const Icon = resolvedTheme === 'dark' ? Sun : Moon;
  const label = resolvedTheme === 'dark' ? 'Light' : 'Dark';
  return (
    <Button
      size={resolveSize(size, show)}
      onClick={(event) => (
        setTheme?.(resolvedTheme === 'dark' ? 'light' : 'dark'),
        onClick?.(event)
      )}
      aria-label="Toggle theme"
      type="button"
      {...props}
    >
      {show !== 'label' && <Icon className="h-4 w-4" />}
      {show !== 'icon' && <span>{label}</span>}
    </Button>
  );
}

function resolveSize(
  size?: ButtonProps['size'],
  show?: ThemeModeButtonProps['show']
): ButtonProps['size'] {
  const value = size || 'default';
  if (show === 'icon') {
    switch (value) {
      case 'xs':
      case 'sm':
      case 'lg':
        return `icon-${value}`;

      case 'default':
        return 'icon';
    }
  }
  return value;
}

/**
 * Theme mode select dropdown variant.
 */
function ThemeModeSelect({
  alignMenu = 'start',
  theme,
  resolvedTheme,
  setTheme,
  show,
  ...props
}: Omit<ThemeModeButtonProps, 'select'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ThemeModeButton
          theme={theme}
          resolvedTheme={resolvedTheme}
          aria-label="Select theme"
          show={show}
          {...props}
          setTheme={undefined}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={alignMenu}>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme?.(option.value)}
            data-selected={theme === option.value ? '' : undefined}
          >
            {show !== 'label' && <option.icon className="mr-2 h-4 w-4" />}
            {show !== 'icon' && <span>{option.label}</span>}
            {theme === option.value && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const options = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
];
