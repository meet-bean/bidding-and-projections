import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from '@repo/ui';
import { useStore } from '~/lib/store';
import { USER_ROLE_LABELS, type UserRole } from '~/lib/types';

export const Route = createFileRoute('/_dashboard/admin/organization')({
  component: OrganizationPage,
});

const ROLE_PERMISSIONS: {
  role: UserRole;
  description: string;
  screens: string;
}[] = [
  { role: 'executive', description: 'Company leadership', screens: 'All screens (read-only)' },
  { role: 'sales', description: 'Business development', screens: 'Home, Bids, Customers, Reports' },
  { role: 'operations', description: 'Field operations management', screens: 'All screens' },
  { role: 'project_manager', description: 'Project oversight & forecasting', screens: 'Home, Jobs, Projections, Tickets, Reports' },
  { role: 'field_crew', description: 'Field workers (loggers, supervisors)', screens: 'Jobs (assigned only)' },
];

function OrganizationPage() {
  const org = useStore((s) => s.organization);
  const updateOrganization = useStore((s) => s.updateOrganization);

  const [form, setForm] = useState(org);
  const [saved, setSaved] = useState(false);

  const dirty =
    form.name !== org.name ||
    form.legalName !== org.legalName ||
    form.address !== org.address ||
    form.city !== org.city ||
    form.state !== org.state ||
    form.zip !== org.zip ||
    (form.phone ?? '') !== (org.phone ?? '') ||
    (form.email ?? '') !== (org.email ?? '');

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateOrganization(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Company identity and role configuration.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Company Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Legal Name">
                <Input
                  value={form.legalName}
                  onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  placeholder="As shown on tickets & bids"
                />
              </Field>
            </div>
            <Field label="Address">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
              <Field label="State">
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </Field>
              <Field label="Zip">
                <Input
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <Input
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Email">
                <Input
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 border-t pt-4">
              {saved ? (
                <span className="text-sm text-green-600">Saved</span>
              ) : null}
              <Button type="submit" disabled={!dirty}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roles &amp; Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Screen Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLE_PERMISSIONS.map((r) => (
                  <TableRow key={r.role}>
                    <TableCell>
                      <Badge variant="outline">{USER_ROLE_LABELS[r.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.description}
                    </TableCell>
                    <TableCell className="text-sm">{r.screens}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Role-based access enforcement is coming soon. This table shows the planned
            screen visibility for each role.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}
