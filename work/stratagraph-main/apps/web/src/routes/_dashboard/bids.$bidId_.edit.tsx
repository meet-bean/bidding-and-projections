import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent } from '@repo/ui';
import { BidEditor } from '~/components/bid-editor';
import { useStore } from '~/lib/store';

export const Route = createFileRoute('/_dashboard/bids/$bidId_/edit')({
  component: EditBidPage,
});

function EditBidPage() {
  const { bidId } = Route.useParams();
  const navigate = useNavigate();
  const bid = useStore((s) => s.getBid(bidId));

  if (!bid) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/bids' })}>
          <ArrowLeft />
          Back to Bids
        </Button>
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            Bid not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/bids/$bidId"
          params={{ bidId }}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          Back to Bid v{bid.version}
        </Link>
      </div>
      <BidEditor bid={bid} />
    </div>
  );
}
