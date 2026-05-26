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
  Textarea,
} from '@repo/ui';
import { useStore, REGION_LABELS, UNIT_STATUS_LABELS, TENANT_REGIONS } from '~/lib/store';
import type { Region, Unit, UnitStatus } from '~/lib/types';

const UNIT_TYPE_OPTIONS: Record<string, { value: Unit['type']; label: string }[]> = {
  stratagraph: [
    { value: 'logging', label: 'Logging' },
    { value: 'analytical', label: 'Analytical' },
    { value: 'mass_spec', label: 'Mass Spec' },
    { value: 'gas_monitor', label: 'Gas Monitor' },
  ],
  superior: [
    { value: 'earthwork', label: 'Earthwork' },
    { value: 'lifting', label: 'Lifting' },
    { value: 'hauling', label: 'Hauling' },
    { value: 'paving', label: 'Paving' },
  ],
};

interface UnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: Unit;
}

const EMPTY: Omit<Unit, 'id'> = {
  code: '',
  type: 'logging',
  yardId: '',
  region: 'W_TEX',
  status: 'idle',
  notes: '',
};

export function UnitDialog({ open, onOpenChange, unit }: UnitDialogProps) {
  const createUnit = useStore((s) => s.createUnit);
  const updateUnit = useStore((s) => s.updateUnit);
  const yards = useStore((s) => s.yards);
  const tenantId = useStore((s) => s.tenantId);
  const isEdit = !!unit;
  const [form, setForm] = useState<Omit<Unit, 'id'>>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (unit) {
      const { id: _id, ...rest } = unit;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, yardId: yards[0]?.id ?? '' });
    }
  }, [open, unit, yards]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.yardId) return;
    if (isEdit && unit) {
      updateUnit(unit.id, form);
    } else {
      createUnit(form);
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
            <DialogTitle>{isEdit ? 'Edit Unit' : 'New Unit'}</DialogTitle>
            <DialogDescription>
              Logging trucks and trailers staged at a yard. Status auto-syncs when assigned to a
              job.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Unit Code" required>
              <Input
                value={form.code}
                onChange={(e) => field('code', e.target.value.toUpperCase())}
                placeholder="T109"
                className="font-mono"
              />
            </FieldRow>
            <FieldRow label="Type">
              <Select
                value={form.type}
                onValueChange={(v) => field('type', v as Unit['type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(UNIT_TYPE_OPTIONS[tenantId] ?? UNIT_TYPE_OPTIONS.stratagraph).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Yard" required>
              <Select value={form.yardId} onValueChange={(v) => field('yardId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a yard..." />
                </SelectTrigger>
                <SelectContent>
                  {yards.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name} · {y.city}, {y.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <FieldRow label="Status">
            <Select value={form.status} onValueChange={(v) => field('status', v as UnitStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(UNIT_STATUS_LABELS) as [UnitStatus, string][]).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Notes">
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => field('notes', e.target.value)}
              placeholder="Returned from Apex job, ready for redeploy"
              rows={2}
            />
          </FieldRow>

          <DialogFooter className="gap-2">
            {isEdit ? (
              <Badge variant="outline" className="mr-auto self-center font-mono text-[10px]">
                {unit.id}
              </Badge>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Save changes' : 'Create Unit'}</Button>
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
