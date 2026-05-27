# [Project Name]

> One-line description of what this project does and why it exists.

## Project Overview

- **Client / Owner:** [who is this for]
- **Goal:** [what problem does it solve]
- **Timeline:** [key dates or milestones]

## Tech Stack

| Layer | Choice |
|---|---|
| Build | |
| UI | |
| Data | |
| State | |
| Server | |

## Workspace

```
project/
├── ...
└── src/
    └── ...
```

## Data Schema

[Document the input/output data formats your app works with. This was the most valuable section in the Superior Construction project — it kept every session aligned on the real data shape.]

## Current State

[Update this section at the end of every major work session. The PreCompact hook will remind you.]

Status key: done / partial / not started

### P0 — Must have
1. ...

### P1 — Should have
1. ...

### P2 — Nice to have / post-launch
1. ...

## Design System

This project follows our shared design system. See `design-system/DESIGN-SYSTEM.md` for the full reference.

Key points:
- Tailwind CSS v4 with OKLCH color tokens
- Inter font, -0.01em letter-spacing
- shadcn/ui components with CVA variants
- Lucide icons exclusively
- All colors via CSS custom properties — never raw values

The CSS files in `design-system/` are the source of truth for tokens and should be imported into the project's global stylesheet.

## Conventions

- [List your code style rules, naming conventions, etc.]
- [e.g., "Tailwind tokens only — never raw hex outside tailwind.config.js"]
- [e.g., "File naming: kebab-case.jsx, components export PascalCase"]

## Guardrails (Never Bypass)

- [Hard rules Claude must never break]
- [e.g., "No raw colors in components — use theme tokens"]
- [e.g., "No inline parseFloat without Number.isFinite() check"]
- [e.g., "No mocking what you can run for real"]

## Stakeholder Context

[Who cares about this project and what do they want? This helps Claude make judgment calls.]

- **[Name]:** [what they care about, what they've said]

## Reference Documents

[Pointers to transcripts, specs, designs, external docs that inform the work.]
