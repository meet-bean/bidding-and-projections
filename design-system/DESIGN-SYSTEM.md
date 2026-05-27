# Design System

This design system defines the shared visual language across all our projects. When building UI, follow these rules so everything looks and feels like one product family.

The raw CSS files in this `design-system/` folder can be copied into new projects as a starting point. The status/event color files include domain-specific examples from an existing project — keep what's relevant, remove what's not, and add your own following the same patterns.

---

## Preferred Stack

When starting a new project, default to this stack unless there's a strong reason not to:

| Layer | Choice |
|---|---|
| CSS Framework | Tailwind CSS v4 (config-in-CSS via `@theme`) |
| Component Library | shadcn/ui (install via `npx shadcn@latest init`) |
| Headless Primitives | Base UI (`@base-ui-components/react`) or Radix |
| Variant System | CVA (`class-variance-authority`) + `tailwind-merge` + `clsx` |
| Icons | Lucide React (`lucide-react`) |
| Animations | `tw-animate-css` |

If the project uses a different framework (Vue, vanilla HTML, etc.), apply the same color tokens, typography, and spacing — just translate the Tailwind classes to whatever the framework uses.

---

## Typography

| Property | Value |
|---|---|
| Body font | `'Inter', system-ui, sans-serif` |
| Monospace font | `'JetBrains Mono', monospace` |
| Serif font (rarely used) | `'Georgia', serif` |
| Base letter-spacing | `-0.01em` (slightly tight — this is a defining trait of the design) |
| Font smoothing | `antialiased` (always) |
| `text-xs` | `0.7rem` (smaller than Tailwind default) |
| `text-sm` | `0.8rem` (smaller than Tailwind default) |

**Rules:**
- Always load Inter from Google Fonts or bundle it
- Default tracking is tight (`-0.01em`). Don't override this unless you have a reason.
- Use `text-sm` for most UI text, `text-xs` for labels and metadata

---

## Colors

All colors use **OKLCH color space** for perceptual uniformity. Dark mode toggles via `.dark` class on the document root.

### Core Semantic Tokens

Use these via Tailwind classes like `bg-primary`, `text-muted-foreground`, etc.

| Token | Purpose |
|---|---|
| `primary` | Main interactive color. Near-black light, white dark. |
| `secondary` | Subtle backgrounds. Light gray. |
| `muted` | Disabled/deemphasized content. |
| `accent` | Hover states, highlights. |
| `destructive` | Errors, delete actions. Red. |
| `success` | Positive states, completions. Green. |
| `warning` | Caution, in-progress states. Amber. |
| `info` | Informational, pending states. Blue/violet. |

### Three-Tier Color Pattern

Every semantic color has three intensities for badges and indicators:

| Tier | Token suffix | Use case |
|---|---|---|
| Full | `bg-destructive text-destructive-foreground` | Primary buttons, strong signals |
| Accent | `bg-destructive-accent` | Medium emphasis text/icons |
| Soft | `bg-destructive-soft` | Light background tints |

This pattern applies to: `destructive`, `success`, `warning`, `info`, `primary`, `secondary`, `muted`.

### Chart Colors

For data visualization, use the 5 built-in chart tokens (`chart-1` through `chart-5`) or this hex palette:
`#3b82f6` (blue), `#10b981` (emerald), `#f59e0b` (amber), `#ef4444` (red), `#8b5cf6` (violet), `#06b6d4` (cyan), `#f97316` (orange), `#ec4899` (pink)

### Score Scale (0-100)

A 5-step gradient for compliance/quality scores:
- `score-0`: Red (bad)
- `score-25`: Orange
- `score-50`: Amber (neutral)
- `score-75`: Lime
- `score-100`: Green (good)

Each has a `-soft` variant for backgrounds. See `score-colors.css`.

### Status Colors

Domain-specific status badge colors are defined in `status-colors.css`. The semantic mapping:
- **Gray**: draft, cancelled, operator, default
- **Blue**: pending, info, active (comments)
- **Green**: published, active, completed, approved, site_manager
- **Amber**: in_progress, observation, supervisor, warning
- **Red**: rejected, destructive, admin
- **Purple**: archived, workflow
- **Teal**: acknowledged, training, acknowledger
- **Indigo**: certification, approver, executive

When adding new statuses in any project, follow this same color-to-meaning mapping.

---

## Spacing & Layout

| Property | Value |
|---|---|
| Spacing base | `0.25rem` (4px) — standard Tailwind |
| Border radius | `0.5rem` (8px) base. `radius-sm`=4px, `radius-md`=6px, `radius-lg`=8px, `radius-xl`=12px |
| Sidebar width | `16rem` (256px), collapses to `3rem` (48px) |
| Header height | `h-16` (64px) |
| Content padding | `p-4` with `gap-4` between sections |
| Mobile breakpoint | 768px |

**Rules:**
- Use Tailwind spacing scale exclusively — never write `margin: 13px`
- Default content gap is `gap-4` (16px)
- Cards and panels use `radius-lg` (8px)
- Small elements (badges, chips) use `radius-sm` (4px) or `radius-md` (6px)

---

## Component Patterns

### Buttons

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `success`, `warning`, `info`, `link`

Sizes: `default` (h-9), `xs` (h-6), `sm` (h-8), `lg` (h-10), `icon` (size-9), `icon-xs` (size-6), `icon-sm` (size-8), `icon-lg` (size-10)

Icons inside buttons default to `size-4` (16px), `size-3` (12px) for xs buttons.

### Badges

Variants: `primary`, `secondary`, `success`, `warning`, `info`, `outline`, `destructive`

Appearances: `default`, `light`, `outline`, `ghost`

Sizes: `lg` (h-7), `md` (h-6), `sm` (h-5), `xs` (h-4)

### Sidebar

- Collapsible with `200ms ease-out` animation
- Keyboard shortcut: `b`
- Three states: expanded (256px), icon-only (48px), mobile sheet (288px)

---

## Shadows

The shadow scale uses consistent `hsl(0 0% 0%)` with varying opacity. All shadows include a `2px` y-offset and `10px` blur as the base.

Use `shadow-sm` for cards, `shadow-md` for popovers/dropdowns, `shadow-lg` for modals.

---

## Guardrails

These rules must never be broken:

1. **No raw color values in components.** Always use CSS custom properties or Tailwind tokens. Write `bg-primary`, never `bg-[#1a1a2e]`.
2. **No pixel values for spacing.** Use the Tailwind spacing scale.
3. **Always support dark mode.** Every color token has a `.dark` variant. Use semantic tokens, not hardcoded OKLCH values.
4. **Font is Inter.** Don't switch to a different sans-serif without explicit approval.
5. **Letter-spacing stays tight.** The `-0.01em` base tracking is intentional. Don't reset it to `0`.
6. **Status colors follow the semantic mapping.** Green = positive, red = negative, blue = pending, amber = in-progress, gray = neutral. Don't invent new mappings.
7. **Icons are Lucide.** Don't mix in Heroicons, FontAwesome, or other libraries.
8. **Use CVA for component variants.** Don't build variant logic with ternary chains.

---

## How to Use in a New Project

1. Copy the `design-system/` folder into your project
2. Import `globals.css` (which pulls in the other CSS files) as your base styles
3. Install the matching dependencies:
   ```bash
   npm install tailwindcss@4 tw-animate-css lucide-react class-variance-authority tailwind-merge clsx
   npx shadcn@latest init
   ```
4. Add `Inter` and `JetBrains Mono` fonts (Google Fonts or local)
5. Reference this document in your `CLAUDE.md` under the Design System section
