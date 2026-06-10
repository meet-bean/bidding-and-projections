import { useState } from 'react';
import { useStore } from '~/lib/store';
import { MonthPicker } from './month-picker';
import { Input, Button, Badge } from '@repo/ui';
import { Check } from 'lucide-react';

interface MonthlyEntryFormProps {
  projectId: string;
}

export function MonthlyEntryForm({ projectId }: MonthlyEntryFormProps) {
  const today = new Date();
  const [yearMonth, setYearMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );

  const registry = useStore((s) => s.services);
  const getMonthly = useStore((s) => s.getMonthlyQuantity);
  const setMonthly = useStore((s) => s.setMonthlyQuantity);

  const [edits, setEdits] = useState<Record<string, { qty: string; hours: string }>>({});

  function handleSave(serviceId: string) {
    const edit = edits[serviceId];
    if (!edit) return;
    setMonthly(projectId, serviceId, yearMonth, Number(edit.qty) || 0, Number(edit.hours) || 0);
    setEdits((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <MonthPicker value={yearMonth} onChange={setYearMonth} />
        <Badge variant="outline">{registry.length} services</Badge>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Service</th>
              <th className="px-4 py-2 text-left font-medium">Cost Type</th>
              <th className="px-4 py-2 text-left font-medium">UoM</th>
              <th className="px-4 py-2 text-right font-medium w-28">Qty</th>
              <th className="px-4 py-2 text-right font-medium w-28">Hours</th>
              <th className="px-4 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {registry.map((item) => {
              const saved = getMonthly(projectId, item.id, yearMonth);
              const editing = edits[item.id];
              const qtyVal = editing?.qty ?? String(saved.qty || '');
              const hoursVal = editing?.hours ?? String(saved.hours || '');

              return (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{item.canonicalName}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-xs">{item.costType}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{item.unitOfMeasure}</td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={qtyVal}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [item.id]: { qty: e.target.value, hours: prev[item.id]?.hours ?? hoursVal },
                        }))
                      }
                      className="w-28 text-right ml-auto"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={hoursVal}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [item.id]: { qty: prev[item.id]?.qty ?? qtyVal, hours: e.target.value },
                        }))
                      }
                      className="w-28 text-right ml-auto"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {editing && (
                      <Button variant="ghost" size="icon" onClick={() => handleSave(item.id)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {registry.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No services yet. Upload a projection to populate items.
          </div>
        )}
      </div>
    </div>
  );
}
