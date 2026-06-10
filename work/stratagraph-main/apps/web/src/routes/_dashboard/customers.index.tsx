import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button } from '@repo/ui';
import { Plus, Check } from 'lucide-react';
import { useStore } from '~/lib/store';
import {
  DataListShell,
  createColumnHelper,
  DataGridColumnHeader,
} from '~/components/data-list-shell';
import { CustomerDialog } from '~/components/entity-dialogs/customer-dialog';

export const Route = createFileRoute('/_dashboard/customers/')({
  component: CustomersPage,
});

const METHOD_LABEL = {
  email: 'Email',
  mail: 'Mail',
  portal: 'Portal',
  ariba: 'Ariba',
  open_invoice: 'Open Invoice',
} as const;

interface CustomerRow {
  id: string;
  name: string;
  location: string;
  contactName: string;
  invoiceMethod: string;
  invoiceMethodLabel: string;
  msa: 'yes' | 'no';
  w9: 'yes' | 'no';
  ach: 'yes' | 'no';
  salesperson: string;
}

function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCreate = () => {
    setDialogOpen(true);
  };

  const rows: CustomerRow[] = useMemo(
    () =>
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        location: `${c.city}, ${c.state}`,
        contactName: c.contactName,
        invoiceMethod: c.invoiceMethod,
        invoiceMethodLabel: METHOD_LABEL[c.invoiceMethod],
        msa: c.msaOnFile ? 'yes' : 'no',
        w9: c.w9OnFile ? 'yes' : 'no',
        ach: c.achEnabled ? 'yes' : 'no',
        salesperson: c.salesperson,
      })),
    [customers]
  );

  const columnHelper = createColumnHelper<CustomerRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Customer" />,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-medium">{info.getValue()}</div>
              <div className="text-muted-foreground text-xs">{row.location}</div>
            </div>
          );
        },
      }),
      columnHelper.accessor('contactName', {
        id: 'contactName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Billing Contact" />,
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('invoiceMethod', {
        id: 'invoiceMethod',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Invoice Method" />,
        cell: (info) => (
          // Category, not status — plain muted text per the house style.
          <span className="text-muted-foreground text-sm">{info.row.original.invoiceMethodLabel}</span>
        ),
        size: 140,
      }),
      columnHelper.accessor('msa', {
        id: 'msa',
        header: ({ column }) => <DataGridColumnHeader column={column} title="MSA" />,
        cell: (info) =>
          info.getValue() === 'yes' ? (
            <Check className="text-success size-4" aria-label="Yes" />
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
        size: 80,
      }),
      columnHelper.accessor('w9', {
        id: 'w9',
        header: ({ column }) => <DataGridColumnHeader column={column} title="W-9" />,
        cell: (info) =>
          info.getValue() === 'yes' ? (
            <Check className="text-success size-4" aria-label="Yes" />
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
        size: 80,
      }),
      columnHelper.accessor('ach', {
        id: 'ach',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ACH" />,
        cell: (info) =>
          info.getValue() === 'yes' ? (
            <Check className="text-success size-4" aria-label="Yes" />
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
        size: 80,
      }),
      columnHelper.accessor('salesperson', {
        id: 'salesperson',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Sales" />,
        cell: (info) => (
          <span className="text-muted-foreground text-sm">{info.getValue()}</span>
        ),
        size: 100,
      }),
    ],
    [columnHelper]
  );

  return (
    <>
      <DataListShell
        data={rows}
        columns={columns}
        searchPlaceholder="Search by name, contact, salesperson..."
        searchableKeys={['name', 'contactName', 'salesperson', 'location']}
        filters={[
          {
            id: 'invoiceMethod',
            label: 'Invoice Method',
            options: Object.entries(METHOD_LABEL).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ]}
        onRowClick={(row) => navigate({ to: '/customers/$customerId', params: { customerId: row.id } })}
        emptyMessage="No customers match your filters."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            New Customer
          </Button>
        }
      />
      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
