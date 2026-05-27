# Claude Starter Kit

Drop the `.claude/` folder and `CLAUDE.md` template into any new project to get the same workflow discipline, plugins, and guardrails used on the Superior Construction projections app.

## What's inside

### 1. `CLAUDE.md` (template)
Copy into your project root and fill in the sections. This is the single most important file — it tells Claude what the project is, how to build it, and what never to do.

### 2. `.claude/settings.json`
Project-level hooks. The PreCompact hook reminds Claude to update CLAUDE.md before context gets compacted, so knowledge survives across long sessions.

### 3. `global-settings.json`
Your global Claude Code settings — plugins (Superpowers, Anthropic skills), marketplaces, and default permission mode. Lives at `~/.claude/settings.json`.

### 4. `design-system/`
Shared visual language — CSS token files and a reference doc (`DESIGN-SYSTEM.md`) that teaches Claude how to style things consistently. Includes globals.css, status-colors.css, score-colors.css, event-colors.css.

### 5. `memory/` (examples)
Example memory files from a real project. Shows the format for user, feedback, project, and reference memories.

## Setup for a new project

```bash
# 1. Copy project files
cp CLAUDE-TEMPLATE.md /path/to/your-project/CLAUDE.md
cp -r .claude /path/to/your-project/.claude
cp -r design-system /path/to/your-project/design-system

# 2. Make sure global settings have the plugins enabled
# (compare global-settings.json with your ~/.claude/settings.json)

# 3. Edit CLAUDE.md — fill in your project's details

# 4. When setting up your project's styles, import the design system:
#    @import './design-system/globals.css';
#    (or copy the token values into your own globals.css)
```

## Plugins this kit depends on

- **Superpowers** (obra/superpowers-marketplace) — brainstorming, plans, verification, parallel agents, TDD, debugging
- **Anthropic Official Skills** (anthropics/skills) — frontend-design, code-review, security-guidance, feature-dev
