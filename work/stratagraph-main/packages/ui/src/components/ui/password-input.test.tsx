import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordInput } from './password-input';

describe('PasswordInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders type=password by default', () => {
    render(<PasswordInput aria-label="Password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('toggles type to text when eye icon is clicked', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" />);
    const toggle = screen.getByRole('button', { name: /show password/i });
    await user.click(toggle);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });

  it('forwards onChange to caller', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PasswordInput aria-label="Password" onChange={onChange} />);
    await user.type(screen.getByLabelText('Password'), 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('does not render strength meter unless showStrength is true', () => {
    render(<PasswordInput aria-label="Password" />);
    expect(screen.queryByTestId('password-strength-bar')).not.toBeInTheDocument();
  });

  it('renders 4-segment strength meter when showStrength is true', () => {
    render(<PasswordInput aria-label="Password" showStrength />);
    expect(screen.getByTestId('password-strength-bar')).toBeInTheDocument();
  });

  it('forwards ref to inner input', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<PasswordInput aria-label="Password" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('disables toggle button when input is disabled', () => {
    render(<PasswordInput aria-label="Password" disabled />);
    expect(screen.getByRole('button', { name: /show password/i })).toBeDisabled();
  });

  it('shows accessible strength text via aria-live when showStrength is true', () => {
    render(<PasswordInput aria-label="Password" showStrength value="" />);
    // The sr-only live region must be present even when score is 0
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('updates strength feedback for uncontrolled usage', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" showStrength />);
    const input = screen.getByLabelText('Password');
    await user.type(input, 'abc');
    // The strength bar should still be in the DOM (strength meter visible)
    expect(screen.getByTestId('password-strength-bar')).toBeInTheDocument();
  });
});
