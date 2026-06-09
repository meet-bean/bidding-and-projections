'use client';

// TEMPORARY debugging aid — surfaces render crashes (e.g. the reported
// vista-dump upload crash) with the full stack instead of a white screen,
// and logs them to the console. Remove once the crash is diagnosed.

import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * TanStack Router `errorComponent` — catches render crashes for an entire
 * route (including dialogs like the upload flow) and prints the full stack.
 */
export function DebugRouteError({ error }: { error: Error }) {
  // eslint-disable-next-line no-console
  console.error('[DebugRouteError] route render crash:', error);
  return (
    <div className="m-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="mb-2 font-semibold text-destructive">💥 Route render crash caught</p>
      <p className="mb-1 font-mono text-destructive">
        {error.name}: {error.message}
      </p>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 font-mono text-xs text-muted-foreground">
        {error.stack}
      </pre>
    </div>
  );
}

interface Props {
  label?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

export class DebugErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(
      `[DebugErrorBoundary${this.props.label ? ` · ${this.props.label}` : ''}] render crash:`,
      error,
      '\nComponent stack:',
      info.componentStack,
    );
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="m-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="mb-2 font-semibold text-destructive">
          💥 Render crash caught{this.props.label ? ` in ${this.props.label}` : ''}
        </p>
        <p className="mb-1 font-mono text-destructive">
          {error.name}: {error.message}
        </p>
        <pre className="mb-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 font-mono text-xs text-muted-foreground">
          {error.stack}
        </pre>
        {componentStack && (
          <>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Component stack:</p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 font-mono text-xs text-muted-foreground">
              {componentStack}
            </pre>
          </>
        )}
      </div>
    );
  }
}
