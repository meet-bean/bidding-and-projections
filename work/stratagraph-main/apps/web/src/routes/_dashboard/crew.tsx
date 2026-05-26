import { createFileRoute, redirect } from '@tanstack/react-router';

// /crew was merged into the unified /users surface (field_crew role).
// Kept as a redirect so the seed-data screenshots and any external links resolve.
export const Route = createFileRoute('/_dashboard/crew')({
  beforeLoad: () => {
    throw redirect({ to: '/users' });
  },
});
