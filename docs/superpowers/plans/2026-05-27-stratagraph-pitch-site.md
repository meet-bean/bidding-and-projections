# Stratagraph Pitch Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, single-page static website that serves as MeetBean's closing sales argument for the Stratagraph digital operations platform deal.

**Architecture:** Single `index.html` with Tailwind CSS via CDN and vanilla JavaScript. No build step, no framework. The page scrolls through sections: Hero → Feature Comparison → Support → Cost → Design (screenshots) → Why MeetBean (narrative) → CTA. All content is hardcoded. The site lives in `stratagraph-pitch/` at the repo root and is designed to be copied/moved independently.

**Tech Stack:** HTML5, Tailwind CSS v4 (CDN), vanilla JavaScript, Inter font (Google Fonts CDN)

---

## File Structure

```
stratagraph-pitch/
  index.html                  — entire site: HTML structure, embedded <style> for custom CSS, embedded <script> for interactions
  assets/
    images/
      meetbean-logo.svg       — MeetBean logo (SVG, inline-friendly)
      digineox-ui-1.png       — Digineox prototype screenshot #1 (extracted from proposal PDF p9)
      digineox-ui-2.png       — Digineox prototype screenshot #2 (extracted from proposal PDF p10)
      digineox-ui-3.png       — Digineox prototype screenshot #3 (extracted from proposal PDF p11)
      meetbean-ui-1.png       — MeetBean UI screenshot #1 (to be captured from running app)
      meetbean-ui-2.png       — MeetBean UI screenshot #2 (to be captured from running app)
      meetbean-ui-3.png       — MeetBean UI screenshot #3 (to be captured from running app)
```

---

### Task 1: Scaffold folder structure and base HTML shell

**Files:**
- Create: `stratagraph-pitch/index.html`
- Create: `stratagraph-pitch/assets/images/` (directory)

Sets up the full HTML document with Tailwind CDN, Inter font, sticky navigation, section anchors, and the scroll-to-section JS. All content sections are empty placeholder `<section>` tags — subsequent tasks fill them in.

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p "stratagraph-pitch/assets/images"
```

- [ ] **Step 2: Create index.html with base shell**

Create `stratagraph-pitch/index.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MeetBean — Built for Stratagraph</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
          },
          colors: {
            navy: {
              900: '#0f1729',
              800: '#1a2332',
              700: '#243044',
              600: '#2e3d56',
            },
            brand: {
              DEFAULT: '#3b82f6',
              light: '#60a5fa',
              dark: '#2563eb',
            },
            accent: {
              green: '#22c55e',
              amber: '#f59e0b',
              red: '#ef4444',
            },
          },
        },
      },
    }
  </script>
  <style>
    /* Scroll-triggered fade-in animation */
    .fade-in {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    }
    .fade-in.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Sticky nav shadow on scroll */
    nav.scrolled {
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* Bar chart animation */
    .bar-fill {
      transition: width 1s ease-out;
    }

    /* Toggle detail rows */
    .detail-row {
      display: none;
    }
    .detail-row.expanded {
      display: table-row;
    }
  </style>
</head>
<body class="font-sans text-gray-900 bg-white antialiased">

  <!-- Navigation -->
  <nav id="main-nav" class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 transition-shadow">
    <div class="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
      <a href="#hero" class="text-lg font-bold text-navy-900">meet<span class="text-brand">Bean</span></a>
      <div class="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
        <a href="#features" class="hover:text-navy-900 transition-colors">Features</a>
        <a href="#support" class="hover:text-navy-900 transition-colors">Support</a>
        <a href="#cost" class="hover:text-navy-900 transition-colors">Cost</a>
        <a href="#design" class="hover:text-navy-900 transition-colors">Design</a>
        <a href="#why" class="hover:text-navy-900 transition-colors">Why MeetBean</a>
        <a href="#cta" class="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">Get Started</a>
      </div>
    </div>
  </nav>

  <!-- Sections (content added in subsequent tasks) -->
  <section id="hero"></section>
  <section id="features"></section>
  <section id="support"></section>
  <section id="cost"></section>
  <section id="design"></section>
  <section id="why"></section>
  <section id="cta"></section>

  <!-- Scripts -->
  <script>
    // Scroll-triggered fade-in observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // Nav shadow on scroll
    const nav = document.getElementById('main-nav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    });

    // Feature table toggle
    function toggleDetails(btn) {
      const table = btn.closest('section').querySelector('table');
      const rows = table.querySelectorAll('.detail-row');
      const isExpanded = rows[0]?.classList.contains('expanded');
      rows.forEach(r => r.classList.toggle('expanded', !isExpanded));
      btn.textContent = isExpanded ? 'Show full breakdown ▾' : 'Hide breakdown ▴';
    }

    // Bar chart animation on scroll
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
          });
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.bar-chart').forEach(el => barObserver.observe(el));
  </script>

</body>
</html>
```

- [ ] **Step 3: Open in browser and verify the shell loads**

```bash
open stratagraph-pitch/index.html
```

Expected: blank page with sticky nav bar showing "meetBean" logo text and section links. Clicking nav links scrolls (to empty sections for now).

- [ ] **Step 4: Commit**

```bash
git add stratagraph-pitch/
git commit -m "feat(pitch): scaffold stratagraph pitch site with base HTML shell"
```

---

### Task 2: Build the Hero section

**Files:**
- Modify: `stratagraph-pitch/index.html` (replace empty `<section id="hero">`)

The hero has a dark navy background, centered headline, one-line value prop, and three summary cards in a row.

- [ ] **Step 1: Replace the hero section**

Replace `<section id="hero"></section>` with:

```html
<section id="hero" class="bg-navy-900 text-white pt-28 pb-20">
  <div class="max-w-6xl mx-auto px-6 text-center">
    <p class="text-brand-light font-semibold text-sm uppercase tracking-wider mb-4">Prepared for Stratagraph</p>
    <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
      Built for <span class="text-brand-light">Stratagraph</span>
    </h1>
    <p class="text-xl text-gray-300 max-w-2xl mx-auto mb-16">
      A digital operations platform configured to your six-phase workflow — from order intake through field execution to billing and closeout.
    </p>

    <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      <!-- Card 1: Technology Builders -->
      <div class="bg-navy-700 rounded-xl p-6 text-left">
        <div class="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center mb-4">
          <svg class="w-5 h-5 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
        </div>
        <h3 class="font-bold text-lg mb-2">Technology Builders</h3>
        <p class="text-gray-400 text-sm">We build software. They deliver projects.</p>
      </div>

      <!-- Card 2: Support Included -->
      <div class="bg-navy-700 rounded-xl p-6 text-left">
        <div class="w-10 h-10 bg-accent-green/20 rounded-lg flex items-center justify-center mb-4">
          <svg class="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <h3 class="font-bold text-lg mb-2">Support Included</h3>
        <p class="text-gray-400 text-sm">Every year. No renegotiation.</p>
      </div>

      <!-- Card 3: Lowest 3-Year Cost -->
      <div class="bg-navy-700 rounded-xl p-6 text-left">
        <div class="w-10 h-10 bg-accent-amber/20 rounded-lg flex items-center justify-center mb-4">
          <svg class="w-5 h-5 text-accent-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="font-bold text-lg mb-2">Lowest 3-Year Cost</h3>
        <p class="text-gray-400 text-sm">$50K vs $128K vs $35K*</p>
        <p class="text-gray-500 text-xs mt-1">*Digineox support costs unknown after Year 1</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Verify in browser**

Refresh the page. Expected: dark navy hero with "Built for Stratagraph" headline, subtitle, and three cards in a row.

- [ ] **Step 3: Commit**

```bash
git add stratagraph-pitch/index.html
git commit -m "feat(pitch): add hero section with summary cards"
```

---

### Task 3: Build the Feature Comparison section

**Files:**
- Modify: `stratagraph-pitch/index.html` (replace empty `<section id="features">`)

Summary-level comparison table with a toggle to expand the full 54-row breakdown. Data comes from the Google Drive spreadsheet "Stratagraph_Vendor_Comparison" — Cost Summary sheet rows 1-15 (summary) and Zyntergy in Digineox Groups sheet rows 1-54 (detail).

- [ ] **Step 1: Replace the features section**

Replace `<section id="features"></section>` with:

```html
<section id="features" class="py-20">
  <div class="max-w-6xl mx-auto px-6">
    <div class="fade-in">
      <h2 class="text-3xl font-bold mb-2">Feature Comparison</h2>
      <p class="text-gray-500 mb-10">What each vendor delivers — and what they don't.</p>
    </div>

    <div class="fade-in overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b-2 border-gray-200">
            <th class="text-left py-3 pr-4 font-semibold text-gray-700 w-2/5">Scope</th>
            <th class="text-center py-3 px-4 font-semibold text-gray-700 w-1/5">Digineox</th>
            <th class="text-center py-3 px-4 font-semibold text-gray-700 w-1/5">Zyntergy</th>
            <th class="text-center py-3 px-4 font-semibold text-brand-dark bg-blue-50 rounded-t-lg w-1/5">MeetBean</th>
          </tr>
        </thead>
        <tbody>
          <!-- Summary rows -->
          <tr class="border-b border-gray-100">
            <td class="py-3 pr-4 font-semibold">Functional & Integration Scope</td>
            <td class="text-center py-3 px-4 text-gray-600">Included</td>
            <td class="text-center py-3 px-4">$10,000</td>
            <td class="text-center py-3 px-4 bg-blue-50 font-semibold text-accent-green">Free</td>
          </tr>

          <!-- Detail rows for Functional & Integration -->
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Working prototype / clickable preview</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅ Completed</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Discovery sessions & requirements</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅ Completed</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Solution architecture & project plan</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅ Completed</td>
          </tr>

          <tr class="border-b border-gray-100">
            <td class="py-3 pr-4 font-semibold">Core Job Tracking</td>
            <td class="text-center py-3 px-4 text-gray-600">Included</td>
            <td class="text-center py-3 px-4">$35,000</td>
            <td class="text-center py-3 px-4 bg-blue-50 font-semibold">$12,500</td>
          </tr>

          <!-- Detail rows for Core Job Tracking -->
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Order management</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Crew & equipment scheduling</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Job execution / digitized order exec.</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Operational dashboards</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Executive dashboards</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">SharePoint / CRM integration</td>
            <td class="text-center py-2 px-4">Via SharePoint</td>
            <td class="text-center py-2 px-4">Via SharePoint</td>
            <td class="text-center py-2 px-4 bg-blue-50 font-medium text-brand-dark">Native</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">QuickBooks / billing integration</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">🔗 Integration</td>
          </tr>

          <tr class="border-b border-gray-100">
            <td class="py-3 pr-4 font-semibold">Field Operations</td>
            <td class="text-center py-3 px-4 text-gray-600">Included</td>
            <td class="text-center py-3 px-4">$23,000</td>
            <td class="text-center py-3 px-4 bg-blue-50 font-semibold">TBD</td>
          </tr>

          <!-- Detail rows for Field Operations -->
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Digital field tickets (photos + sigs)</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Digitized SOPs</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50 font-medium text-brand-dark">⚙️ Native module</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Shift management & handoffs</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">❓ Info needed</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Offline-capable field tablet access</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅ Can scope</td>
          </tr>

          <tr class="border-b border-gray-100">
            <td class="py-3 pr-4 font-semibold">Accounts, Docs & Master Data</td>
            <td class="text-center py-3 px-4 text-gray-600">Included</td>
            <td class="text-center py-3 px-4">$10,000</td>
            <td class="text-center py-3 px-4 bg-blue-50 font-semibold text-accent-green">Included</td>
          </tr>

          <!-- Detail rows for Accounts/Docs -->
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Centralized document repository</td>
            <td class="text-center py-2 px-4">Via SharePoint</td>
            <td class="text-center py-2 px-4">Via SharePoint</td>
            <td class="text-center py-2 px-4 bg-blue-50 font-medium text-brand-dark">Native</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Master data mgmt (operators, wells, crews)</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Single sign-on (Microsoft SSO)</td>
            <td class="text-center py-2 px-4">⚠️ TBD</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>

          <tr class="border-b border-gray-100">
            <td class="py-3 pr-4 font-semibold">Change Mgmt & Adoption Support</td>
            <td class="text-center py-3 px-4 text-gray-600">Included</td>
            <td class="text-center py-3 px-4">$10,000</td>
            <td class="text-center py-3 px-4 bg-blue-50 font-semibold text-accent-green">Included</td>
          </tr>

          <!-- Detail rows for Change Mgmt -->
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Workforce training & documentation</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Change impact assessment</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">N/A — replaced by Transformation Partner</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Communications & engagement plan</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>
          <tr class="detail-row border-b border-gray-50 bg-gray-50/50">
            <td class="py-2 pr-4 pl-6 text-gray-600">Go-live support</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4">✅</td>
            <td class="text-center py-2 px-4 bg-blue-50">✅</td>
          </tr>

          <!-- Totals -->
          <tr class="border-t-2 border-gray-300 font-bold">
            <td class="py-4 pr-4">Total (one-time, within scope)</td>
            <td class="text-center py-4 px-4">$15,000</td>
            <td class="text-center py-4 px-4">$88,000</td>
            <td class="text-center py-4 px-4 bg-blue-50 text-brand-dark">$12,500</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-4 text-center">
        <button onclick="toggleDetails(this)" class="text-brand hover:text-brand-dark text-sm font-medium transition-colors">
          Show full breakdown ▾
        </button>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Verify in browser**

Refresh the page. Expected: clean comparison table with summary rows visible and a "Show full breakdown" toggle button. Clicking the button reveals the detail rows. MeetBean column has a light blue background.

- [ ] **Step 3: Commit**

```bash
git add stratagraph-pitch/index.html
git commit -m "feat(pitch): add feature comparison section with expandable detail rows"
```

---

### Task 4: Build the Support Comparison section

**Files:**
- Modify: `stratagraph-pitch/index.html` (replace empty `<section id="support">`)

Focused table comparing support across the three vendors. MeetBean's column highlighted.

- [ ] **Step 1: Replace the support section**

Replace `<section id="support"></section>` with:

```html
<section id="support" class="py-20 bg-gray-50">
  <div class="max-w-6xl mx-auto px-6">
    <div class="fade-in">
      <h2 class="text-3xl font-bold mb-2">Support — Post Go-Live Partnership</h2>
      <p class="text-gray-500 mb-10">What happens after the platform is delivered.</p>
    </div>

    <div class="fade-in overflow-x-auto">
      <table class="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
        <thead>
          <tr class="border-b-2 border-gray-200">
            <th class="text-left py-4 px-6 font-semibold text-gray-700 w-2/5"></th>
            <th class="text-center py-4 px-4 font-semibold text-gray-700 w-1/5">Digineox</th>
            <th class="text-center py-4 px-4 font-semibold text-gray-700 w-1/5">Zyntergy</th>
            <th class="text-center py-4 px-4 font-semibold text-brand-dark bg-blue-50 w-1/5">MeetBean</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-gray-100">
            <td class="py-4 px-6 font-medium">Support duration</td>
            <td class="text-center py-4 px-4 text-gray-600">Until adoption milestone</td>
            <td class="text-center py-4 px-4 text-gray-600">Year 1 only</td>
            <td class="text-center py-4 px-4 bg-blue-50 font-semibold text-accent-green">✅ Included in service fee</td>
          </tr>
          <tr class="border-b border-gray-100">
            <td class="py-4 px-6 font-medium">Year 2+ dedicated support</td>
            <td class="text-center py-4 px-4"><span class="inline-flex items-center gap-1 text-amber-600">⚠️ Unknown</span></td>
            <td class="text-center py-4 px-4"><span class="inline-flex items-center gap-1 text-amber-600">⚠️ Unknown</span></td>
            <td class="text-center py-4 px-4 bg-blue-50 font-semibold text-accent-green">✅ Included in service fee</td>
          </tr>
          <tr>
            <td class="py-4 px-6 font-medium">Embedded transformation partner</td>
            <td class="text-center py-4 px-4 text-red-500">❌</td>
            <td class="text-center py-4 px-4 text-red-500">❌</td>
            <td class="text-center py-4 px-4 bg-blue-50 font-semibold text-accent-green">✅ Included in service fee</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="fade-in mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 class="font-bold text-lg mb-3">What is a Transformation Partner?</h3>
      <p class="text-gray-600 text-sm leading-relaxed">
        Not a helpdesk. An ongoing resource embedded in the engagement who works with Stratagraph to continuously expand the platform into new workflows, bring other tools and manual processes onto the platform, and reduce operational costs over time — not just in Year 1. The other vendors deliver and disengage. We stay and grow with you.
      </p>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Verify in browser**

Refresh. Expected: light gray background section with a clean 3-column support table and a callout card explaining the Transformation Partner.

- [ ] **Step 3: Commit**

```bash
git add stratagraph-pitch/index.html
git commit -m "feat(pitch): add support comparison section with transformation partner callout"
```

---

### Task 5: Build the Cost Comparison section

**Files:**
- Modify: `stratagraph-pitch/index.html` (replace empty `<section id="cost">`)

Visual bar chart showing 3-year cumulative cost, plus a breakdown table. All done with CSS (no chart library).

- [ ] **Step 1: Replace the cost section**

Replace `<section id="cost"></section>` with:

```html
<section id="cost" class="py-20">
  <div class="max-w-6xl mx-auto px-6">
    <div class="fade-in">
      <h2 class="text-3xl font-bold mb-2">3-Year Cost Comparison</h2>
      <p class="text-gray-500 mb-10">Total cumulative cost including software and annual fees.</p>
    </div>

    <!-- Bar Chart (CSS-only) -->
    <div class="fade-in bar-chart mb-12">
      <div class="space-y-6">
        <!-- Zyntergy -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-gray-700">Zyntergy</span>
            <span class="text-sm font-bold text-gray-900">$128,000</span>
          </div>
          <div class="h-10 bg-gray-100 rounded-lg overflow-hidden">
            <div class="bar-fill h-full bg-gray-400 rounded-lg" style="width: 0" data-width="100%"></div>
          </div>
        </div>

        <!-- MeetBean -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-brand-dark">MeetBean</span>
            <span class="text-sm font-bold text-brand-dark">$50,000</span>
          </div>
          <div class="h-10 bg-blue-50 rounded-lg overflow-hidden">
            <div class="bar-fill h-full bg-brand rounded-lg" style="width: 0" data-width="39%"></div>
          </div>
        </div>

        <!-- Digineox -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-gray-700">Digineox</span>
            <span class="text-sm font-bold text-gray-900">$35,300 <span class="font-normal text-amber-600 text-xs">+ unknown support</span></span>
          </div>
          <div class="h-10 bg-gray-100 rounded-lg overflow-hidden">
            <div class="bar-fill h-full bg-gray-300 rounded-lg" style="width: 0" data-width="28%"></div>
          </div>
          <p class="text-xs text-amber-600 mt-1">⚠️ Support costs after Year 1 are not specified in their contract</p>
        </div>
      </div>
    </div>

    <!-- Breakdown Table -->
    <div class="fade-in overflow-x-auto">
      <table class="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
        <thead>
          <tr class="border-b-2 border-gray-200">
            <th class="text-left py-4 px-6 font-semibold text-gray-700"></th>
            <th class="text-center py-4 px-4 font-semibold text-gray-700">End of Year 1</th>
            <th class="text-center py-4 px-4 font-semibold text-gray-700">End of Year 2</th>
            <th class="text-center py-4 px-4 font-semibold text-gray-700">End of Year 3</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-gray-100">
            <td class="py-4 px-6 font-medium">Digineox</td>
            <td class="text-center py-4 px-4">$15,000</td>
            <td class="text-center py-4 px-4">$25,000</td>
            <td class="text-center py-4 px-4">$35,300</td>
          </tr>
          <tr class="border-b border-gray-100">
            <td class="py-4 px-6 font-medium">Zyntergy</td>
            <td class="text-center py-4 px-4">$88,000</td>
            <td class="text-center py-4 px-4">$108,000</td>
            <td class="text-center py-4 px-4">$128,000</td>
          </tr>
          <tr class="bg-blue-50">
            <td class="py-4 px-6 font-bold text-brand-dark">MeetBean</td>
            <td class="text-center py-4 px-4 font-bold text-brand-dark">$25,000</td>
            <td class="text-center py-4 px-4 font-bold text-brand-dark">$37,500</td>
            <td class="text-center py-4 px-4 font-bold text-brand-dark">$50,000</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p class="text-sm text-amber-800">
          <strong>Note:</strong> Digineox appears cheapest on paper, but their support costs after Year 1 are unspecified in the contract — and they cover less scope. Zyntergy is 2.5× the cost. MeetBean is the best value: competitive pricing with support included every year.
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Verify in browser**

Refresh. Expected: animated horizontal bar chart (bars grow on scroll), followed by a cumulative cost breakdown table and an amber callout note.

- [ ] **Step 3: Commit**

```bash
git add stratagraph-pitch/index.html
git commit -m "feat(pitch): add cost comparison section with animated bar chart"
```

---

### Task 6: Extract Digineox screenshots from proposal PDF

**Files:**
- Create: `stratagraph-pitch/assets/images/digineox-ui-1.png`
- Create: `stratagraph-pitch/assets/images/digineox-ui-2.png`
- Create: `stratagraph-pitch/assets/images/digineox-ui-3.png`

Extract pages 9, 10, 11 from the Digineox proposal PDF as PNG images. These are the "SEG Solution Screenshots (Prototype)" pages.

- [ ] **Step 1: Extract PDF pages as images**

```bash
pdftoppm -png -r 200 -f 9 -l 11 "/Users/italo/Desktop/stratagraph-main/Stratagraph - Digital Operations Platform - Proposal - 20260429.pdf" stratagraph-pitch/assets/images/digineox-ui
```

This creates `digineox-ui-09.png`, `digineox-ui-10.png`, `digineox-ui-11.png`.

- [ ] **Step 2: Rename to clean filenames**

```bash
mv stratagraph-pitch/assets/images/digineox-ui-09.png stratagraph-pitch/assets/images/digineox-ui-1.png
mv stratagraph-pitch/assets/images/digineox-ui-10.png stratagraph-pitch/assets/images/digineox-ui-2.png
mv stratagraph-pitch/assets/images/digineox-ui-11.png stratagraph-pitch/assets/images/digineox-ui-3.png
```

- [ ] **Step 3: Verify images exist and look correct**

```bash
ls -la stratagraph-pitch/assets/images/digineox-ui-*.png
open stratagraph-pitch/assets/images/digineox-ui-1.png
```

Expected: three PNG files showing dense prototype screenshots from the Digineox proposal.

- [ ] **Step 4: Commit**

```bash
git add stratagraph-pitch/assets/images/
git commit -m "feat(pitch): extract Digineox prototype screenshots from proposal PDF"
```

---

### Task 7: Build the Design Comparison section

**Files:**
- Modify: `stratagraph-pitch/index.html` (replace empty `<section id="design">`)

Side-by-side panels showing Digineox prototype screenshots vs MeetBean UI. Uses placeholder boxes for MeetBean screenshots (to be captured later from the running app), and the extracted Digineox images.

- [ ] **Step 1: Replace the design section**

Replace `<section id="design"></section>` with:

```html
<section id="design" class="py-20 bg-gray-50">
  <div class="max-w-6xl mx-auto px-6">
    <div class="fade-in">
      <h2 class="text-3xl font-bold mb-2">Design Comparison</h2>
      <p class="text-gray-500 mb-10">The interface your team will use every day.</p>
    </div>

    <!-- Screenshot pair 1 -->
    <div class="fade-in grid md:grid-cols-2 gap-8 mb-12">
      <div>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <img src="assets/images/digineox-ui-1.png" alt="Digineox prototype - screen 1" class="w-full">
        </div>
        <p class="text-sm text-gray-500 mt-3 text-center">Digineox prototype</p>
      </div>
      <div>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-brand/30 ring-2 ring-brand/10">
          <div class="aspect-[16/10] bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
            <p class="text-gray-400 text-sm">MeetBean UI screenshot</p>
          </div>
        </div>
        <p class="text-sm text-brand-dark font-medium mt-3 text-center">MeetBean</p>
      </div>
    </div>

    <!-- Screenshot pair 2 -->
    <div class="fade-in grid md:grid-cols-2 gap-8 mb-12">
      <div>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <img src="assets/images/digineox-ui-2.png" alt="Digineox prototype - screen 2" class="w-full">
        </div>
        <p class="text-sm text-gray-500 mt-3 text-center">Digineox prototype</p>
      </div>
      <div>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-brand/30 ring-2 ring-brand/10">
          <div class="aspect-[16/10] bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
            <p class="text-gray-400 text-sm">MeetBean UI screenshot</p>
          </div>
        </div>
        <p class="text-sm text-brand-dark font-medium mt-3 text-center">MeetBean</p>
      </div>
    </div>

    <!-- Screenshot pair 3 -->
    <div class="fade-in grid md:grid-cols-2 gap-8">
      <div>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <img src="assets/images/digineox-ui-3.png" alt="Digineox prototype - screen 3" class="w-full">
        </div>
        <p class="text-sm text-gray-500 mt-3 text-center">Digineox prototype</p>
      </div>
      <div>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-brand/30 ring-2 ring-brand/10">
          <div class="aspect-[16/10] bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
            <p class="text-gray-400 text-sm">MeetBean UI screenshot</p>
          </div>
        </div>
        <p class="text-sm text-brand-dark font-medium mt-3 text-center">MeetBean</p>
      </div>
    </div>
  </div>
</section>
```

Note: The MeetBean side uses placeholder boxes. Once MeetBean UI screenshots are captured, replace the `<div class="aspect-[16/10]...">` placeholders with `<img src="assets/images/meetbean-ui-N.png" ...>` tags.

- [ ] **Step 2: Verify in browser**

Refresh. Expected: three side-by-side comparison pairs. Left shows Digineox prototype images. Right shows placeholder boxes (to be replaced with MeetBean screenshots).

- [ ] **Step 3: Commit**

```bash
git add stratagraph-pitch/index.html
git commit -m "feat(pitch): add design comparison section with side-by-side screenshot panels"
```

---

### Task 8: Build the Why MeetBean narrative section

**Files:**
- Modify: `stratagraph-pitch/index.html` (replace empty `<section id="why">`)

Five narrative subsections following the pyramid argument from the Notion outline. Each is concise and uses a consistent card layout.

- [ ] **Step 1: Replace the why section**

Replace `<section id="why"></section>` with:

```html
<section id="why" class="py-20">
  <div class="max-w-6xl mx-auto px-6">
    <div class="fade-in text-center mb-16">
      <h2 class="text-3xl font-bold mb-4">Why MeetBean</h2>
      <p class="text-xl text-gray-600 max-w-3xl mx-auto">
        We are technology builders. They are consultants. That one difference explains the product, the design, the support model, and why this relationship looks different after go-live.
      </p>
    </div>

    <!-- Argument 1: Technology Builders -->
    <div class="fade-in mb-12">
      <div class="flex items-start gap-4 mb-4">
        <span class="flex-shrink-0 w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center">1</span>
        <h3 class="text-xl font-bold">Decades of building technology used by millions</h3>
      </div>
      <div class="ml-12 text-gray-600 leading-relaxed space-y-3">
        <p>Our team has spent 10 to 20 years building products that had to earn adoption at scale. Consumer apps. Enterprise platforms. Software that millions of people open every day by choice.</p>
        <p>That experience changes how you think about every decision — what to build, what not to build, how a screen should feel at 6am on a job site, and what happens when the platform needs to grow six months after launch.</p>
        <p class="font-medium text-gray-800">Consultants deliver projects. We have spent careers shipping products.</p>
      </div>
    </div>

    <!-- Argument 2: Better Product -->
    <div class="fade-in mb-12">
      <div class="flex items-start gap-4 mb-4">
        <span class="flex-shrink-0 w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center">2</span>
        <h3 class="text-xl font-bold">A better product</h3>
      </div>
      <div class="ml-12 space-y-6">
        <div>
          <h4 class="font-semibold text-gray-800 mb-2">Design that people want to use</h4>
          <p class="text-gray-600 leading-relaxed">We put real work into UX and UI. Fewer elements on screen. Workflows that match how people actually think. A tool that feels fast and obvious — not like a form you have to fill out. The design comparison above speaks for itself.</p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-800 mb-2">SOPs via SharePoint is not a solution</h4>
          <p class="text-gray-600 leading-relaxed">Both competitors check the SOP box by connecting to SharePoint. That is not a solution — it is a folder with a link. Companies using SharePoint for SOPs deal with the same problems every time: wrong versions, no sign-off tracking, five different formats, nothing auditable, and field crews that stop looking after a week.</p>
          <p class="text-gray-600 leading-relaxed mt-2">MeetBean builds SOP management inside the platform. Write, version, assign, track acknowledgment, audit. The crew sees it in the same place they do everything else.</p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-800 mb-2">Integrations over custom builds</h4>
          <p class="text-gray-600 leading-relaxed">Where the real answer is a connection to an existing system, we use it. We do not propose a custom build to justify a bigger scope.</p>
        </div>
      </div>
    </div>

    <!-- Argument 3: Better Support -->
    <div class="fade-in mb-12">
      <div class="flex items-start gap-4 mb-4">
        <span class="flex-shrink-0 w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center">3</span>
        <h3 class="text-xl font-bold">Support that never ends</h3>
      </div>
      <div class="ml-12 text-gray-600 leading-relaxed space-y-3">
        <p>MeetBean support is included in the $12,500 annual service fee. Every year. No renegotiation. No surprise invoice when you need help in Year 3.</p>
        <p>The <strong class="text-gray-800">Transformation Partner</strong> is the real differentiator. It is not a helpdesk — it is an ongoing resource that helps Stratagraph expand the platform into new workflows, replace manual processes, and reduce costs over time.</p>
        <p>Most digital transformations stall because the vendor leaves and nobody knows what to do next. The Transformation Partner is specifically there to prevent that. The platform grows as Stratagraph grows, and someone who knows the system is always in the room.</p>
      </div>
    </div>

    <!-- Argument 4: Future of Software -->
    <div class="fade-in mb-12">
      <div class="flex items-start gap-4 mb-4">
        <span class="flex-shrink-0 w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center">4</span>
        <h3 class="text-xl font-bold">The future of software</h3>
      </div>
      <div class="ml-12">
        <p class="text-gray-600 leading-relaxed mb-6">The goal is to make Stratagraph independent — not to create dependency.</p>
        <div class="space-y-4">
          <div class="flex items-start gap-4 bg-gray-50 rounded-xl p-5">
            <span class="flex-shrink-0 text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded">Phase 1</span>
            <div>
              <p class="font-semibold text-gray-800 text-sm">Now</p>
              <p class="text-gray-600 text-sm">MeetBean builds rapidly on the platform and trains it on Stratagraph's workflows and terminology.</p>
            </div>
          </div>
          <div class="flex items-start gap-4 bg-gray-50 rounded-xl p-5">
            <span class="flex-shrink-0 text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded">Phase 2</span>
            <div>
              <p class="font-semibold text-gray-800 text-sm">Near-term</p>
              <p class="text-gray-600 text-sm">Stratagraph's own team creates enhancements — new workflows, forms, reports — without waiting for MeetBean.</p>
            </div>
          </div>
          <div class="flex items-start gap-4 bg-gray-50 rounded-xl p-5">
            <span class="flex-shrink-0 text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded">Phase 3</span>
            <div>
              <p class="font-semibold text-gray-800 text-sm">The destination</p>
              <p class="text-gray-600 text-sm">Stratagraph builds full, production-grade internal apps — secure, scalable, with proper backend infrastructure — without a development team.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Argument 5: Partnership -->
    <div class="fade-in mb-0">
      <div class="flex items-start gap-4 mb-4">
        <span class="flex-shrink-0 w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center">5</span>
        <h3 class="text-xl font-bold">A partnership — not a transaction</h3>
      </div>
      <div class="ml-12">
        <p class="text-gray-600 leading-relaxed mb-4">This is not a transaction. We see real opportunity here.</p>
        <blockquote class="border-l-4 border-brand pl-5 py-2 bg-blue-50 rounded-r-lg">
          <p class="text-gray-700 italic leading-relaxed">
            How Stratagraph went from manual, fragmented processes to a fully digital, integrated operation — all consolidated under a single platform — enabling faster decisions, lower costs, and a scalable foundation for growth.
          </p>
        </blockquote>
        <p class="text-gray-600 leading-relaxed mt-4">That story matters to us. Stratagraph becomes the flagship example of what's possible when an organization skips the usual multi-vendor chaos and bets on a unified, modern foundation instead. We want to build it together.</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Verify in browser**

Refresh. Expected: five numbered argument sections with clean typography, phase cards for the "future of software" section, and a blockquote for the partnership case study.

- [ ] **Step 3: Commit**

```bash
git add stratagraph-pitch/index.html
git commit -m "feat(pitch): add Why MeetBean narrative section with five pyramid arguments"
```

---

### Task 9: Build the CTA section

**Files:**
- Modify: `stratagraph-pitch/index.html` (replace empty `<section id="cta">`)

Dark navy closing section with a call to action and contact information.

- [ ] **Step 1: Replace the CTA section**

Replace `<section id="cta"></section>` with:

```html
<section id="cta" class="py-20 bg-navy-900 text-white">
  <div class="max-w-3xl mx-auto px-6 text-center">
    <div class="fade-in">
      <h2 class="text-3xl md:text-4xl font-bold mb-6">Ready to move forward?</h2>
      <p class="text-gray-300 text-lg mb-10 leading-relaxed">
        We've done the discovery. We've built the prototype. The platform is configured to your workflow and ready for the next step.
      </p>
      <div class="inline-flex flex-col sm:flex-row items-center gap-4">
        <a href="mailto:italo@meetbean.ai" class="bg-brand hover:bg-brand-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors text-lg">
          Let's Talk
        </a>
      </div>
      <div class="mt-12 pt-8 border-t border-navy-700">
        <p class="text-gray-400 text-sm">
          <span class="font-semibold text-gray-300">MeetBean</span> · italo@meetbean.ai
        </p>
      </div>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="bg-navy-900 border-t border-navy-700 py-6">
  <div class="max-w-6xl mx-auto px-6 text-center">
    <p class="text-gray-500 text-xs">Confidential — Prepared for Stratagraph · May 2026</p>
  </div>
</footer>
```

- [ ] **Step 2: Verify in browser**

Refresh. Expected: dark navy CTA section with centered headline, email link button, and confidential footer.

- [ ] **Step 3: Commit**

```bash
git add stratagraph-pitch/index.html
git commit -m "feat(pitch): add CTA section and footer"
```

---

### Task 10: Polish and final scroll animation wiring

**Files:**
- Modify: `stratagraph-pitch/index.html` (update the `<script>` section at the bottom)

The IntersectionObserver for `.fade-in` elements was set up in Task 1, but it runs before the DOM has all the elements. Move the observer initialization to a `DOMContentLoaded` listener, and add active nav link highlighting on scroll.

- [ ] **Step 1: Replace the script block at the bottom of the body**

Replace the existing `<script>` block (just before `</body>`) with:

```html
<script>
  document.addEventListener('DOMContentLoaded', () => {
    // Scroll-triggered fade-in observer
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

    // Bar chart animation on scroll
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
          });
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.bar-chart').forEach(el => barObserver.observe(el));

    // Nav shadow on scroll
    const nav = document.getElementById('main-nav');
    const navLinks = nav.querySelectorAll('a[href^="#"]');
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', () => {
      // Shadow
      nav.classList.toggle('scrolled', window.scrollY > 10);

      // Active link highlighting
      let current = '';
      sections.forEach(section => {
        const top = section.offsetTop - 100;
        if (window.scrollY >= top) {
          current = section.getAttribute('id');
        }
      });
      navLinks.forEach(link => {
        link.classList.remove('text-navy-900', 'font-semibold');
        if (link.getAttribute('href') === `#${current}`) {
          link.classList.add('text-navy-900', 'font-semibold');
        }
      });
    });
  });

  // Feature table toggle (needs to be global for onclick)
  function toggleDetails(btn) {
    const table = btn.closest('section').querySelector('table');
    const rows = table.querySelectorAll('.detail-row');
    const isExpanded = rows[0]?.classList.contains('expanded');
    rows.forEach(r => r.classList.toggle('expanded', !isExpanded));
    btn.textContent = isExpanded ? 'Show full breakdown ▾' : 'Hide breakdown ▴';
  }
</script>
```

- [ ] **Step 2: Full end-to-end verification in browser**

Open the page fresh and scroll through the entire site:
1. Hero loads with dark navy background and three cards
2. Scroll to Features — table appears with fade animation, toggle works
3. Scroll to Support — table with green checkmarks on MeetBean column
4. Scroll to Cost — bar chart animates on scroll, breakdown table visible
5. Scroll to Design — side-by-side screenshots (Digineox images + MeetBean placeholders)
6. Scroll to Why MeetBean — five numbered arguments, phase cards, blockquote
7. Scroll to CTA — dark navy closing with email button
8. Nav links highlight the active section while scrolling
9. Nav shadow appears when scrolled past top

- [ ] **Step 3: Commit**

```bash
git add stratagraph-pitch/index.html
git commit -m "feat(pitch): wire up scroll animations, active nav highlighting, and DOMContentLoaded"
```

---

### Task 11: Capture MeetBean UI screenshots (manual step)

**Files:**
- Create: `stratagraph-pitch/assets/images/meetbean-ui-1.png`
- Create: `stratagraph-pitch/assets/images/meetbean-ui-2.png`
- Create: `stratagraph-pitch/assets/images/meetbean-ui-3.png`
- Modify: `stratagraph-pitch/index.html` (replace placeholder divs with `<img>` tags)

This task requires the Stratagraph app to be running to capture screenshots of the MeetBean UI. The screenshots should show comparable views to the Digineox prototype pages (dashboard, scheduling/job list, and field execution/ticket view).

- [ ] **Step 1: Start the Stratagraph app**

```bash
cd work/stratagraph-main && pnpm dev
```

- [ ] **Step 2: Capture three screenshots from the running app**

Navigate to:
1. Home/Dashboard view → save as `stratagraph-pitch/assets/images/meetbean-ui-1.png`
2. Jobs or Bids list view → save as `stratagraph-pitch/assets/images/meetbean-ui-2.png`
3. Job detail or Ticket view → save as `stratagraph-pitch/assets/images/meetbean-ui-3.png`

Use browser screenshot tools or the computer-use MCP to capture.

- [ ] **Step 3: Replace placeholder divs in index.html**

In the design section, replace each of the three placeholder blocks:

```html
<div class="aspect-[16/10] bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
  <p class="text-gray-400 text-sm">MeetBean UI screenshot</p>
</div>
```

With the corresponding image:

```html
<img src="assets/images/meetbean-ui-1.png" alt="MeetBean UI - Dashboard" class="w-full">
```

(Use `meetbean-ui-2.png` and `meetbean-ui-3.png` for the second and third pairs respectively.)

- [ ] **Step 4: Verify in browser**

Refresh. Expected: side-by-side screenshots show real Digineox vs MeetBean UI comparisons.

- [ ] **Step 5: Commit**

```bash
git add stratagraph-pitch/
git commit -m "feat(pitch): add MeetBean UI screenshots to design comparison"
```
