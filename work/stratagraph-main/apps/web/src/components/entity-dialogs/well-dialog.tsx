import { useEffect, useMemo, useState } from 'react';
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
import { useStore } from '~/lib/store';
import { WELL_STATUS_LABELS, type Well } from '~/lib/types';

interface WellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  well?: Well;
}

function emptyWell(customerId: string): Omit<Well, 'id'> {
  return {
    customerId,
    name: '',
    apiNumber: '',
    county: '',
    state: '',
    pad: '',
    gpsCoordinates: '',
    locationId: undefined,
    rigId: undefined,
    status: 'planned',
    notes: '',
  };
}

export function WellDialog({ open, onOpenChange, customerId, well }: WellDialogProps) {
  const createWell = useStore((s) => s.createWell);
  const updateWell = useStore((s) => s.updateWell);
  const allLocations = useStore((s) => s.locations);
  const rigs = useStore((s) => s.rigs);
  const locations = useMemo(
    () => allLocations.filter((l) => l.customerId === customerId),
    [allLocations, customerId]
  );
  const isEdit = !!well;
  const [form, setForm] = useState<Omit<Well, 'id'>>(() => emptyWell(customerId));

  useEffect(() => {
    if (!open) return;
    if (well) {
      const { id: _id, ...rest } = well;
      setForm(rest);
    } else {
      setForm(emptyWell(customerId));
    }
  }, [open, well, customerId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const cleaned: Omit<Well, 'id'> = {
      ...form,
      name: form.name.trim(),
      apiNumber: form.apiNumber?.trim() || undefined,
      county: form.county?.trim() || undefined,
      state: form.state?.trim() || undefined,
      pad: form.pad?.trim() || undefined,
      gpsCoordinates: form.gpsCoordinates?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };
    if (isEdit && well) {
      updateWell(well.id, cleaned);
    } else {
      createWell(cleaned);
    }
    onOpenChange(false);
  }

  function field<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const rigsForLocation = form.locationId
    ? rigs.filter((r) => r.locationId === form.locationId)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Well' : 'New Well'}</DialogTitle>
            <DialogDescription>
              A drilling well owned by this customer. One job runs at one well; the bid is scoped to a specific well.
            </DialogDescription>
          </DialogHeader>

          <FieldRow label="Well name" required>
            <Input
              value={form.name}
              onChange={(e) => field('name', e.target.value)}
              placeholder="e.g. Rae's Creek 25 36 22 F C 095H ST01"
              autoFocus
            />
          </FieldRow>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="API #">
              <Input
                value={form.apiNumber ?? ''}
                onChange={(e) => field('apiNumber', e.target.value)}
                placeholder="30-025-55796"
                className="font-mono"
              />
            </FieldRow>
            <FieldRow label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => field('status', v as Well['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(WELL_STATUS_LABELS) as [Well['status'], string][]).map(
                    ([v, label]) => (
                      <SelectItem key={v} value={v}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldRow label="County">
              <Input
                value={form.county ?? ''}
                onChange={(e) => field('county', e.target.value)}
                placeholder="Lea"
              />
            </FieldRow>
            <FieldRow label="State">
              <Input
                value={form.state ?? ''}
                onChange={(e) => field('state', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="NM"
                maxLength={2}
              />
            </FieldRow>
            <FieldRow label="Pad (optional)">
              <Input
                value={form.pad ?? ''}
                onChange={(e) => field('pad', e.target.value)}
                placeholder="Delaware Pad 4"
              />
            </FieldRow>
          </div>

          {locations.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Location">
                <Select
                  value={form.locationId ?? '__none__'}
                  onValueChange={(v) => {
                    field('locationId', v === '__none__' ? undefined : v);
                    field('rigId', undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a location..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground italic">No location</span>
                    </SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Rig">
                <Select
                  value={form.rigId ?? '__none__'}
                  onValueChange={(v) => field('rigId', v === '__none__' ? undefined : v)}
                  disabled={!form.locationId || rigsForLocation.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !form.locationId
                          ? 'Pick a location first'
                          : rigsForLocation.length === 0
                            ? 'No rigs at location'
                            : 'Pick a rig...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground italic">No rig</span>
                    </SelectItem>
                    {rigsForLocation.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                        {r.contractor ? ` · ${r.contractor}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>
          ) : null}

          <FieldRow label="GPS coordinates">
            <Input
              value={form.gpsCoordinates ?? ''}
              onChange={(e) => field('gpsCoordinates', e.target.value)}
              placeholder="32.137672, -103.279591"
              className="font-mono"
            />
          </FieldRow>

          <FieldRow label="Notes">
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => field('notes', e.target.value)}
              rows={2}
              placeholder="Operational notes about this well"
            />
          </FieldRow>

          <DialogFooter className="gap-2">
            {isEdit ? (
              <Badge variant="outline" className="mr-auto self-center font-mono text-[10px]">
                {well.id}
              </Badge>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Save changes' : 'Create Well'}</Button>
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
