import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Optional function to reset the error boundary and retry */
  reset?: () => void;
  /** Whether to show error details (typically in development) */
  showDetails?: boolean;
  /** Optional callback to navigate back */
  onNavigateBack?: () => void;
  /** Custom title for the error card (default: "Something went wrong") */
  title?: string;
  /** Custom description message (default: "An unexpected error occurred...") */
  description?: string;
}

/**
 * Fallback UI to display when a component crashes.
 * Can be used with TanStack Router's errorComponent or react-error-boundary.
 */
export function ErrorFallback({
  error,
  reset,
  showDetails = false,
  onNavigateBack,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again or reload the page.',
}: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <AlertCircle className="text-destructive h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">{title}</h2>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">{description}</p>
          {showDetails && error.message && (
            <pre className="bg-muted text-muted-foreground mt-4 max-h-32 overflow-auto rounded-md p-3 text-left text-xs">
              {error.message}
            </pre>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          {onNavigateBack && (
            <Button variant="outline" onClick={onNavigateBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go back
            </Button>
          )}
          {reset && (
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}
          <Button onClick={handleReload}>Reload page</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
