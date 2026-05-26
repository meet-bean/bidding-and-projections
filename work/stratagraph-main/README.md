# Stratagraph Operations Prototype

Internal prototype of an operations platform for an oilfield mud-logging
services company. Models the full lifecycle: bid → job → daily activity →
field ticket → invoice.

**Confidentiality:** all rate figures in seed data are generic placeholder
numbers, not the customer's actual rate card. Service catalog structure and
naming preserved for workflow fidelity; dollar amounts are scrubbed. Keep this
repo private.

## Stack

- pnpm + Turborepo
- TanStack Start (Vite 7, React 19, Nitro node-server)
- Zustand (in-memory store; persistence pending)
- Tailwind v4 + custom UI package (`@repo/ui`, base-ui primitives)

## Layout

```
apps/web              — main app
packages/ui           — shared UI components
packages/config       — shared config (tsconfig, etc.)
```

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Node 22+ required.
