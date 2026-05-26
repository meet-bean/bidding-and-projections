import { useHydrated } from '@/hooks/use-hydrated';
import type { ReactNode } from 'react';

export interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  return useHydrated() ? <>{children}</> : <>{fallback}</>;
}
