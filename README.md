# AI Content Risk Checker ⚠️

> **Governance-first content review for content and marketing teams.**

A polished, production-quality web application that scans AI-assisted draft content for publishability and governance risks before it goes live. Built for content marketers, product marketers, editorial leads, brand reviewers, and content ops managers.

---

## 🔍 What It Does

Paste any draft — a blog post, landing page, paid ad, case study, social post, or email — and run a structured governance scan across 5 risk categories:

| Category | What It Checks |
|----------|---------------|
| **Claims Risk** | Unsupported stats, outcome guarantees, superlatives, certainty language |
| **Privacy Risk** | Personal data, email addresses, customer identifiers, PHI references |
| **Bias Risk** | Exclusionary wording, age-coded language, demographic generalizations |
| **Testimonial / Authenticity Risk** | Quote-style content, implied endorsements, unverified attribution |
| **Citation / Source Risk** | "Studies show" language, unsourced percentages, vague authority claims |

For every flag, the app explains **what was flagged**, **why it matters**, **how severe it is**, **which reviewers are required**, and **what action to take next**.

---

## 🗂️ Screens

1. **Dashboard** — Stats overview, recent reviews, governance status
2. **New Review** — Content input + context settings (type, channel, stage, tags)
3. **Results** — Score ring, category bars, flagged passages, review routing, actions
4. **Audit Log** — Searchable/filterable history table, CSV export
5. **Review Detail** — Full audit record for any past review
6. **Governance Rules** — Risk thresholds, watch terms, reviewer mappings, policies

---

## 🚀 Quick Start

No build step required. Pure HTML + CSS + JavaScript.

### Option 1: Visit the Live Site (GitHub Pages)
Visit: [AI Content Risk Checker Live](https://saisrikiran25-ctrl.github.io/AI_Risk_Checker/)

### Option 2: Open index.html directly
Simply double-click the [index.html](file:///c:/Users/Sai%20Kiran/Downloads/New%20folder%20(4)/index.html) file to open the application in any web browser.

### Option 3: Run a local development server
Run a local Python server:
```bash
python -m http.server 7823
# Then visit: http://localhost:7823
```

Or with Node:
```bash
npx serve .
# Then visit: http://localhost:3000
```

---

## 📁 File Structure

```
├── index.html      # App shell — all 6 views, sidebar, modals
├── styles.css      # Design system — dark theme, all component styles
├── app.js          # Scan engine, state management, rendering, export
└── README.md
```

---

## ⚙️ Risk Engine

The scan combines:
- **Deterministic regex pattern matching** — 30+ rules across 5 categories
- **Context weighting** — multipliers by content type (paid ads score highest), workflow stage, and context tags
- **Weighted scoring model**: Claims (30%) · Citation (25%) · Testimonial (20%) · Privacy (15%) · Bias (10%)
- **Configurable governance rules** — thresholds, watch terms, reviewer mappings, and restricted content policies

Risk labels: **Low** (0–30) · **Medium** (31–59) · **High** (60–79) · **Critical** (80+)

---

## 🔀 Review Routing Logic

| Risk Level | Example Routing |
|------------|----------------|
| Low | Editor review |
| Medium | Editor + Content Lead |
| High | PMM + Legal/Compliance |
| Critical | Stop publish → Escalate to Legal/Compliance |

Plus automatic escalation for: privacy data exposure, unverified testimonials, founder voice content.

---

## 📦 Sample Draft Templates

The application starts with a clean slate for your organization's reviews. To test the live AI risk checker immediately, go to the **New Review** view and click the **"Load Sample"** button in the upper right corner. It will populate the editor with draft text containing various risk markers (such as absolute guarantees, personal emails, age-coded hiring descriptions, and unsourced statistics) for the AI scan engine to detect.

---

## 💾 Persistence & Export

- **localStorage** — reviews and governance config persist across sessions
- **Review export** — structured plain-text summary (clipboard-ready)
- **Audit log CSV export** — full history download

---

## ⚖️ Governance Principle

> This tool **supports human oversight**. It flags likely issues for review — it does not guarantee compliance, replace legal judgment, or certify content as publication-ready. **All final decisions belong to named human reviewers.**

---

## 🛠️ Built With

- **HTML5** — semantic markup, accessible structure
- **Vanilla CSS** — custom design system, dark theme, CSS variables
- **Vanilla JavaScript** — no frameworks, no dependencies, no build tools
- **Google Fonts** — Inter + JetBrains Mono
- **localStorage** — client-side state persistence

---

## 👤 Target Users

Content marketers · Product marketers · Content ops managers · Editorial leads · Brand reviewers · Agency strategists · Marketing compliance reviewers · Founders / heads of marketing

---

*Built as a governance-first content review tool for teams using AI in their content workflows.*
