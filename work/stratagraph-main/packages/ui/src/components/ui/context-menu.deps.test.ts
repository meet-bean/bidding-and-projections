/**
 * Dependency-allowlist gate for the ContextMenu* primitives.
 *
 * Enforces MEE-1764 AC: no `@radix-ui/*` packages may be introduced by the
 * ContextMenu* family. The wrapper is built on `@base-ui/react` only.
 */
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
}

describe('ContextMenu dependency allowlist', () => {
  it('packages/ui/package.json declares no @radix-ui/* dependencies', async () => {
    const pkg = await readJson(resolve(here, '../../../package.json'));
    const deps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
      ...(pkg.peerDependencies as Record<string, string> | undefined),
    };
    const radix = Object.keys(deps).filter((d) => d.startsWith('@radix-ui/'));
    expect(radix).toEqual([]);
  });

  it('apps/web/package.json declares no @radix-ui/* dependencies', async () => {
    const pkg = await readJson(resolve(here, '../../../../../apps/web/package.json'));
    const deps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    };
    const radix = Object.keys(deps).filter((d) => d.startsWith('@radix-ui/'));
    expect(radix).toEqual([]);
  });
});
