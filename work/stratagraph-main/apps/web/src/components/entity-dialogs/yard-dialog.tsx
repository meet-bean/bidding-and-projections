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
  Textarea,
} from '@repo/ui';
import { useStore, REGION_LABELS, TENANT_REGIONS } from '~/lib/store';
import type { Region, Yard } from '~/lib/types';

interface YardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yard?: Yard;
}

const EMPTY: Omit<Yard, 'id'> = {
  name: '',
  city: '',
  state: '',
  region: 'W_TEX',
  isActive: true,
  closingDate: '',
  notes: '',
};

export function YardDialog({ open, onOpenChange, yard }: YardDialogProps) {
  const createYard = useStore((s) => s.createYard);
  const updateYard = useStore((s) => s.updateYard);
  const tenantId = useStore((s) => s.tenantId);
  const isEdit = !!yard;
  const [form, setForm] = useState<Omit<Yard, 'id'>>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (yard) {
      const { id: _id, ...rest } = yard;
      setForm({ closingDate: '', notes: '', ...rest });
    } else {
      setForm(EMPTY);
    }
  }, [open, yard]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload: Omit<Yard, 'id'> = {
      ...form,
      closingDate: form.closingDate || undefined,
      notes: form.notes || undefined,
    };
    if (isEdit && yard) {
      updateYard(yard.id, payload);
    } else {
      createYard(payload);
    }
    onOpenChange(false);
  }

  function field<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Yard' : 'New Yard'}</DialogTitle>
            <DialogDescription>
              Field office where equipment stages and mileage bills from.
            </DialogDescription>
          </DialogHeader>

          <FieldRow label="Yard Name" required>
            <Input
              value={form.name}
              onChange={(e) => field('name', e.target.value)}
              placeholder="Midland"
            />
          </FieldRow>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldRow label="City">
              <Input
                value={form.city}
                onChange={(e) => field('city', e.target.value)}
                placeholder="Midland"
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
            <FieldRow label="Region">
              <Select value={form.region} onValueChange={(v) => field('region', v as Region)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(TENANT_REGIONS[tenantId] ?? TENANT_REGIONS.stratagraph).map((v) => (
                    <SelectItem key={v} value={v}>
                      {REGION_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
              <div>
                <div className="text-sm font-medium">Active</div>
                <div className="text-muted-foreground text-xs">
                  Inactive yards are hidden from job creation.
                </div>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => field('isActive', v)} />
            </div>
            <FieldRow label="Closing Date">
              <Input
                type="date"
                value={form.closingDate ?? ''}
                onChange={(e) => field('closingDate', e.target.value)}
              />
            </FieldRow>
          </div>

          <FieldRow label="Notes">
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => field('notes', e.target.value)}
              placeholder="Flagged for closure — relocating equipment to Midland."
              rows={2}
            />
          </FieldRow>

          <DialogFooter className="gap-2">
            {isEdit ? (
              <Badge variant="outline" className="mr-auto self-center font-mono text-[10px]">
                {yard.id}
              </Badge>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Save changes' : 'Create Yard'}</Button>
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
