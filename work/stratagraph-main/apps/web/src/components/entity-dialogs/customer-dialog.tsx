import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@repo/ui';
import { useStore } from '~/lib/store';
import type { Customer } from '~/lib/types';

const METHOD_LABEL = {
  email: 'Email',
  mail: 'Mail',
  portal: 'Portal',
  ariba: 'Ariba',
  open_invoice: 'Open Invoice',
} as const;

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer; // when set → edit mode; otherwise create
}

const EMPTY: Omit<Customer, 'id'> = {
  name: '',
  billingAddress: '',
  city: '',
  state: '',
  zip: '',
  contactName: '',
  contactTitle: '',
  invoiceMethod: 'email',
  msaOnFile: false,
  w9OnFile: false,
  achEnabled: false,
  salesperson: '',
};

export function CustomerDialog({ open, onOpenChange, customer }: CustomerDialogProps) {
  const createCustomer = useStore((s) => s.createCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const isEdit = !!customer;
  const [form, setForm] = useState<Omit<Customer, 'id'>>(EMPTY);

  // Re-seed form when the dialog opens or the customer changes
  useEffect(() => {
    if (!open) return;
    if (customer) {
      const { id: _id, ...rest } = customer;
      setForm(rest);
    } else {
      setForm(EMPTY);
    }
  }, [open, customer]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (isEdit && customer) {
      updateCustomer(customer.id, form);
    } else {
      createCustomer(form);
    }
    onOpenChange(false);
  }

  function field<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Customer' : 'New Customer'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update customer master data, billing setup, and sales attribution.'
                : 'A new customer record. Required before you can create bids and jobs.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => field('name', e.target.value)}
                placeholder="Apex Energy"
              />
            </FieldRow>
            <FieldRow label="Salesperson">
              <Input
                value={form.salesperson}
                onChange={(e) => field('salesperson', e.target.value)}
                placeholder="AV"
              />
            </FieldRow>
          </div>

          <FieldRow label="Billing Address">
            <Input
              value={form.billingAddress}
              onChange={(e) => field('billingAddress', e.target.value)}
              placeholder="5400 Lyndon B Johnson Fwy, Ste 1500"
            />
          </FieldRow>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldRow label="City">
              <Input
                value={form.city}
                onChange={(e) => field('city', e.target.value)}
                placeholder="Dallas"
              />
            </FieldRow>
            <FieldRow label="State">
              <Input
                value={form.state}
                onChange={(e) => field('state', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="TX"
                maxLength={2}
              />
            </FieldRow>
            <FieldRow label="ZIP">
              <Input
                value={form.zip}
                onChange={(e) => field('zip', e.target.value)}
                placeholder="75240"
              />
            </FieldRow>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Billing Contact Name">
              <Input
                value={form.contactName}
                onChange={(e) => field('contactName', e.target.value)}
                placeholder="Braden Hrencher"
              />
            </FieldRow>
            <FieldRow label="Contact Title">
              <Input
                value={form.contactTitle ?? ''}
                onChange={(e) => field('contactTitle', e.target.value)}
                placeholder="Drilling Engineer"
              />
            </FieldRow>
          </div>

          <FieldRow label="Invoice Method">
            <Select
              value={form.invoiceMethod}
              onValueChange={(v) => field('invoiceMethod', v as Customer['invoiceMethod'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(METHOD_LABEL) as [Customer['invoiceMethod'], string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </FieldRow>

          <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
            <ToggleRow
              label="MSA on File"
              checked={form.msaOnFile}
              onChange={(v) => field('msaOnFile', v)}
            />
            <ToggleRow
              label="W-9 on File"
              checked={form.w9OnFile}
              onChange={(v) => field('w9OnFile', v)}
            />
            <ToggleRow
              label="ACH Enabled"
              checked={form.achEnabled}
              onChange={(v) => field('achEnabled', v)}
            />
          </div>

          <DialogFooter className="gap-2">
            {isEdit ? (
              <Badge variant="outline" className="mr-auto self-center font-mono text-[10px]">
                {customer.id}
              </Badge>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Save changes' : 'Create Customer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs uppercase tracking-wider">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
