import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { BidEditor } from '~/components/bid-editor';

const searchSchema = z.object({
  customerId: z.string().optional(),
});

export const Route = createFileRoute('/_dashboard/bids/new')({
  validateSearch: searchSchema,
  component: NewBidPage,
});

function NewBidPage() {
  const { customerId } = Route.useSearch();
  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/bids"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          Back to Bids
        </Link>
      </div>
      <BidEditor lockedCustomerId={customerId} />
    </div>
  );
}
