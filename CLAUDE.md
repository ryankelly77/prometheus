# Prometheus - Restaurant KPI Dashboard

> Multi-tenant, white-label restaurant analytics platform with health scoring and AI insights.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** Supabase (PostgreSQL) + Prisma ORM
- **Auth:** Supabase Auth with RLS
- **UI:** shadcn/ui + Radix UI + Tailwind CSS v4
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod
- **AI:** Anthropic Claude API

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup, forgot-password
│   ├── (dashboard)/      # Main app (requires auth)
│   │   ├── layout.tsx    # Sidebar + top bar + location provider
│   │   ├── page.tsx      # Main dashboard
│   │   ├── health-score/
│   │   ├── sales/
│   │   ├── costs/
│   │   ├── customers/
│   │   ├── reviews/
│   │   ├── visibility/
│   │   └── settings/
│   ├── (admin)/          # Super admin panel
│   └── api/
├── components/
│   ├── ui/               # shadcn components
│   ├── charts/           # Chart components
│   ├── dashboard/        # Dashboard-specific
│   ├── navigation/       # Sidebar, mobile nav
│   └── forms/            # Form components
├── lib/
│   ├── supabase/         # Client + server + middleware
│   ├── prisma.ts         # Prisma singleton
│   ├── auth/             # requireAdmin, requireOrganization
│   ├── utils/            # Formatters, health-score calc
│   └── integrations/     # Toast, OpenTable, etc.
├── hooks/                # useLocation, useHealthScore, etc.
└── types/                # TypeScript types
```

## Design System

### Colors (CSS Variables)

```css
/* Primary (themeable for white-label) */
--primary: 239 84% 67%;           /* Indigo */
--primary-foreground: 0 0% 98%;

/* Health Score Colors */
--health-excellent: 142 76% 36%;  /* Green - ≥100% of target */
--health-good: 84 81% 44%;        /* Lime - 90-99% */
--health-warning: 48 96% 53%;     /* Yellow - 80-89% */
--health-danger: 0 84% 60%;       /* Red - <80% */

/* Chart Palette */
--chart-1: 239 84% 67%;  /* Indigo - 2025 Actual */
--chart-2: 262 83% 58%;  /* Violet */
--chart-3: 187 92% 43%;  /* Cyan */
--chart-4: 160 84% 39%;  /* Emerald */
--chart-5: 38 92% 50%;   /* Amber - 2023 */
--chart-7: 215 16% 47%;  /* Slate - 2024 */
```

### Typography

- **Font:** Geist (sans) + Geist Mono
- **Metrics:** Always use `tabular-nums` for number alignment
- **Sizes:** text-sm (14px), text-base (16px), text-3xl (30px) for big numbers

### Spacing & Radius

- **Spacing:** 4px base unit (space-1 = 4px, space-4 = 16px, space-6 = 24px)
- **Radius:** sm=6px, md=8px, lg=12px, xl=16px
- **Card padding:** 24px (p-6)

## Key Components

### Health Score Box (appears below every chart)

```
┌─────────────────────────────────────────┐
│ Health   │  88%  │ ∿∿∿ │  13.3 / 15   │
│ Score    │ (color)│trend│  (weighted)  │
└─────────────────────────────────────────┘
```

Color the percentage badge based on score vs target.

### Comparative Bar Chart Pattern

For financial metrics, show 4 bars:
1. **2025 Actual** - Color by health (green/yellow/red vs target)
2. **2025 Target** - Gray/muted
3. **2024 Actual** - Slate
4. **2023 Actual** - Amber (lighter)

### Chart Card Wrapper

Every chart should be wrapped in a Card with:
- Title + optional description
- Period selector dropdown (top right)
- Chart area (min-height: 200px)
- Health Score Box below chart
- Optional explanation text (ℹ️ icon)

## Database Models (Key Entities)

```
Organization (white-label partner)
  └── RestaurantGroup
        └── Location (individual restaurant)
              ├── Integration (Toast, OpenTable, etc.)
              ├── MonthlyMetrics (sales, costs, PPA)
              ├── CustomerLoyalty (visit frequency)
              ├── ReviewMetrics (ratings, counts)
              ├── WebsiteVisibility (SEO data)
              ├── PRMention (manual entry)
              ├── HealthScoreConfig (weights, targets)
              └── HealthScoreHistory (monthly scores)

UserProfile
  └── UserOrganization (role: super_admin, partner_admin, group_admin, location_manager, viewer)
```

## Health Score Calculation

```typescript
// For each metric:
score = (actual / target) * 100  // For revenue metrics (higher = better)
score = (target / actual) * 100  // For cost metrics (lower = better)

// Weighted score:
weightedScore = score * (weight / 100)

// Overall:
overallScore = sum(weightedScores) + ebitdaAdjustment
```

**Default Weights:**
- Total Sales: 30%
- Prime Cost: 25%
- Food Sales: 20.4%
- Labor Costs: 15%
- Food Costs: 15%
- Wine Sales: 5.7%
- PPA: 5%
- Customer Loyalty: 5%
- Alcohol Sales: 3.6%
- Reviews: 2%
- PR Mentions: 2%
- Website Visibility: 1%
- Beer Sales: 0.3%

## API Route Patterns

### Auth Middleware

```typescript
// Always use at start of protected routes:
const auth = await requireOrganization()
if (auth instanceof NextResponse) return auth

// For admin routes:
const auth = await requireAdmin()
if (auth instanceof NextResponse) return auth
```

### Validation

```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  totalSeats: z.number().min(1),
})

const body = await request.json()
const validated = schema.parse(body) // Throws on invalid
```

### Response Patterns

```typescript
// Success
return NextResponse.json({ data })

// Error
return NextResponse.json({ error: 'Message' }, { status: 400 })
```

## Component Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `HealthScoreHero.tsx`)
- Utilities: `kebab-case.ts` (e.g., `health-score.ts`)
- Pages: `page.tsx` (Next.js convention)

### Imports Order
1. React/Next.js
2. Third-party libraries
3. Internal components (`@/components/`)
4. Internal utilities (`@/lib/`)
5. Types (`@/types/`)

### Component Structure

```typescript
'use client' // Only if needed

import { ... } from 'react'
import { ... } from '@/components/ui/...'
import { cn } from '@/lib/utils'

interface ComponentProps {
  // Props interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks first
  // Then derived state
  // Then handlers
  // Then render
}
```

## Responsive Breakpoints

- `sm`: 640px
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px
- `2xl`: 1536px

**Key patterns:**
- Mobile: Single column, bottom nav
- Tablet: 2-column grid, collapsed sidebar
- Desktop: Full sidebar, 2-3 column grid

## Animation Patterns

```typescript
// Page transition
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
}

// Number counting
import { useSpring, animated } from '@react-spring/web'
const { number } = useSpring({ from: { number: 0 }, to: { number: value } })

// Chart bars
initial: { scaleY: 0 }
animate: { scaleY: 1 }
transition: { duration: 0.6, delay: index * 0.1 }
```

## Full Documentation

For complete specifications, see:
- `/docs/UI-UX-SPECS.md` - Full design system, all components, mobile patterns
- `/docs/DEV-PLAN.md` - Phase-by-phase build plan with code examples
- `/prisma/schema.prisma` - Complete database schema

## Pre-Commit Checks

**REQUIRED:** Before committing any code changes, ALWAYS run:

```bash
npm run build
```

This catches:
- TypeScript errors
- ESLint errors
- Import issues
- Missing dependencies

**Do NOT commit if the build fails. Fix all errors first.**

## Quick Commands

```bash
# Development
npm run dev

# Database
npx prisma migrate dev --name <name>
npx prisma generate
npx prisma db seed
npx prisma studio

# Testing
npm test
npm run test:e2e

# Build (ALWAYS run before committing)
npm run build
```

## Current Phase

Update this as you progress:

- [x] Phase 0: Project Setup
- [ ] Phase 1: Auth & Multi-Tenancy
- [ ] Phase 2: Database Schema
- [ ] Phase 3: Design System
- [x] Phase 4: Dashboard Layout
- [ ] Phase 5: Charts
- [ ] Phase 6: Health Score
- [ ] Phase 7: Settings
- [ ] Phase 8: Integrations
- [ ] Phase 9: AI Features
- [ ] Phase 10: White-Label
- [ ] Phase 11: Admin Panel
- [ ] Phase 12: Testing
- [ ] Phase 13: Launch
