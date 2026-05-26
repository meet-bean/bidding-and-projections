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
  cn,
} from '@repo/ui';
import { Briefcase, HardHat, ArrowLeft, Mail, Plus, X } from 'lucide-react';
import { useStore, REGION_LABELS, TENANT_REGIONS } from '~/lib/store';
import {
  USER_ROLE_LABELS,
  type CrewRole,
  type Region,
  type UserRole,
} from '~/lib/types';

interface TeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'choose' | 'internal' | 'field_crew';

const CREW_ROLE_OPTIONS: { value: CrewRole; label: string }[] = [
  { value: 'day_logger', label: 'Day Logger' },
  { value: 'night_logger', label: 'Night Logger' },
  { value: 'sample_catcher', label: 'Sample Catcher' },
  { value: 'supervisor', label: 'Supervisor' },
];

const INTERNAL_ROLE_OPTIONS: { value: Exclude<UserRole, 'field_crew'>; label: string }[] = [
  { value: 'executive', label: USER_ROLE_LABELS.executive },
  { value: 'sales', label: USER_ROLE_LABELS.sales },
  { value: 'operations', label: USER_ROLE_LABELS.operations },
  { value: 'project_manager', label: USER_ROLE_LABELS.project_manager },
];

// Common certification quick-pick suggestions. Until the Certifications module
// ships, these are entered manually here.
const CERT_SUGGESTIONS = [
  'H2S',
  'SafeLand',
  'IADC RigPass',
  'Well Control',
  'PEC SafeGulf',
  'Hot Work',
  'Confined Space',
  'First Aid / CPR',
];

const AVAILABLE_VALUE = '__available__';

export function TeamMemberDialog({ open, onOpenChange }: TeamMemberDialogProps) {
  const createUser = useStore((s) => s.createUser);
  const jobs = useStore((s) => s.jobs);
  const tenantId = useStore((s) => s.tenantId);
  const regionOptions = TENANT_REGIONS[tenantId] ?? TENANT_REGIONS.stratagraph;
  const [step, setStep] = useState<Step>('choose');

  // Internal invite form
  const [internalEmail, setInternalEmail] = useState('');
  const [internalRole, setInternalRole] =
    useState<Exclude<UserRole, 'field_crew'>>('operations');
  const [internalRegion, setInternalRegion] = useState<Region | 'ALL'>('ALL');

  // Field-crew create form
  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState<CrewRole>('day_logger');
  const [crewRegion, setCrewRegion] = useState<Region>('W_TEX');
  const [crewDayRate, setCrewDayRate] = useState<string>('');
  const [crewCerts, setCrewCerts] = useState<string[]>([]);
  const [certInput, setCertInput] = useState('');
  const [crewAssignment, setCrewAssignment] = useState<string>(AVAILABLE_VALUE);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep('choose');
      setInternalEmail('');
      setInternalRole('operations');
      setInternalRegion('ALL');
      setCrewName('');
      setCrewRole('day_logger');
      setCrewRegion('W_TEX');
      setCrewDayRate('');
      setCrewCerts([]);
      setCertInput('');
      setCrewAssignment(AVAILABLE_VALUE);
    }
  }, [open]);

  // Only active + scheduled jobs are assignable. Completed/cancelled would be
  // confusing, and speculative isn't real work yet.
  const assignableJobs = jobs.filter(
    (j) => j.status === 'active' || j.status === 'scheduled'
  );

  function addCert(value: string) {
    const v = value.trim();
    if (!v) return;
    if (crewCerts.includes(v)) return;
    setCrewCerts((cs) => [...cs, v]);
    setCertInput('');
  }
  function removeCert(value: string) {
    setCrewCerts((cs) => cs.filter((c) => c !== value));
  }

  function handleInternalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!internalEmail.trim()) return;
    // Prototype: just fake an invite + add a stub user record.
    const name = internalEmail
      .split('@')[0]
      ?.split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ') || 'New User';
    createUser({
      name,
      title: USER_ROLE_LABELS[internalRole],
      email: internalEmail.trim(),
      role: internalRole,
      region: internalRegion === 'ALL' ? undefined : (internalRegion as Region),
      active: true,
    });
    onOpenChange(false);
  }

  function handleCrewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!crewName.trim()) return;
    const rate = Number(crewDayRate);
    // Flush any unsubmitted cert text so users don't lose what they typed.
    const finalCerts = certInput.trim() && !crewCerts.includes(certInput.trim())
      ? [...crewCerts, certInput.trim()]
      : crewCerts;
    const isAssigned = crewAssignment && crewAssignment !== AVAILABLE_VALUE;
    createUser({
      name: crewName.trim(),
      title: CREW_ROLE_OPTIONS.find((r) => r.value === crewRole)?.label,
      email: '',
      role: 'field_crew',
      crewRole,
      region: crewRegion,
      dayRate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
      certifications: finalCerts.length > 0 ? finalCerts : undefined,
      currentJobId: isAssigned ? crewAssignment : undefined,
      available: !isAssigned,
      active: true,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {step === 'choose' ? (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Who are you adding? Internal users are invited by email; field crew are added
                directly so they can be assigned to jobs right away.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                icon={<Briefcase className="size-5" />}
                title="Internal user"
                description="Executive, sales, operations, or project manager. Receives an email invite to sign in."
                onClick={() => setStep('internal')}
              />
              <ChoiceCard
                icon={<HardHat className="size-5" />}
                title="Field crew"
                description="Loggers, sample catchers, and supervisors. Added directly, no login."
                onClick={() => setStep('field_crew')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        ) : step === 'internal' ? (
          <form onSubmit={handleInternalSubmit} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setStep('choose')}
                  aria-label="Back"
                >
                  <ArrowLeft />
                </Button>
                <div>
                  <DialogTitle>Invite internal user</DialogTitle>
                  <DialogDescription>
                    They'll receive an email invitation to sign in.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <FieldRow label="Email" required>
              <div className="relative">
                <Mail className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  type="email"
                  value={internalEmail}
                  onChange={(e) => setInternalEmail(e.target.value)}
                  placeholder="name@stratagraph.com"
                  className="pl-8"
                  autoFocus
                />
              </div>
            </FieldRow>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Role" required>
                <Select
                  value={internalRole}
                  onValueChange={(v) =>
                    setInternalRole(v as Exclude<UserRole, 'field_crew'>)
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {INTERNAL_ROLE_OPTIONS.find((o) => o.value === internalRole)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {INTERNAL_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Region">
                <Select
                  value={internalRegion}
                  onValueChange={(v) => setInternalRegion(v as Region | 'ALL')}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {internalRegion === 'ALL' ? 'All Regions' : REGION_LABELS[internalRegion]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Regions</SelectItem>
                    {regionOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {REGION_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Send invite</Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleCrewSubmit} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setStep('choose')}
                  aria-label="Back"
                >
                  <ArrowLeft />
                </Button>
                <div>
                  <DialogTitle>Add field crew member</DialogTitle>
                  <DialogDescription>
                    Available immediately for job assignments. No login required.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <FieldRow label="Name" required>
              <Input
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
                placeholder="John Wessley"
                autoFocus
              />
            </FieldRow>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Shift Role" required>
                <Select value={crewRole} onValueChange={(v) => setCrewRole(v as CrewRole)}>
                  <SelectTrigger>
                    <SelectValue>
                      {CREW_ROLE_OPTIONS.find((o) => o.value === crewRole)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CREW_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Region" required>
                <Select value={crewRegion} onValueChange={(v) => setCrewRegion(v as Region)}>
                  <SelectTrigger>
                    <SelectValue>{REGION_LABELS[crewRegion]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {REGION_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Day Rate">
                <div className="relative">
                  <span className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={crewDayRate}
                    onChange={(e) => setCrewDayRate(e.target.value)}
                    placeholder="675"
                    className="pl-6 pr-12"
                  />
                  <span className="text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 text-xs">
                    / day
                  </span>
                </div>
              </FieldRow>
              <FieldRow label="Assignment">
                <Select
                  value={crewAssignment}
                  onValueChange={(v) => setCrewAssignment(v)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(() => {
                        if (crewAssignment === AVAILABLE_VALUE) return 'Available';
                        const j = assignableJobs.find((j) => j.id === crewAssignment);
                        return j ? `${j.jobNumber} · ${j.wellName}` : 'Available';
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AVAILABLE_VALUE}>Available — on the bench</SelectItem>
                    {assignableJobs.length > 0 ? (
                      assignableJobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.jobNumber} · {j.wellName}
                        </SelectItem>
                      ))
                    ) : null}
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>

            <FieldRow label="Certifications">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addCert(certInput);
                      } else if (
                        e.key === 'Backspace' &&
                        certInput === '' &&
                        crewCerts.length > 0
                      ) {
                        e.preventDefault();
                        removeCert(crewCerts[crewCerts.length - 1]!);
                      }
                    }}
                    placeholder="Type a cert and press Enter…"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCert(certInput)}
                    disabled={!certInput.trim()}
                  >
                    <Plus />
                    Add
                  </Button>
                </div>

                {crewCerts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {crewCerts.map((c) => (
                      <Badge
                        key={c}
                        variant="outline"
                        className="gap-1 pr-1 text-xs"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => removeCert(c)}
                          className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-3.5 items-center justify-center rounded"
                          aria-label={`Remove ${c}`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <details className="text-[11px]">
                  <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 select-none">
                    + Common certs
                  </summary>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {CERT_SUGGESTIONS.filter((s) => !crewCerts.includes(s)).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addCert(s)}
                        className="border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-sm border border-dashed px-1.5 py-0.5 text-[10px]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </details>
                <p className="text-muted-foreground text-[10px] leading-snug">
                  Manual entry for now. Future: certifications sync from the Certifications
                  module.
                </p>
              </div>
            </FieldRow>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Add crew member</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group text-left flex flex-col gap-2 rounded-lg border p-4 transition-all',
        'hover:border-primary hover:bg-muted/30 hover:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
      )}
    >
      <span className="bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary inline-flex size-9 items-center justify-center rounded-md">
        {icon}
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-muted-foreground text-xs leading-snug">{description}</span>
    </button>
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
