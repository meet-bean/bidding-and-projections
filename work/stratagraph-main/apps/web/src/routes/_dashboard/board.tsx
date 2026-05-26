import { createFileRoute, redirect } from '@tanstack/react-router';

// /board was promoted onto /jobs; this route now just redirects.
export const Route = createFileRoute('/_dashboard/board')({
  beforeLoad: () => {
    throw redirect({ to: '/jobs' });
  },
});
