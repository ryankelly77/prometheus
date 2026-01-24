# Prometheus UI/UX Specifications
## Restaurant KPI Dashboard

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Tech Stack for UI](#tech-stack-for-ui)
3. [Design System](#design-system)
4. [Component Library](#component-library)
5. [Chart Specifications](#chart-specifications)
6. [Page Layouts](#page-layouts)
7. [Responsive & Mobile Design](#responsive--mobile-design)
8. [Animations & Micro-interactions](#animations--micro-interactions)
9. [Accessibility](#accessibility)
10. [White-Label Theming](#white-label-theming)

---

## Design Philosophy

### Core Principles

1. **Data-First** — Charts and metrics are the heroes; UI should amplify, not compete
2. **Scannable** — Executives should understand health in 3 seconds
3. **Delightful** — Smooth animations, satisfying interactions, premium feel
4. **Mobile-Native** — Not just responsive; truly designed for touch and small screens
5. **White-Label Ready** — Every color, logo, and brand element must be themeable

### Design Inspiration

- **Vercel Dashboard** — Clean, modern, excellent dark mode
- **Linear** — Smooth animations, keyboard-first, premium feel
- **Stripe Dashboard** — Data visualization excellence
- **Arc Browser** — Playful yet professional

---

## Tech Stack for UI

### Core Libraries

| Library | Purpose | Why |
|---------|---------|-----|
| **Tailwind CSS v4** | Styling | Utility-first, easy theming, great DX |
| **shadcn/ui** | Component base | Accessible, customizable, not a dependency |
| **Radix UI** | Primitives | Accessible, unstyled, composable |
| **Framer Motion** | Animations | Declarative, performant, gesture support |
| **Tremor** | Charts & dashboards | Built for React, beautiful defaults, Tailwind-native |
| **Recharts** | Custom charts | When Tremor isn't flexible enough |
| **Lucide React** | Icons | Clean, consistent, tree-shakeable |
| **next-themes** | Dark mode | SSR-safe theme switching |
| **nuqs** | URL state | Type-safe search params for filters |

### Font Stack

```css
--font-sans: 'Geist', 'Inter', system-ui, sans-serif;
--font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
```

**Geist** by Vercel — Modern, excellent legibility, variable font with great number rendering (critical for dashboards).

---

## Design System

### Color Palette

#### Semantic Colors (Light Mode)

```css
/* Backgrounds */
--background: #ffffff;
--background-subtle: #fafafa;
--background-muted: #f4f4f5;
--background-elevated: #ffffff;

/* Foregrounds */
--foreground: #09090b;
--foreground-muted: #71717a;
--foreground-subtle: #a1a1aa;

/* Borders */
--border: #e4e4e7;
--border-muted: #f4f4f5;

/* Primary (Prometheus brand — customizable per white-label) */
--primary: #6366f1;
--primary-foreground: #ffffff;
--primary-hover: #4f46e5;
--primary-muted: #e0e7ff;

/* Health Score Colors */
--health-excellent: #22c55e;    /* Green — ≥100% */
--health-good: #84cc16;         /* Lime — 90-99% */
--health-warning: #eab308;      /* Yellow — 80-89% */
--health-danger: #ef4444;       /* Red — <80% */

/* Chart Colors (accessible, distinguishable) */
--chart-1: #6366f1;   /* Indigo */
--chart-2: #8b5cf6;   /* Violet */
--chart-3: #06b6d4;   /* Cyan */
--chart-4: #10b981;   /* Emerald */
--chart-5: #f59e0b;   /* Amber */
--chart-6: #ec4899;   /* Pink */
--chart-7: #64748b;   /* Slate */
```

#### Semantic Colors (Dark Mode)

```css
/* Backgrounds */
--background: #09090b;
--background-subtle: #18181b;
--background-muted: #27272a;
--background-elevated: #18181b;

/* Foregrounds */
--foreground: #fafafa;
--foreground-muted: #a1a1aa;
--foreground-subtle: #71717a;

/* Borders */
--border: #27272a;
--border-muted: #3f3f46;
```

### Typography Scale

```css
/* Size scale (using clamp for fluid typography) */
--text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.8rem);      /* 12-13px */
--text-sm: clamp(0.8125rem, 0.75rem + 0.3vw, 0.875rem); /* 13-14px */
--text-base: clamp(0.875rem, 0.8rem + 0.4vw, 1rem);     /* 14-16px */
--text-lg: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);       /* 16-18px */
--text-xl: clamp(1.125rem, 1rem + 0.6vw, 1.25rem);      /* 18-20px */
--text-2xl: clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem);     /* 20-24px */
--text-3xl: clamp(1.5rem, 1.3rem + 1vw, 1.875rem);      /* 24-30px */
--text-4xl: clamp(1.875rem, 1.5rem + 1.5vw, 2.25rem);   /* 30-36px */
--text-5xl: clamp(2.25rem, 1.8rem + 2vw, 3rem);         /* 36-48px */

/* Font weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* Letter spacing */
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
```

### Spacing Scale

```css
/* Base unit: 4px */
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px — small elements */
--radius-md: 0.5rem;     /* 8px — buttons, inputs */
--radius-lg: 0.75rem;    /* 12px — cards */
--radius-xl: 1rem;       /* 16px — modals, large cards */
--radius-2xl: 1.5rem;    /* 24px — hero elements */
--radius-full: 9999px;   /* pills, avatars */
```

### Shadows

```css
/* Subtle, layered shadows for depth */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Colored shadows for interactive elements */
--shadow-primary: 0 4px 14px 0 rgb(99 102 241 / 0.25);
--shadow-success: 0 4px 14px 0 rgb(34 197 94 / 0.25);
--shadow-danger: 0 4px 14px 0 rgb(239 68 68 / 0.25);

/* Dark mode shadows (use elevation instead of shadows) */
--shadow-dark-sm: 0 0 0 1px rgb(255 255 255 / 0.05);
--shadow-dark-md: 0 0 0 1px rgb(255 255 255 / 0.1);
```

---

## Component Library

### Cards

#### Metric Card
The primary container for individual KPIs.

```
┌────────────────────────────────────────────────┐
│  ┌──────┐                                      │
│  │ icon │  Metric Label              ⓘ        │
│  └──────┘                                      │
│                                                │
│         $507,855.00                            │
│         ▲ 12.3% vs last month                  │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │         [Sparkline Chart]              │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │ Health   │  89%  │ ∿∿∿ │ 26.8 / 30    │  │
│  │ Score    │  🟡   │     │              │  │
│  └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

**Specifications:**
- Background: `var(--background-elevated)`
- Border: `1px solid var(--border)`
- Border radius: `var(--radius-lg)`
- Padding: `var(--space-6)`
- Shadow: `var(--shadow-sm)` on hover → `var(--shadow-md)`
- Transition: `all 200ms ease`

**Metric Value Typography:**
- Font size: `var(--text-3xl)` or `var(--text-4xl)` for hero metrics
- Font weight: `var(--font-semibold)`
- Letter spacing: `var(--tracking-tight)`
- Use tabular numbers: `font-variant-numeric: tabular-nums`

**Change Indicator:**
- Positive: `var(--health-excellent)` with ▲
- Negative: `var(--health-danger)` with ▼
- Neutral: `var(--foreground-muted)`

---

#### Health Score Card (Hero)

The main overall health score — largest element on dashboard.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              Overall Health Score                        │
│                                                          │
│    ┌──────────────────────────────────────────────┐     │
│    │                                              │     │
│    │                  93.06                       │     │
│    │            (animated counter)                │     │
│    │                                              │     │
│    │    ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿         │     │
│    │              Trend (12 months)               │     │
│    │                                              │     │
│    └──────────────────────────────────────────────┘     │
│                                                          │
│    Metric              Weight        Score               │
│    ────────────────────────────────────────────          │
│    Total Sales          30%         ████████░░ 89.46%   │
│    Prime Cost           25%         ██████████ 100.19%  │
│    Food Sales          20.4%        ████████░░ 88.40%   │
│    ...                                                   │
│                                                          │
│    ┌──────────────────────────────────────────────┐     │
│    │  EBITDA Adjustment                    +0     │     │
│    └──────────────────────────────────────────────┘     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Hero Score Specifications:**
- Container: Gradient background or glass morphism effect
- Score number: `var(--text-5xl)` → `var(--text-4xl)` on mobile
- Animate on load: Count up from 0 with easing
- Background glow based on score color
- Ring/arc visualization option (radial progress)

**Metric Breakdown Row:**
- Progress bar showing score relative to 100%
- Color-coded by threshold
- Subtle hover state showing details

---

#### Chart Card

Container for all chart visualizations.

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Chart Title                           [Period ▾] [⋯]    │
│  Brief description of what this shows                      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                                                      │ │
│  │                                                      │ │
│  │                   [CHART AREA]                       │ │
│  │                                                      │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Health   │  88%  │ ∿∿∿ │ 18.03 / 20.4            │  │
│  │ Score    │  🟡   │     │                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ℹ️ Explanation text that helps users understand           │
│     the metric and what actions to take.                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Min height: `320px` desktop, `280px` mobile
- Chart area padding: `var(--space-4)`
- Legend: Below chart on mobile, inline on desktop
- Period selector: Dropdown with Month/Quarter/Year options

---

### Buttons

#### Primary Button
```css
.btn-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  font-weight: var(--font-medium);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  transition: all 150ms ease;
  
  &:hover {
    background: var(--primary-hover);
    box-shadow: var(--shadow-primary);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
}
```

#### Button Sizes
| Size | Padding | Font Size | Height |
|------|---------|-----------|--------|
| `sm` | `6px 12px` | `13px` | `32px` |
| `md` | `8px 16px` | `14px` | `40px` |
| `lg` | `12px 24px` | `16px` | `48px` |

---

### Navigation

#### Desktop Sidebar

```
┌──────────────────────┐
│  ┌────────────────┐  │
│  │  [LOGO]        │  │
│  │  Prometheus    │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ 📍 All Locations│◀─── Location Switcher
│  │      ▾         │  │
│  └────────────────┘  │
│                      │
│  OVERVIEW            │
│  ├─ 📊 Dashboard     │◀─── Active state
│  ├─ 🎯 Health Score  │
│  └─ 📈 Trends        │
│                      │
│  OPERATIONS          │
│  ├─ 💰 Sales         │
│  ├─ 📦 Costs         │
│  └─ 👥 Customers     │
│                      │
│  MARKETING           │
│  ├─ ⭐ Reviews       │
│  ├─ 🔍 Visibility    │
│  └─ 📰 PR            │
│                      │
│  ─────────────────   │
│                      │
│  ⚙️ Settings         │
│  ❓ Help             │
│                      │
│  ┌────────────────┐  │
│  │ 👤 Ryan K.     │  │
│  │ ryan@pear...   │  │
│  └────────────────┘  │
└──────────────────────┘
```

**Specifications:**
- Width: `240px` expanded, `72px` collapsed
- Background: `var(--background-subtle)`
- Border right: `1px solid var(--border)`
- Collapsible on desktop (icon-only mode)
- Smooth width transition: `width 200ms ease`

**Nav Item States:**
- Default: `var(--foreground-muted)`
- Hover: `var(--foreground)` + `var(--background-muted)` bg
- Active: `var(--primary)` text + `var(--primary-muted)` bg + left border accent

---

#### Mobile Navigation

Bottom tab bar + hamburger for secondary nav.

```
┌─────────────────────────────────────────────┐
│ [Hamburger]  Location Name ▾      [Avatar]  │ ◀── Top bar
├─────────────────────────────────────────────┤
│                                             │
│              [PAGE CONTENT]                 │
│                                             │
├─────────────────────────────────────────────┤
│  📊      🎯       💰       ⭐       ⋯      │ ◀── Bottom tabs
│ Dash   Health   Sales   Reviews   More     │
└─────────────────────────────────────────────┘
```

**Bottom Tab Specifications:**
- Height: `64px` (with safe area)
- Background: `var(--background-elevated)`
- Border top: `1px solid var(--border)`
- Active indicator: Filled icon + primary color
- Haptic feedback on tap (if supported)

---

### Forms

#### Input Field

```
┌─────────────────────────────────────────┐
│ Label                                   │
│ ┌─────────────────────────────────────┐ │
│ │ Placeholder text                    │ │
│ └─────────────────────────────────────┘ │
│ Helper text or error message            │
└─────────────────────────────────────────┘
```

**Specifications:**
- Height: `40px` (md), `48px` (lg for mobile)
- Border: `1px solid var(--border)`
- Border radius: `var(--radius-md)`
- Focus: `2px` ring in `var(--primary)` with `offset 2px`
- Error: Border and ring in `var(--health-danger)`
- Transition: `border-color 150ms, box-shadow 150ms`

---

### Data Tables

For detailed breakdowns (e.g., review list, transaction history).

```
┌───────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ 🔍 Search...                    [Filter ▾] [Export]     │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Date ↕     │ Source    │ Rating │ Status    │ Actions  │   │
│ ├─────────────────────────────────────────────────────────┤   │
│ │ Jan 23     │ Google    │ ⭐⭐⭐⭐⭐ │ ✅ Replied │   ⋯    │   │
│ │ Jan 22     │ Yelp      │ ⭐⭐⭐    │ ⏳ Pending │   ⋯    │   │
│ │ Jan 21     │ Google    │ ⭐⭐⭐⭐  │ ✅ Replied │   ⋯    │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│                        ‹ 1 2 3 ... 10 ›                      │
└───────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Row height: `52px`
- Alternating row colors: Subtle (`var(--background-subtle)` on even)
- Hover: `var(--background-muted)`
- Sticky header on scroll
- Horizontal scroll on mobile with shadow indicators

---

## Chart Specifications

### Chart Library: Tremor + Recharts

Use **Tremor** as the primary chart library (built on Recharts, Tailwind-native, beautiful defaults). Fall back to **Recharts** for custom visualizations.

### Global Chart Styles

```css
/* Chart container */
.chart-container {
  position: relative;
  width: 100%;
  min-height: 200px;
}

/* Tooltip */
.chart-tooltip {
  background: var(--background-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  box-shadow: var(--shadow-lg);
  font-size: var(--text-sm);
}

/* Axis labels */
.chart-axis-label {
  font-size: var(--text-xs);
  fill: var(--foreground-muted);
}

/* Grid lines */
.chart-grid-line {
  stroke: var(--border-muted);
  stroke-dasharray: 4 4;
}
```

### Animation Specifications

All charts should animate on:
1. **Initial load** — Elements draw/grow in
2. **Data change** — Smooth transition to new values
3. **Hover** — Highlight active element

```javascript
// Framer Motion animation config for charts
const chartAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { 
    duration: 0.5, 
    ease: [0.25, 0.1, 0.25, 1] // Custom easing
  }
}

// Bar chart specific
const barAnimation = {
  initial: { scaleY: 0 },
  animate: { scaleY: 1 },
  transition: { 
    duration: 0.6, 
    ease: "easeOut",
    delay: index * 0.1 // Stagger effect
  }
}

// Line chart specific
const lineAnimation = {
  initial: { pathLength: 0 },
  animate: { pathLength: 1 },
  transition: { duration: 1.5, ease: "easeInOut" }
}
```

---

### Chart Type: Comparative Bar (Actual vs Target vs Prior Years)

**Used for:** Total Sales, Food Sales, PPA, Food Costs, Labor Costs

```
         $567,694
            ┃
   $507,855 ┃ $533,256  $545,481
      ┃     ┃     ┃        ┃
    ┌───┐ ┌───┐ ┌───┐   ┌───┐
    │ █ │ │ █ │ │ █ │   │ █ │
    │ █ │ │ █ │ │ █ │   │ █ │
    │ █ │ │ █ │ │ █ │   │ █ │
    │ █ │ │ █ │ │ █ │   │ █ │
    │ █ │ │ █ │ │ █ │   │ █ │
    └───┘ └───┘ └───┘   └───┘
    2025   2025   2024   2023
   Actual Target Actual Actual
```

**Color Assignments:**
- 2025 Actual: Dynamic based on vs Target (green if ≥100%, yellow 80-99%, red <80%)
- 2025 Target: `var(--foreground-muted)` or gray
- 2024 Actual: `var(--chart-7)` (slate)
- 2023 Actual: `var(--chart-5)` (amber) or lighter slate

**Specifications:**
- Bar width: `48-64px` desktop, `32-40px` mobile
- Gap between bars: `8-12px`
- Value labels: Above each bar, `var(--text-sm)`, `font-medium`
- Rounded top corners: `var(--radius-sm)`

**Interaction:**
- Hover: Bar scales up slightly (`transform: scaleY(1.02)`), tooltip appears
- Tooltip shows: Value, % of target, YoY change

---

### Chart Type: Stacked Bar (Alcohol, Beer, Wine)

**Used for:** Beverage breakdown, Customer Loyalty segments, Review ratings

```
   $87,870           $85,578
      ┃                 ┃
    ┌───┐             ┌───┐
    │░░░│ Wine        │░░░│
    │███│ Beer        │███│
    │▓▓▓│ Alcohol     │▓▓▓│
    └───┘             └───┘
    2025              2023
   Target            Actual
```

**Color Assignments (Beverages):**
- Alcohol (spirits): `var(--chart-1)` (indigo)
- Beer: `var(--chart-3)` (cyan)
- Wine: `var(--chart-3)` lighter tint

**Color Assignments (Customer Loyalty):**
- 1-2 Visits: `var(--chart-5)` (amber)
- 3-9 Visits: `var(--chart-4)` (emerald)
- 10+ Visits: `var(--chart-1)` (indigo)

**Specifications:**
- Show segment labels inside bars if space permits
- Legend below chart (horizontal on desktop, vertical on mobile)
- Percentage labels for each segment

---

### Chart Type: Time Series Line (Trends)

**Used for:** Website Visibility %, Rev Pash, Prime Cost over time

```
      32.63%
         ●
        /
   ●───●
  /     \      ●────●
 ●       \    /      \
          ●──●        ●
                       \
────────────────────────●────────
Jan  Feb  Mar  Apr  May  Jun  Jul
```

**Specifications:**
- Line: `2px` stroke, smooth curve (`curveMonotoneX`)
- Data points: `6px` circles, visible on hover or always if <12 points
- Area fill: Gradient from line color at 20% opacity → transparent
- Goal line: Dashed, `var(--health-excellent)` or `var(--health-danger)`

**Animation:**
- Line draws from left to right
- Area fades in after line completes
- Data points pop in sequentially

**Interaction:**
- Vertical crosshair on hover
- Tooltip shows all values at that date
- Click to drill into that period

---

### Chart Type: Sparkline (Mini Trends)

**Used for:** Health Score boxes, compact trend indicators

```
∿∿∿∿∿∿∿∿∿∿∿∿
```

**Specifications:**
- Height: `24-32px`
- Width: `80-120px`
- No axes, labels, or tooltips
- Line only, `1.5px` stroke
- Color: Match the metric's health status color
- Show last 6-12 data points

---

### Chart Type: Progress Bar (Health Score Breakdown)

**Used for:** Individual metric scores in Health Score card

```
Total Sales     30%    ████████░░░░░░░░ 89.46%
Prime Cost      25%    ██████████████████ 100.19%
Food Costs      15%    ███████░░░░░░░░░░ 88.39%
```

**Specifications:**
- Height: `8px`
- Border radius: `var(--radius-full)`
- Background: `var(--background-muted)`
- Fill: Color based on percentage (health colors)
- Animate fill on load: `width 600ms ease-out`
- Overfill effect: If >100%, show glow or pulse

---

### Chart Type: Stacked Bar Time Series (Reviews)

**Used for:** 1, 2, 3 Star Review Count over time

```
    "DO NOT EXCEED"
─────────────────────────  (red dashed line)

  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐
  │3│ │3│ │2│ │2│ │1│  ◀── 3-star (yellow)
  │2│ │2│ │3│ │2│ │2│  ◀── 2-star (orange)
  │1│ │1│ │1│ │1│ │1│  ◀── 1-star (red)
  └─┘ └─┘ └─┘ └─┘ └─┘
  Jan Feb Mar Apr May
```

**Color Assignments:**
- 1-star: `var(--health-danger)` (red)
- 2-star: `var(--chart-5)` (amber/orange)
- 3-star: `var(--health-warning)` (yellow)

**Goal Line:**
- "DO NOT EXCEED" line in red, dashed
- Label positioned at right edge

---

### Chart Type: Radial/Gauge (Optional for Health Score)

**Alternative visualization for Overall Health Score:**

```
        ╭─────────╮
      ╱   93.06    ╲
     │   ◉──────    │
     │  EXCELLENT   │
      ╲            ╱
        ╰─────────╯
```

**Specifications:**
- 180° or 270° arc
- Gradient fill based on score zones
- Animated needle or fill on load
- Center: Large score number + status label

---

## Page Layouts

### Dashboard (Main View)

#### Desktop Layout (≥1024px)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │                                                           │
│            │  Dashboard                    [Date Range ▾] [Refresh]   │
│  240px     │  Last updated: 2 hours ago                                │
│            │                                                           │
│            │  ┌─────────────────────────────────────────────────────┐  │
│            │  │                                                     │  │
│            │  │              OVERALL HEALTH SCORE                   │  │
│            │  │                    93.06                            │  │
│            │  │              (Hero Card - Full Width)               │  │
│            │  │                                                     │  │
│            │  └─────────────────────────────────────────────────────┘  │
│            │                                                           │
│            │  ┌──────────────────┐  ┌──────────────────┐              │
│            │  │   Total Sales    │  │    Food Sales    │              │
│            │  │   [Bar Chart]    │  │   [Bar Chart]    │              │
│            │  └──────────────────┘  └──────────────────┘              │
│            │                                                           │
│            │  ┌──────────────────┐  ┌──────────────────┐              │
│            │  │  Beverage Sales  │  │    Prime Cost    │              │
│            │  │  [Stacked Bar]   │  │   [Line Chart]   │              │
│            │  └──────────────────┘  └──────────────────┘              │
│            │                                                           │
│            │  ┌──────────────────┐  ┌──────────────────┐              │
│            │  │  Food Costs      │  │   Labor Costs    │              │
│            │  └──────────────────┘  └──────────────────┘              │
│            │                                                           │
│            │  ─────────── CUSTOMER INSIGHTS ───────────                │
│            │                                                           │
│            │  ┌──────────────────┐  ┌──────────────────┐              │
│            │  │ Customer Loyalty │  │       PPA        │              │
│            │  │  [Stacked Bar]   │  │   [Bar Chart]    │              │
│            │  └──────────────────┘  └──────────────────┘              │
│            │                                                           │
│            │  ─────────── MARKETING & VISIBILITY ──────────            │
│            │                                                           │
│            │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│            │  │   Reviews    │ │ PR Mentions  │ │  Visibility  │      │
│            │  └──────────────┘ └──────────────┘ └──────────────┘      │
│            │                                                           │
└────────────────────────────────────────────────────────────────────────┘
```

**Grid System:**
- 12-column grid
- Gap: `var(--space-6)` (24px)
- Max content width: `1440px`
- Sidebar: Fixed `240px`
- Main content: `calc(100% - 240px)`

---

#### Tablet Layout (768px - 1023px)

- Sidebar collapsed to icons only (`72px`)
- 2-column grid for charts
- Health Score card still full width

---

#### Mobile Layout (<768px)

```
┌─────────────────────────────────┐
│ ☰  Dashboard  📍Location ▾  👤  │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │    OVERALL HEALTH SCORE   │  │
│  │          93.06            │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │       Total Sales         │  │
│  │       [Bar Chart]         │  │
│  │       Health: 89%         │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │       Food Sales          │  │
│  │       [Bar Chart]         │  │
│  └───────────────────────────┘  │
│                                 │
│           [More...]             │
│                                 │
├─────────────────────────────────┤
│  📊    🎯    💰    ⭐    ⋯     │
└─────────────────────────────────┘
```

**Mobile Specifications:**
- Single column layout
- Cards stack vertically
- Charts adapt to full width
- Pull-to-refresh on dashboard
- Swipe between locations (optional)

---

### Health Score Detail Page

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ← Back to Dashboard                                        │
│                                                             │
│  Health Score Configuration                                 │
│  Customize weights and targets for your restaurant          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                 Current Score: 93.06               │   │
│  │              [Radial Gauge Visualization]          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  WEIGHTS (must total 100%)                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Total Sales                                        │   │
│  │ [============================] 30%    [- ] [+ ]    │   │
│  │ Target: $567,694                        [Edit]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Prime Cost                                         │   │
│  │ [========================] 25%          [- ] [+ ]  │   │
│  │ Target: ≤60%                            [Edit]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ... (all metrics)                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Total: 100%                   [Reset to Defaults] │   │
│  │                                                     │   │
│  │           [Cancel]    [Save Changes]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Settings Page

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                   │
│                                                             │
│  ┌───────────────────┐                                      │
│  │ General           │ ◀── Active tab                      │
│  │ Integrations      │                                      │
│  │ Team              │                                      │
│  │ Billing           │                                      │
│  │ Appearance        │                                      │
│  └───────────────────┘                                      │
│                                                             │
│  GENERAL SETTINGS                                           │
│                                                             │
│  Restaurant Name                                            │
│  ┌───────────────────────────────────────────────────┐     │
│  │ The Rustic                                        │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  Cuisine Type                                               │
│  ┌───────────────────────────────────────────────────┐     │
│  │ American (Modern)                              ▾  │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  Total Available Seats                                      │
│  ┌───────────────────────────────────────────────────┐     │
│  │ 250                                               │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  Hours of Operation                                         │
│  ┌───────────────────────────────────────────────────┐     │
│  │ Monday      │ 11:00 AM │ - │ 10:00 PM │ [Closed] │     │
│  │ Tuesday     │ 11:00 AM │ - │ 10:00 PM │ [      ] │     │
│  │ ...                                               │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│                            [Save Changes]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Integrations Page

```
┌─────────────────────────────────────────────────────────────┐
│  Integrations                                               │
│  Connect your restaurant systems to pull data automatically │
│                                                             │
│  POINT OF SALE                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Toast Logo]                                       │   │
│  │                                                     │   │
│  │  Toast POS                              ✅ Connected │   │
│  │  Syncs: Sales, Labor, Food Costs                    │   │
│  │  Last sync: 2 hours ago                             │   │
│  │                                                     │   │
│  │  [Sync Now]    [Disconnect]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [R365 Logo]                                        │   │
│  │                                                     │   │
│  │  Restaurant 365                         ○ Not Connected│
│  │  Syncs: Sales, Inventory, Labor                     │   │
│  │                                                     │   │
│  │  [Connect]                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  RESERVATIONS                                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [OpenTable Logo]                                   │   │
│  │                                                     │   │
│  │  OpenTable                              ✅ Connected │   │
│  │  Syncs: Guest frequency, Lifetime visits            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsive & Mobile Design

### Breakpoints

```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Large phones */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large desktops */
```

### Mobile-Specific Patterns

#### Touch Targets
- Minimum: `44px × 44px` (Apple HIG)
- Preferred: `48px × 48px` for primary actions
- Spacing between targets: `8px` minimum

#### Pull-to-Refresh
- Dashboard supports pull-to-refresh to sync latest data
- Show refresh indicator animation

#### Gestures
- Swipe left/right: Navigate between locations (optional)
- Long press: Reveal context menu on chart cards
- Pinch: Zoom on charts (optional, for detailed view)

#### Bottom Sheet
- Used for: Filters, date range picker, settings panels
- Drag handle at top
- Snap points: 25%, 50%, 90%
- Backdrop blur behind

#### Charts on Mobile
- Full width
- Reduced data points (show quarterly instead of monthly if cramped)
- Horizontal scroll for large data sets
- Larger touch targets for interactive elements
- Tooltips positioned above thumb, not below

---

### Responsive Table Pattern

Desktop: Full table
Tablet: Hide less important columns
Mobile: Card-based list view

```
/* Mobile card view for tables */
┌─────────────────────────────────┐
│ Google Review                   │
│ ⭐⭐⭐⭐⭐  ·  Jan 23, 2025          │
│                                 │
│ "Amazing food and service..."   │
│                                 │
│ ✅ Replied  ·  [View] [Reply]    │
└─────────────────────────────────┘
```

---

## Animations & Micro-interactions

### Page Transitions

```javascript
// Using Framer Motion
const pageVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
}

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3
}
```

### Loading States

#### Skeleton Loaders
- Match exact shape of content
- Subtle shimmer animation (left to right)
- Gray tones: `var(--background-muted)`

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--background-muted) 0%,
    var(--background-subtle) 50%,
    var(--background-muted) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### Chart Loading
1. Skeleton card appears
2. Axes draw in
3. Data animates in
4. Health score box fades in

### Hover Effects

```css
/* Card hover */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-muted);
  transition: all 200ms ease;
}

/* Button hover */
.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-primary);
}

/* Interactive element hover */
.interactive:hover {
  background: var(--background-muted);
}
```

### Success/Error Feedback

#### Toast Notifications
- Position: Bottom-center on mobile, bottom-right on desktop
- Auto-dismiss: 4 seconds (success), manual dismiss (errors)
- Swipe to dismiss on mobile
- Stack max 3 toasts

#### Form Validation
- Real-time validation on blur
- Error shake animation
- Success checkmark animation

### Number Animations

```javascript
// Animate numbers counting up
import { useSpring, animated } from '@react-spring/web'

const AnimatedNumber = ({ value }) => {
  const { number } = useSpring({
    from: { number: 0 },
    to: { number: value },
    config: { mass: 1, tension: 20, friction: 10 }
  })
  
  return <animated.span>{number.to(n => n.toFixed(2))}</animated.span>
}
```

---

## Accessibility

### Requirements

- **WCAG 2.1 AA compliance** minimum
- All interactive elements keyboard accessible
- Focus indicators visible and clear
- Color not sole indicator (use icons, patterns)
- Minimum contrast ratios:
  - Normal text: 4.5:1
  - Large text: 3:1
  - UI components: 3:1

### Focus Management

```css
/* Focus visible (keyboard only) */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Screen Reader Support

- All charts have `aria-label` describing the data
- Metric cards announce: "Total Sales: $507,855, 89% of target, trending up"
- Data tables use proper `<th scope>` attributes
- Loading states announced: "Loading dashboard data"

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## White-Label Theming

### CSS Custom Properties Structure

```css
:root {
  /* Brand colors (overridden per organization) */
  --brand-primary: #6366f1;
  --brand-primary-hover: #4f46e5;
  --brand-primary-muted: #e0e7ff;
  --brand-secondary: #8b5cf6;
  
  /* These reference brand colors */
  --primary: var(--brand-primary);
  --primary-hover: var(--brand-primary-hover);
  --primary-muted: var(--brand-primary-muted);
}

/* Partner-specific theme applied via class or data attribute */
[data-theme="southerleigh"] {
  --brand-primary: #1e40af;
  --brand-primary-hover: #1e3a8a;
  --brand-primary-muted: #dbeafe;
}
```

### Theme Configuration Object

```typescript
interface OrganizationTheme {
  name: string
  logo: {
    light: string  // URL
    dark: string   // URL
    favicon: string
  }
  colors: {
    primary: string      // Hex
    primaryHover: string
    primaryMuted: string
    secondary?: string
  }
  fonts?: {
    heading?: string
    body?: string
  }
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}
```

### Dynamic Theme Loading

```javascript
// Apply theme on app load
useEffect(() => {
  const theme = organization.branding
  
  document.documentElement.style.setProperty('--brand-primary', theme.colors.primary)
  document.documentElement.style.setProperty('--brand-primary-hover', theme.colors.primaryHover)
  // ... etc
  
  // Update favicon
  document.querySelector('link[rel="icon"]').href = theme.logo.favicon
  
  // Update document title
  document.title = `${theme.name} | Dashboard`
}, [organization])
```

---

## Component Implementation Checklist

### Phase 1: Foundation
- [ ] Design tokens (CSS variables)
- [ ] Typography system
- [ ] Color system (light + dark)
- [ ] Spacing system
- [ ] Icon set (Lucide)
- [ ] Base components (Button, Input, Card)

### Phase 2: Navigation
- [ ] Desktop sidebar
- [ ] Mobile bottom tabs
- [ ] Mobile hamburger menu
- [ ] Location switcher
- [ ] User menu

### Phase 3: Charts
- [ ] Comparative bar chart
- [ ] Stacked bar chart
- [ ] Time series line chart
- [ ] Sparkline
- [ ] Progress bar
- [ ] Health Score gauge (optional)

### Phase 4: Dashboard Components
- [ ] Metric card
- [ ] Health Score hero card
- [ ] Chart card wrapper
- [ ] Skeleton loaders

### Phase 5: Forms & Data
- [ ] Form inputs (text, select, date)
- [ ] Weight adjustment sliders
- [ ] Data tables (desktop + mobile)
- [ ] Filters & search

### Phase 6: Polish
- [ ] Animations (page, chart, micro)
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Toast notifications

### Phase 7: White-Label
- [ ] Theme provider
- [ ] Dynamic CSS variable injection
- [ ] Logo/favicon swap
- [ ] Custom domain handling

---

## File Structure (Frontend)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Dashboard shell with sidebar
│   │   ├── page.tsx            # Main dashboard
│   │   ├── health-score/
│   │   ├── sales/
│   │   ├── costs/
│   │   ├── customers/
│   │   ├── reviews/
│   │   ├── visibility/
│   │   └── settings/
│   └── (admin)/                 # Super admin routes
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── charts/
│   │   ├── comparative-bar.tsx
│   │   ├── stacked-bar.tsx
│   │   ├── time-series-line.tsx
│   │   ├── sparkline.tsx
│   │   ├── progress-bar.tsx
│   │   └── health-gauge.tsx
│   ├── dashboard/
│   │   ├── metric-card.tsx
│   │   ├── health-score-card.tsx
│   │   ├── chart-card.tsx
│   │   └── dashboard-grid.tsx
│   ├── navigation/
│   │   ├── sidebar.tsx
│   │   ├── mobile-nav.tsx
│   │   ├── location-switcher.tsx
│   │   └── user-menu.tsx
│   └── layout/
│       ├── page-header.tsx
│       └── section-header.tsx
│
├── lib/
│   ├── theme/
│   │   ├── tokens.ts            # Design tokens
│   │   ├── theme-provider.tsx
│   │   └── use-theme.ts
│   └── utils/
│       ├── format-currency.ts
│       ├── format-percent.ts
│       └── health-score.ts
│
├── styles/
│   └── globals.css              # Tailwind + CSS variables
│
└── types/
    └── theme.ts                 # TypeScript types for theming
```

---

## Next Steps for Designer

1. **Create Figma component library** based on these specs
2. **Design key screens:**
   - Dashboard (desktop, tablet, mobile)
   - Health Score detail
   - Settings
   - Integrations
   - Onboarding flow
3. **Prototype interactions:**
   - Chart hover states
   - Navigation transitions
   - Form validation
4. **Document:**
   - All component states
   - Responsive behavior
   - Animation timing

---

## Questions to Resolve with Stakeholders

1. **Dark mode priority** — Ship with dark mode v1 or add later?
2. **Chart library** — Tremor (faster) or full custom Recharts (more control)?
3. **AI Summary placement** — Separate page or inline on dashboard?
4. **Benchmark comparisons** — How to visualize vs similar restaurants?
5. **Onboarding flow** — Wizard or self-guided?
6. **Export options** — PDF reports? CSV downloads?
