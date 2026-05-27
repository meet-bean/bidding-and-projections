# Stratagraph Pitch Site — Design Spec

## Overview

A standalone, single-page static website that serves as MeetBean's closing argument to win the Stratagraph digital operations platform deal. The site compares MeetBean against two competitors (Digineox and Zyntergy) across features, support, cost, and design — then makes the case for why MeetBean is the right choice.

**Audience:** Decision-maker(s) at Stratagraph — must be polished, self-explanatory, and persuasive without narration.

**Goal:** Closing argument — the reader should be ready to choose MeetBean after viewing.

**Tone:** Professional and measured. Let data and comparisons speak. No hype.

## Content Sources

1. **Notion "Stratagraph outline"** — the content structure to follow
2. **Google Drive "Stratagraph_Vendor_Comparison"** — authoritative data for costs and feature comparison
3. Notion comparison/presentation pages — reference only, too verbose for direct use
4. Digineox proposal PDF — competitor screenshots (pages 9-11) and pricing details
5. Zyntergy Package Menu PDF — competitor pricing and package breakdown

## Tech Stack

- Single `index.html` file — no build step, no framework
- Tailwind CSS via CDN
- Vanilla JavaScript for interactivity (scroll animations, table toggles)
- No external dependencies beyond CDN links
- Opens directly from filesystem or any static host

## Folder Structure

```
stratagraph-pitch/
  index.html
  assets/
    images/       — logos, screenshots (Digineox prototype + MeetBean UI)
```

Located at the root of the working directory. Designed to be moved/copied independently.

## Page Sections

### 1. Hero / Summary

- MeetBean logo
- Headline: "Built for Stratagraph"
- One-line value proposition
- Three summary cards:
  - **Technology Builders** — "We build software. They deliver projects."
  - **Support Included** — "Every year. No renegotiation."
  - **Lowest 3-Year Cost** — "$50K vs $128K vs $35K*" (*with note about Digineox unknown support costs)

### 2. Feature Comparison

Maps to: Cost Summary sheet rows 1-15, with toggle to full feature list (rows 1-54).

A responsive table comparing MeetBean, Digineox, and Zyntergy across:

**Default view (summary):**
- Functional & Integration Scope
- Digital Ops Platform Modules (Core Job Tracking, Field Operations, Accounts/Docs/Master Data)
- Change Mgmt & Adoption Support
- Cumulative one-time totals

Each cell shows: checkmark (included), warning icon (partial/unknown), X (not included), or dollar amount.

**Expanded view (toggle):**
Full 54-row feature-level breakdown with individual line items (order management, crew scheduling, digital field tickets, SOPs, SSO, etc.) and MeetBean notes column.

### 3. Support Comparison

Maps to: Support table from the outline.

Focused 3-column comparison table:

| | Digineox | Zyntergy | MeetBean |
|---|---|---|---|
| Support duration | Until adoption milestone | Year 1 only | Included in service fee |
| Year 2+ dedicated support | Unknown | Unknown | Included in service fee |
| Embedded transformation partner | No | No | Included in service fee |

MeetBean column visually highlighted (brand accent color or green).

### 4. Cost Comparison

Maps to: Cost Summary sheet rows 17-36.

**Visual element:** A simple bar chart or visual comparison showing 3-year cumulative cost:
- Digineox: $35,300 (but support unknown after Year 1)
- Zyntergy: $128,000
- MeetBean: $50,000

**Breakdown table (cumulative):**

| | End of Year 1 | End of Year 2 | End of Year 3 |
|---|---|---|---|
| Digineox | $15,000 | $25,000 | $35,300 |
| Zyntergy | $88,000 | $108,000 | $128,000 |
| MeetBean | $25,000 | $37,500 | $50,000 |

Key callout: Digineox is cheapest on paper but has unknown support costs after Year 1 and covers less scope. Zyntergy is 2.5x the cost. MeetBean is the middle ground with the best value (support included every year).

### 5. Design Comparison (Screenshots)

Maps to: "Add screenshots from Digineox proposal pages 9-11"

Side-by-side panels:
- **Left:** Digineox prototype screenshots (dense tables, cluttered filters, no visual hierarchy)
- **Right:** MeetBean UI screenshots (clean, purposeful, field-ready)

Brief neutral captions. The visual contrast does the persuasion — no editorializing needed.

Images will be placed in `assets/images/`. Digineox screenshots extracted from the proposal PDF. MeetBean screenshots to be provided or captured from the existing platform.

### 6. Why MeetBean (Pyramid Argument)

Maps to: "Where are we better" section from the outline. Five subsections, each concise.

**Main thesis:** We are technology builders. They are consultants.

**6a. Decades of building technology used by millions**
Our team has 10-20 years of experience building products that had to earn adoption at scale. Consumer apps, enterprise platforms, software people open every day by choice. Consultants deliver projects. We ship products.

**6b. Better product**
Three sub-points:
- *Design:* Fewer clicks, cleaner interfaces, workflows that match how field crews think. Reference the screenshots above.
- *SOPs via SharePoint is not a solution:* Both competitors check the SOP box with a SharePoint link. That doesn't solve the problem — wrong versions, no sign-off tracking, unauditable, field crews ignore it. MeetBean builds SOP management natively inside the platform.
- *Integrations over custom builds:* Where an existing system connection is the right answer, we use it instead of proposing a build to inflate scope.

**6c. Better support**
- MeetBean support included every year in the $12,500 annual fee. No renegotiation.
- Embedded Transformation Partner — not a helpdesk, an ongoing resource that helps expand the platform, replace manual processes, reduce costs over time.
- Skip the pain of transformation — most digital transformations stall because the vendor leaves. The Transformation Partner prevents that.

**6d. The future of software**
Three-phase roadmap:
- Phase 1 (Now): MeetBean builds rapidly, trains the system on Stratagraph workflows
- Phase 2 (Near-term): Stratagraph's team creates enhancements themselves
- Phase 3 (Destination): Stratagraph builds full internal apps independently — no development team needed

The goal is independence, not dependency.

**6e. A partnership, not a transaction**
Case study framing: Stratagraph becomes the flagship example of going from manual, fragmented processes to a fully digital, integrated operation on a single platform. MeetBean wants to build that story together.

### 7. Call to Action

Simple closing section:
- "Ready to move forward?"
- Contact information
- Next step prompt

## Visual Design

- **Color palette:** Dark navy (#1a2332 range) background for hero/CTA, white for content sections, MeetBean brand accent color for highlights and the MeetBean column in tables
- **Typography:** Clean sans-serif via Tailwind defaults (Inter or system stack)
- **Layout:** Full-width sections, max-width content container (~1100px), generous whitespace
- **Tables:** Clean, minimal borders, MeetBean column subtly highlighted
- **Responsive:** Works on desktop and tablet (primary viewing contexts for a decision-maker)
- **Animations:** Subtle scroll-triggered fade-ins. Nothing distracting.

## What's NOT in Scope

- No backend, no database, no authentication
- No CMS — content is hardcoded in the HTML
- No email capture or analytics (can be added later if needed)
- No mobile-first optimization (decision-makers will view on desktop/tablet)
