# Upload → Services Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a projection upload, new/renamed line items open an accept-or-match reconcile dialog that updates the Superior services catalog; matching follows name+costType-first precedence with a within-project phase-rename fallback.

**Architecture:** All matching/apply logic lives as pure functions in `packages/projections/src/registry/registry.ts` (5-tier `classifyImport`, new `computeUploadDelta`, new `applyDecisions`). The existing `ServiceReconcileDialog` gains a `lines` prop so the upload flow (projections.$projectId.tsx) can open it scoped to the upload delta, while the manual `/services` flow passes a full project (now via a project picker).

**Tech Stack:** TypeScript 5, React 19, Zustand, vitest (engine tests), @repo/ui (Dialog, DropdownMenu).

**Spec:** `docs/superpowers/specs/2026-06-09-upload-services-reconciliation-design.md`

**Working directory:** `work/stratagraph-main` (repo root for commits is the top-level folder `Superior + Stratagraph`).

**Test command:** `cd work/stratagraph-main/packages/projections && pnpm test` (vitest). KNOWN FLAKE: the `+` in the repo path can break Vite transforms (see memory `reference-test-runner-env`). If vitest errors on path resolution rather than assertions, fall back to `npx tsc --noEmit -p apps/web/tsconfig.json` plus browser verification (Task 7) and note it in the commit message.

---

### Task 1: Matcher rewrite — 5-tier `classifyImport`

**Files:**
- Modify: `work/stratagraph-main/packages/projections/src/registry/registry.ts` (replace `ClassifiedLine` + `classifyImport`, lines ~252–268)
- Test: `work/stratagraph-main/packages/projections/src/registry/__tests__/registry.test.ts` (replace `describe('classifyImport')` block, lines ~236–263)

- [ ] **Step 1: Replace the `classifyImport` test block with failing tier tests**

In `registry.test.ts`, replace the entire `describe('classifyImport', ...)` block with:

```ts
describe('classifyImport (5-tier matcher)', () => {
  // Catalog: two services sharing cost type 2Labor, one 5SubCont sibling sharing a phase code.
  function buildReg() {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Erosion Control', unitOfMeasure: 'DY', costType: '2Labor',
      sourceProjectId: 'p1',
      source: src({ projectId: 'p1', lineKey: 'B-200-|2Labor', phaseCode: 'B-200-' }),
    });
    reg = addServiceItem(reg, {
      canonicalName: 'Mowing / Litter', unitOfMeasure: 'MOS', costType: '5SubCont',
      sourceProjectId: 'p1',
      source: src({ projectId: 'p1', lineKey: 'B-205-|5SubCont', phaseCode: 'B-205-' }),
    });
    return reg;
  }
  const line = (over: Record<string, unknown> = {}) => ({
    name: 'Erosion Control', unitOfMeasure: 'DY', costType: '2Labor',
    lineKey: 'B-200-|2Labor', phaseCode: 'B-200-',
    ctd: { qty: 1, hours: 0, cost: 1 },
    oe: { qty: 1, cost: 1 },
    f: { qty: 1, cost: 1 },
    date: '2026-06-01',
    projectId: 'p1',
    ...over,
  });

  it('tier 1: exact name + cost type → auto', () => {
    const res = classifyImport(buildReg(), [line()]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.suggestion?.canonicalName).toBe('Erosion Control');
    expect(res[0]!.confidence).toBe(1);
  });

  it('tier 1: alias name + cost type → auto', () => {
    let reg = buildReg();
    const target = reg.items[0]!;
    reg = mergeServiceItems(reg, target.id, {
      raw: 'Erosion Cntrl', normalizedTo: 'Erosion Control',
      sourceProjectId: 'p1', sourceUploadDate: '2026-05-01',
    });
    const res = classifyImport(reg, [line({ name: 'Erosion Cntrl' })]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.suggestion?.id).toBe(target.id);
  });

  it('canonical scenario: name+costType beats a phase-code sibling', () => {
    // Incoming B-205-/2Labor/"Erosion Control": shares phase B-205- with Mowing/Litter (5SubCont)
    // but must match Erosion Control (2Labor) by name+costType.
    const res = classifyImport(buildReg(), [line({ phaseCode: 'B-205-', lineKey: 'B-205-|2Labor' })]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.suggestion?.canonicalName).toBe('Erosion Control');
  });

  it('UoM mismatch does NOT block a name match; sets uomWarning', () => {
    const res = classifyImport(buildReg(), [line({ unitOfMeasure: 'MOS' })]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.uomWarning).toBe(true);
  });

  it('tier 2: single fuzzy name + cost type → auto', () => {
    const res = classifyImport(buildReg(), [line({ name: 'Erosion Controls' })]);
    expect(res[0]!.bucket).toBe('auto');
    expect(res[0]!.suggestions[0]!.reason).toBe('fuzzy-name');
  });

  it('tier 3: same project + phase code + cost type with drifted name → review (phase-rename)', () => {
    const res = classifyImport(buildReg(), [
      line({ name: 'Silt Fence & SWPPP Maintenance', phaseCode: 'B-200-' }),
    ]);
    expect(res[0]!.bucket).toBe('review');
    expect(res[0]!.suggestions[0]!.reason).toBe('phase-rename');
    expect(res[0]!.suggestions[0]!.service.canonicalName).toBe('Erosion Control');
  });

  it('tier 3 never fires across projects', () => {
    const res = classifyImport(buildReg(), [
      line({ name: 'Silt Fence & SWPPP Maintenance', phaseCode: 'B-200-', projectId: 'p2' }),
    ]);
    expect(res[0]!.bucket).toBe('new');
  });

  it('tier 4: fuzzy + phase-rename conflict → review with both suggestions', () => {
    let reg = buildReg();
    reg = addServiceItem(reg, {
      canonicalName: 'Erosion Controls Inc', unitOfMeasure: 'DY', costType: '2Labor',
      sourceProjectId: 'p1',
      source: src({ projectId: 'p1', lineKey: 'B-210-|2Labor', phaseCode: 'B-210-' }),
    });
    // Name fuzzy-matches BOTH 'Erosion Control' and 'Erosion Controls Inc' → conflict → review.
    const res = classifyImport(reg, [line({ name: 'Erosion Controls' })]);
    expect(res[0]!.bucket).toBe('review');
    expect(res[0]!.suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it('tier 5: nothing matches → new', () => {
    const res = classifyImport(buildReg(), [
      line({ name: 'Bridge Post-Tensioning', costType: '5SubCont', phaseCode: 'C-700-' }),
    ]);
    expect(res[0]!.bucket).toBe('new');
    expect(res[0]!.suggestions).toEqual([]);
  });

  it('cost type must agree even for exact name', () => {
    const res = classifyImport(buildReg(), [line({ costType: '3Material' })]);
    expect(res[0]!.bucket).toBe('new');
  });
});
```

- [ ] **Step 2: Run tests, verify the new ones fail**

Run: `cd work/stratagraph-main/packages/projections && pnpm test 2>&1 | tail -30`
Expected: FAIL — `suggestions`/`uomWarning` don't exist; bucket assertions fail. (If vitest fails on path transform instead, note it and rely on Step 4's tsc check + Task 7 browser verification.)

- [ ] **Step 3: Replace `ClassifiedLine` and `classifyImport` in registry.ts**

Replace the existing `ClassifiedLine` interface and `classifyImport` function (keep `ImportLine` as-is, keep `findFuzzyMatches` untouched for back-compat):

```ts
export interface MatchSuggestion {
  service: Service;
  reason: 'exact-name' | 'fuzzy-name' | 'phase-rename';
  confidence: number;
}

export interface ClassifiedLine {
  line: ImportLine;
  bucket: 'auto' | 'review' | 'new';
  /** All candidates, best first. Review rows render every entry. */
  suggestions: MatchSuggestion[];
  /** Best candidate (suggestions[0]?.service) — kept for existing call sites. */
  suggestion: Service | null;
  confidence: number;
  /** Best candidate exists but its UoM differs from the incoming line. Warns, never blocks. */
  uomWarning: boolean;
}

/**
 * 5-tier matcher. Cost type must agree at every tier; name + cost type always
 * wins; phase code is a within-project rename fallback only (codes are not
 * stable across jobs); UoM never gates a match.
 */
export function classifyImport(registry: ServiceRegistry, lines: ImportLine[]): ClassifiedLine[] {
  return lines.map((line) => {
    const nName = normalizeKey(line.name);
    const nCost = normalizeKey(line.costType);
    const nPhase = normalizeKey(line.phaseCode);
    const sameCost = registry.items.filter((i) => normalizeKey(i.costType) === nCost);

    const uomWarns = (s: Service) =>
      normalizeKey(s.unitOfMeasure) !== normalizeKey(line.unitOfMeasure);

    // Tier 1 — exact canonical name or recorded alias.
    const exact = sameCost.find(
      (i) =>
        normalizeKey(i.canonicalName) === nName ||
        i.aliases.some((a) => normalizeKey(a.raw) === nName)
    );
    if (exact) {
      return {
        line, bucket: 'auto' as const,
        suggestions: [{ service: exact, reason: 'exact-name' as const, confidence: 1 }],
        suggestion: exact, confidence: 1, uomWarning: uomWarns(exact),
      };
    }

    // Tier 2 — fuzzy canonical name.
    const fuzzy = sameCost.filter((i) => isFuzzyMatch(i.canonicalName, line.name));

    // Tier 3 — same-project phase rename (name drifted, code + cost type agree).
    const renames =
      line.projectId && nPhase
        ? sameCost.filter(
            (i) =>
              !fuzzy.includes(i) &&
              i.sources.some(
                (s) => s.projectId === line.projectId && normalizeKey(s.phaseCode) === nPhase
              )
          )
        : [];

    const suggestions: MatchSuggestion[] = [
      ...fuzzy.map((s) => ({ service: s, reason: 'fuzzy-name' as const, confidence: 0.8 })),
      ...renames.map((s) => ({ service: s, reason: 'phase-rename' as const, confidence: 0.6 })),
    ];

    if (suggestions.length === 0) {
      return { line, bucket: 'new' as const, suggestions, suggestion: null, confidence: 0, uomWarning: false };
    }

    const best = suggestions[0]!;
    // Single unambiguous fuzzy → auto. Any rename, or multiple candidates → review.
    const bucket =
      fuzzy.length === 1 && renames.length === 0 ? ('auto' as const) : ('review' as const);
    return {
      line, bucket, suggestions,
      suggestion: best.service, confidence: best.confidence, uomWarning: uomWarns(best.service),
    };
  });
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd work/stratagraph-main/packages/projections && pnpm test 2>&1 | tail -15`
Expected: all registry tests PASS. Also run `cd work/stratagraph-main && npx tsc --noEmit -p apps/web/tsconfig.json` — expect clean (dialog still reads `c.suggestion`, which survives).

- [ ] **Step 5: Commit**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph" && git add work/stratagraph-main/packages/projections/src/registry && git commit -m "feat(registry): 5-tier classifyImport — name+costType wins, phase-rename fallback"
```

---

### Task 2: `computeUploadDelta`

**Files:**
- Modify: `work/stratagraph-main/packages/projections/src/registry/registry.ts` (append)
- Test: `work/stratagraph-main/packages/projections/src/registry/__tests__/registry.test.ts` (append)

- [ ] **Step 1: Write failing tests**

Append to `registry.test.ts` (add `computeUploadDelta` to the existing import from `'../registry'`; it needs minimal ProjectionProject fixtures):

```ts
import { computeUploadDelta } from '../registry';

describe('computeUploadDelta', () => {
  const item = (lineKey: string, label: string) => ({
    lineKey, keyParts: lineKey.split('|'), label, unitOfMeasure: 'CY',
    CTP: { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 },
    CTD: { qty: 1, hours: 2, upm: 0, mpu: 0, uc: 0, cost: 3 },
    CTC: { qty: 0, hours: 0, upm: 0, mpu: 0, uc: 0, cost: 0 },
    F:   { qty: 4, hours: 5, upm: 0, mpu: 0, uc: 0, cost: 6 },
    Est: { qty: 7, hours: 8, upm: 0, mpu: 0, uc: 0, cost: 9 },
    estVar: 0, comp: 0, prevForecast: 0, calcHrs: 0, wsRisk: 0, isNew: false, stale: false,
  });
  const version = (id: string, items: ReturnType<typeof item>[]) => ({
    id, label: id, createdAt: '2026-06-01T00:00:00Z', saved: true, items,
  });
  const project = (versions: ReturnType<typeof version>[]) => ({
    id: 'p1', name: 'P', jobNumber: '1', customer: '', pm: '',
    createdAt: '', versions, draft: null, comments: {}, alertStatus: {}, financials: null,
  });

  it('first version → every line is delta', () => {
    const p = project([version('v1', [item('A|2Labor', 'Alpha'), item('B|2Labor', 'Beta')])]);
    expect(computeUploadDelta(p as never).map((l) => l.lineKey)).toEqual(['A|2Labor', 'B|2Labor']);
  });

  it('unchanged lines are excluded; new lineKey included', () => {
    const p = project([
      version('v1', [item('A|2Labor', 'Alpha')]),
      version('v2', [item('A|2Labor', 'Alpha'), item('B|2Labor', 'Beta')]),
    ]);
    expect(computeUploadDelta(p as never).map((l) => l.lineKey)).toEqual(['B|2Labor']);
  });

  it('renamed label is included as delta', () => {
    const p = project([
      version('v1', [item('A|2Labor', 'Alpha')]),
      version('v2', [item('A|2Labor', 'Alpha Renamed')]),
    ]);
    const delta = computeUploadDelta(p as never);
    expect(delta).toHaveLength(1);
    expect(delta[0]!.name).toBe('Alpha Renamed');
    expect(delta[0]!.projectId).toBe('p1');
  });

  it('empty project → empty delta', () => {
    expect(computeUploadDelta(project([]) as never)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `pnpm test` in `packages/projections`. Expected: FAIL `computeUploadDelta is not exported`.

- [ ] **Step 3: Implement in registry.ts**

Add at top of `registry.ts`:

```ts
import type { ProjectionProject, ProjectionItem } from '../types';
```

Append:

```ts
/** Convert a projection item to an ImportLine for reconciliation. */
export function toImportLine(
  item: ProjectionItem,
  projectId: string,
  date: string
): ImportLine {
  return {
    name: item.label,
    unitOfMeasure: item.unitOfMeasure,
    costType: item.keyParts[1] ?? '',
    lineKey: item.lineKey,
    phaseCode: item.keyParts[0] ?? '',
    ctd: { qty: item.CTD.qty, hours: item.CTD.hours, cost: item.CTD.cost },
    oe: { qty: item.Est.qty, cost: item.Est.cost },
    f: { qty: item.F.qty, cost: item.F.cost },
    date,
    projectId,
  };
}

/**
 * Lines in the latest version that need reconciliation: new lineKeys plus
 * renamed labels vs the immediately prior version. First version → all lines.
 */
export function computeUploadDelta(project: ProjectionProject): ImportLine[] {
  const latest = project.versions[project.versions.length - 1];
  if (!latest) return [];
  const prev = project.versions[project.versions.length - 2] ?? null;
  const prevByKey = new Map((prev?.items ?? []).map((i) => [i.lineKey, i]));
  return latest.items
    .filter((it) => {
      const p = prevByKey.get(it.lineKey);
      return !p || p.label !== it.label;
    })
    .map((it) => toImportLine(it, project.id, latest.createdAt));
}
```

Note: `../types` exports `ProjectionProject`/`ProjectionItem` (root `src/types.ts`); the registry-local types file is `./types`. No import cycle — root types.ts imports nothing from registry.

- [ ] **Step 4: Run, verify pass** — `pnpm test` (and `npx tsc --noEmit -p apps/web/tsconfig.json` from `work/stratagraph-main`).

- [ ] **Step 5: Commit**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph" && git add work/stratagraph-main/packages/projections && git commit -m "feat(registry): computeUploadDelta + toImportLine helpers"
```

---

### Task 3: `applyDecisions` (alias recording) + store refactor

**Files:**
- Modify: `work/stratagraph-main/packages/projections/src/registry/registry.ts` (append)
- Modify: `work/stratagraph-main/apps/web/src/lib/store.ts:1357-1381` (`applyReconciliation`)
- Test: `work/stratagraph-main/packages/projections/src/registry/__tests__/registry.test.ts` (append)

- [ ] **Step 1: Write failing tests**

Append to `registry.test.ts` (add `applyDecisions` to the `'../registry'` import):

```ts
import { applyDecisions } from '../registry';

describe('applyDecisions', () => {
  const impLine = (over: Record<string, unknown> = {}) => ({
    name: 'Erosion Cntrl', unitOfMeasure: 'DY', costType: '2Labor',
    lineKey: 'B-200-|2Labor', phaseCode: 'B-200-',
    ctd: { qty: 1, hours: 0, cost: 1 },
    oe: { qty: 1, cost: 1 },
    f: { qty: 1, cost: 1 },
    date: '2026-06-01',
    projectId: 'p2',
    ...over,
  });

  function regWithErosion() {
    let reg = createRegistry('superior');
    reg = addServiceItem(reg, {
      canonicalName: 'Erosion Control', unitOfMeasure: 'DY', costType: '2Labor',
      sourceProjectId: 'p1',
      source: src({ projectId: 'p1', lineKey: 'B-200-|2Labor', phaseCode: 'B-200-' }),
    });
    return reg;
  }

  it('match with drifted name: attaches source AND records alias', () => {
    const reg = regWithErosion();
    const target = reg.items[0]!;
    const out = applyDecisions(reg, [{ line: impLine(), action: 'match', targetId: target.id }]);
    const svc = out.items.find((i) => i.id === target.id)!;
    expect(svc.sources.some((s) => s.projectId === 'p2')).toBe(true);
    expect(svc.aliases.map((a) => a.raw)).toContain('Erosion Cntrl');
  });

  it('match with identical name: no alias recorded', () => {
    const reg = regWithErosion();
    const target = reg.items[0]!;
    const out = applyDecisions(reg, [
      { line: impLine({ name: 'Erosion Control' }), action: 'match', targetId: target.id },
    ]);
    expect(out.items.find((i) => i.id === target.id)!.aliases).toEqual([]);
  });

  it('duplicate alias is not recorded twice', () => {
    const reg = regWithErosion();
    const target = reg.items[0]!;
    let out = applyDecisions(reg, [{ line: impLine(), action: 'match', targetId: target.id }]);
    out = applyDecisions(out, [{ line: impLine(), action: 'match', targetId: target.id }]);
    expect(out.items.find((i) => i.id === target.id)!.aliases).toHaveLength(1);
  });

  it('new: creates a service with the incoming name', () => {
    const out = applyDecisions(regWithErosion(), [
      { line: impLine({ name: 'Wick Drains', costType: '5SubCont' }), action: 'new' },
    ]);
    expect(out.items.some((i) => i.canonicalName === 'Wick Drains')).toBe(true);
  });

  it('line without projectId is skipped', () => {
    const reg = regWithErosion();
    const out = applyDecisions(reg, [{ line: impLine({ projectId: undefined }), action: 'new' }]);
    expect(out.items).toHaveLength(reg.items.length);
  });
});
```

- [ ] **Step 2: Run, verify fail** — Expected: `applyDecisions is not exported`.

- [ ] **Step 3: Implement in registry.ts**

```ts
export type ReconcileDecision =
  | { line: ImportLine; action: 'match'; targetId: string }
  | { line: ImportLine; action: 'new' };

/**
 * Apply reconcile decisions. Matches attach/refresh a source on the target
 * service; when the incoming name differs from the canonical name, it is
 * recorded as an alias so future uploads auto-match at tier 1. New lines
 * create a service with the incoming name as canonical.
 */
export function applyDecisions(
  registry: ServiceRegistry,
  decisions: ReconcileDecision[]
): ServiceRegistry {
  let reg = registry;
  for (const d of decisions) {
    const L = d.line;
    const pid = L.projectId;
    if (!pid) continue;
    const source: ServiceSource = {
      projectId: pid,
      lineKey: L.lineKey,
      phaseCode: L.phaseCode,
      date: L.date,
      ctd: L.ctd,
      oe: L.oe,
      f: L.f,
    };
    if (d.action === 'match') {
      const target = reg.items.find((i) => i.id === d.targetId);
      if (!target) continue;
      reg = addServiceItem(reg, {
        canonicalName: target.canonicalName,
        unitOfMeasure: target.unitOfMeasure,
        costType: target.costType,
        sourceProjectId: pid,
        source,
      });
      const drifted = normalizeKey(L.name) !== normalizeKey(target.canonicalName);
      const known = target.aliases.some((a) => normalizeKey(a.raw) === normalizeKey(L.name));
      if (drifted && !known) {
        reg = mergeServiceItems(reg, target.id, {
          raw: L.name,
          normalizedTo: target.canonicalName,
          sourceProjectId: pid,
          sourceUploadDate: L.date,
        });
      }
    } else {
      reg = addServiceItem(reg, {
        canonicalName: L.name,
        unitOfMeasure: L.unitOfMeasure,
        costType: L.costType,
        sourceProjectId: pid,
        source,
      });
    }
  }
  return reg;
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Refactor store `applyReconciliation` to delegate**

In `apps/web/src/lib/store.ts`, replace the `applyReconciliation` implementation (lines ~1357–1381) with:

```ts
  applyReconciliation: (decisions) =>
    set((s) => ({
      services: applyDecisions({ tenantId: s.tenantId, items: s.services }, decisions).items,
    })),
```

Add `applyDecisions` to the existing `@repo/projections` value import block (where `mergeServiceItems`, `classifyImport` are imported), and change the interface declaration at line ~570 to use the engine type:

```ts
  applyReconciliation: (decisions: ReconcileDecision[]) => void;
```

with `ReconcileDecision` added to the type import from `@repo/projections`. Remove now-unused imports if tsc flags them (`addServiceItem` may still be used elsewhere — check before removing).

- [ ] **Step 6: Typecheck** — `cd work/stratagraph-main && npx tsc --noEmit -p apps/web/tsconfig.json`. Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph" && git add work/stratagraph-main/packages/projections work/stratagraph-main/apps/web/src/lib/store.ts && git commit -m "feat(registry): applyDecisions with alias recording; store delegates"
```

---

### Task 4: Dialog — delta lines prop, multi-suggestion review, UoM chip

**Files:**
- Modify: `work/stratagraph-main/apps/web/src/components/service-reconcile-dialog.tsx`

- [ ] **Step 1: Update props and line derivation**

Change the interface and `lines` memo:

```tsx
interface ServiceReconcileDialogProps {
  projectId: string | null;
  /** Pre-computed lines (upload delta). When omitted, derives ALL lines from the project's latest version (manual flow). */
  lines?: ImportLine[];
  /** Dialog title override, e.g. "New line items — March 2026 Projection". */
  title?: string;
  onClose: () => void;
}

export function ServiceReconcileDialog({ projectId, lines: linesProp, title, onClose }: ServiceReconcileDialogProps) {
```

and replace the `lines` useMemo body's return with:

```tsx
  const lines = useMemo<ImportLine[]>(() => {
    if (linesProp) return linesProp;
    if (!project || project.versions.length === 0) return [];
    const latest = project.versions[project.versions.length - 1]!;
    return latest.items.map((item) => toImportLine(item, project.id, latest.createdAt));
  }, [linesProp, project]);
```

Import `toImportLine` from `@repo/projections` and drop the now-duplicated inline mapping.

- [ ] **Step 2: Title + footer label**

In `DialogTitle`, render `{title ?? 'Import & reconcile'}` (keep the project-name suffix). Change the footer primary button text from `Add to catalog` to `Apply`.

- [ ] **Step 3: Review rows — render every suggestion + UoM chip**

In the "Needs review" section, replace the single Accept button + single suggestion line with a per-suggestion list. Replace the `<div className="flex items-center gap-1.5 shrink-0">…</div>` block and the trailing `{c.suggestion && …}` paragraph with:

```tsx
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant={!isMatch ? 'default' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() => setDecision(c.line.lineKey, { line: c.line, action: 'new' })}
                            >
                              New
                            </Button>
                          </div>
                        </div>
                        {c.uomWarning && (
                          <p className="text-xs text-amber-600 mt-1 ml-7">
                            UoM differs: incoming {c.line.unitOfMeasure || '—'} vs catalog{' '}
                            {c.suggestion?.unitOfMeasure || '—'}
                          </p>
                        )}
                        <div className="mt-1.5 ml-7 flex flex-col gap-1">
                          {c.suggestions.map((sug) => {
                            const selected = dec?.action === 'match' && dec.targetId === sug.service.id;
                            return (
                              <button
                                key={sug.service.id}
                                className={`flex items-center justify-between gap-2 rounded border px-2 py-1 text-left text-xs ${
                                  selected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border'
                                }`}
                                onClick={() =>
                                  setDecision(c.line.lineKey, {
                                    line: c.line,
                                    action: 'match',
                                    targetId: sug.service.id,
                                  })
                                }
                              >
                                <span className="truncate">
                                  <span className="font-medium">{sug.service.canonicalName}</span>
                                  {' '}· {costTypeLabel(sug.service.costType)}
                                </span>
                                <span className="shrink-0 text-muted-foreground">
                                  {sug.reason === 'phase-rename' ? 'renamed?' : 'name match'} ·{' '}
                                  {Math.round(sug.confidence * 100)}%
                                </span>
                              </button>
                            );
                          })}
                        </div>
```

(The `dec` variable already exists in that map; `isMatch` stays as `dec?.action === 'match'`.)

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit -p apps/web/tsconfig.json`. Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph" && git add work/stratagraph-main/apps/web/src/components/service-reconcile-dialog.tsx && git commit -m "feat(services): reconcile dialog — delta lines prop, multi-suggestion review, UoM warning"
```

---

### Task 5: Upload wiring — open reconcile after ingest

**Files:**
- Modify: `work/stratagraph-main/apps/web/src/routes/_dashboard/projections.$projectId.tsx`

- [ ] **Step 1: State + handler**

Add imports: `computeUploadDelta` and `type ImportLine` from `@repo/projections`; `ServiceReconcileDialog` from `~/components/service-reconcile-dialog`.

Add local state next to the existing `showUpload` state:

```tsx
  const [reconcile, setReconcile] = useState<{ lines: ImportLine[]; label: string } | null>(null);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);
```

Replace `handleBatchImport`:

```tsx
  const handleBatchImport = (result: BatchUploadResult) => {
    let next: ProjectionProject | null = null;
    updateActiveProjection((p) => {
      next = ingestBatch(
        p,
        result.cycles.map((c) => ({
          label: c.label,
          detectedDate: c.detectedDate,
          items: c.items,
          notes: c.notes,
        })),
        result.financials,
      );
      return next;
    });
    if (!next) return;
    const latest = next.versions[next.versions.length - 1];
    const delta = computeUploadDelta(next);
    if (delta.length > 0) {
      setReconcile({ lines: delta, label: latest?.label ?? '' });
    } else {
      setReconcileNotice(`All ${latest?.items.length ?? 0} line items already reconciled.`);
      window.setTimeout(() => setReconcileNotice(null), 4000);
    }
  };
```

(Verify `updateActiveProjection` invokes its callback synchronously — it's a Zustand `set` wrapper; if it doesn't return the updated project, capture via the closure as shown. Check `ProjectionProject` is already imported as a type; add if not.)

- [ ] **Step 2: Render dialog + notice**

Next to the existing `<ProjectionUpload …/>` element add:

```tsx
      {/* Post-upload reconcile (Superior services catalog) */}
      <ServiceReconcileDialog
        projectId={reconcile ? project.id : null}
        lines={reconcile?.lines}
        title={reconcile ? `New line items — ${reconcile.label}` : undefined}
        onClose={() => setReconcile(null)}
      />
      {reconcileNotice && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border bg-background px-3 py-2 text-sm shadow-md">
          {reconcileNotice}
        </div>
      )}
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit -p apps/web/tsconfig.json`. Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph" && git add "work/stratagraph-main/apps/web/src/routes/_dashboard/projections.\$projectId.tsx" && git commit -m "feat(projections): open services reconcile dialog after upload, scoped to delta"
```

---

### Task 6: /services — project picker for manual reconcile

**Files:**
- Modify: `work/stratagraph-main/apps/web/src/routes/_dashboard/services.tsx:28-57`

- [ ] **Step 1: Replace the hardcoded-first-project button with a dropdown**

Add to the `@repo/ui` import: `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger`. Replace the first `<Button …>Import &amp; reconcile</Button>` block inside `headerActions` with:

```tsx
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={projectionProjects.length === 0}>
            Import &amp; reconcile
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {projectionProjects.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => setReconcileProjectId(p.id)}>
              {p.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit -p apps/web/tsconfig.json`. Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph" && git add work/stratagraph-main/apps/web/src/routes/_dashboard/services.tsx && git commit -m "feat(services): project picker for manual Import & reconcile"
```

---

### Task 7: Browser verification (end-to-end)

**Files:** none (verification only). Use the Chrome MCP per user preference (not preview tools).

- [ ] **Step 1: Build a doctored upload fixture**

Make a copy of the real sheet with one renamed and one new line (script writes `/tmp/25807-test-upload.xlsx`):

```bash
python3 - <<'EOF'
import openpyxl, warnings
warnings.filterwarnings('ignore')
src = "/Users/italo/Downloads/2. 25807 2025-03 Cost Forecast (1).xlsx"
wb = openpyxl.load_workbook(src)
ws = wb['Cost 03-26']
renamed = added = False
for row in ws.iter_rows(min_row=5):
    ph = (row[2].value or '').strip() if isinstance(row[2].value, str) else ''
    if ph == 'B-200-' and not renamed:
        row[3].value = 'Erosion Control & SWPPP'   # rename → tier-3/2 candidate
        renamed = True
    if ph == 'B-910-' and not added:
        row[2].value = '    B-911-'
        row[3].value = 'Articulating Block Mats'    # brand-new line
        added = True
wb.save('/tmp/25807-test-upload.xlsx')
print('renamed:', renamed, 'added:', added)
EOF
```

Expected: `renamed: True added: True`.

- [ ] **Step 2: Drive the app**

1. Dev server running (`pnpm --filter web dev`), open `http://localhost:5173/projections/demo-suncoast-3a?tenant=superior` in Chrome MCP.
2. Click Upload, inject `/tmp/25807-test-upload.xlsx`, confirm the month.
3. Verify the reconcile dialog opens titled "New line items — …" and shows a small delta (the renamed B-200- lines + the new B-911- line), NOT all ~356.
4. Verify the renamed line sits in Needs review with an "Erosion Control" suggestion (name match or renamed?); the B-911- line sits in New to catalog.
5. Click Apply. Open `/services?tenant=superior`, search "Erosion Control" → detail shows the new source/alias; search "Articulating" → new service exists.
6. Check console for errors (`read_console_messages`, onlyErrors).

- [ ] **Step 3: Verify the zero-delta path**

Upload the same file again (same month). Expected: no dialog; bottom-right notice "All N line items already reconciled."

- [ ] **Step 4: Verify the manual path**

On `/services`, click Import & reconcile → pick "Bayshore Blvd Widening" → dialog shows that project's full line set; Cancel.

- [ ] **Step 5: Final commit (if any fixes were needed) and wrap-up**

```bash
cd "/Users/italo/Desktop/Superior + Stratagraph" && git status --short work/stratagraph-main
```

Commit any fixes with descriptive messages, then run the full engine test suite one last time: `cd work/stratagraph-main/packages/projections && pnpm test`.
