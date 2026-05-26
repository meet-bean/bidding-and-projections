/**
 * Tests for PasswordInput resilience when the zxcvbn dynamic imports fail.
 * Kept in a separate file so vi.mock applies only to this module.
 */
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Make all three zxcvbn packages reject so the Promise.all inside
// usePasswordScore will throw — exercising the try/catch guard.
vi.mock('@zxcvbn-ts/core', () => {
  throw new Error('Simulated network failure: @zxcvbn-ts/core');
});
vi.mock('@zxcvbn-ts/language-common', () => {
  throw new Error('Simulated network failure: @zxcvbn-ts/language-common');
});
vi.mock('@zxcvbn-ts/language-en', () => {
  throw new Error('Simulated network failure: @zxcvbn-ts/language-en');
});

// Import AFTER vi.mock so the mocks are active when the module resolves
const { PasswordInput } = await import('./password-input');

describe('PasswordInput — zxcvbn load failure resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('remains functional when zxcvbn imports fail', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" showStrength />);

    const input = screen.getByLabelText('Password');
    await user.type(input, 'secret123');
    // Input must stay operable
    expect(input).toHaveValue('secret123');
    // Strength bar must still be rendered (score stays at 0)
    expect(screen.getByTestId('password-strength-bar')).toBeInTheDocument();
  });

  it('does not propagate unhandled rejection when zxcvbn fails to load', async () => {
    const unhandledRejection = vi.fn();
    window.addEventListener('unhandledrejection', unhandledRejection);

    try {
      const user = userEvent.setup();
      render(<PasswordInput aria-label="Password" showStrength />);
      await user.type(screen.getByLabelText('Password'), 'abc');

      // Let microtasks settle so any escaped rejection would fire
      await act(async () => {
        await new Promise<void>((r) => setTimeout(r, 50));
      });

      expect(unhandledRejection).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('unhandledrejection', unhandledRejection);
    }
  });
});
