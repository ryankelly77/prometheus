# Prometheus Developer Build Plan
## Restaurant KPI Dashboard

---

## Overview

This document provides a step-by-step development plan for building Prometheus, a multi-tenant restaurant KPI dashboard with white-label capabilities.

**Estimated Timeline:** 12-16 weeks (1 senior full-stack developer)

**Domain:** `prometheusrestaurant.com`

---

## Table of Contents

1. [Phase 0: Project Setup](#phase-0-project-setup-week-1)
2. [Phase 1: Authentication & Multi-Tenancy](#phase-1-authentication--multi-tenancy-weeks-2-3)
3. [Phase 2: Database Schema & Core Models](#phase-2-database-schema--core-models-week-3-4)
4. [Phase 3: Design System & Component Library](#phase-3-design-system--component-library-weeks-4-5)
5. [Phase 4: Dashboard Layout & Navigation](#phase-4-dashboard-layout--navigation-week-5-6)
6. [Phase 5: Chart Components](#phase-5-chart-components-weeks-6-7)
7. [Phase 6: Health Score System](#phase-6-health-score-system-week-7-8)
8. [Phase 7: Data Entry & Settings](#phase-7-data-entry--settings-weeks-8-9)
9. [Phase 8: Integrations](#phase-8-integrations-weeks-9-11)
10. [Phase 9: AI Features](#phase-9-ai-features-pro-plan-weeks-11-12)
11. [Phase 10: White-Label System](#phase-10-white-label-system-weeks-12-13)
12. [Phase 11: Admin Panels](#phase-11-admin-panels-weeks-13-14)
13. [Phase 12: Testing & QA](#phase-12-testing--qa-week-14-15)
14. [Phase 13: Deployment & Launch](#phase-13-deployment--launch-week-15-16)

---

## Phase 0: Project Setup (Week 1)

### 0.1 Initialize Next.js Project

```bash
# Create Next.js 14 project with TypeScript
npx create-next-app@latest prometheus --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd prometheus
```

### 0.2 Install Core Dependencies

```bash
# Database & Auth
npm install @supabase/supabase-js @supabase/ssr
npm install prisma @prisma/client
npm install zod

# UI Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-switch @radix-ui/react-slider
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Charts
npm install @tremor/react recharts

# Animations
npm install framer-motion

# Forms
npm install react-hook-form @hookform/resolvers

# Utilities
npm install date-fns
npm install next-themes
npm install nuqs

# Dev dependencies
npm install -D @types/node prettier prettier-plugin-tailwindcss
```

### 0.3 Initialize Prisma

```bash
npx prisma init
```

### 0.4 Project Structure Setup

Create the following folder structure:

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── health-score/
│   │   ├── sales/
│   │   ├── costs/
│   │   ├── customers/
│   │   ├── reviews/
│   │   ├── visibility/
│   │   ├── pr/
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── integrations/
│   │       ├── team/
│   │       ├── billing/
│   │       └── appearance/
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── organizations/
│   │   ├── users/
│   │   ├── prompts/
│   │   └── system/
│   ├── api/
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── locations/
│   │   ├── metrics/
│   │   ├── integrations/
│   │   ├── health-score/
│   │   └── webhooks/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   ├── charts/
│   ├── dashboard/
│   ├── navigation/
│   ├── forms/
│   └── layout/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── prisma.ts
│   ├── auth/
│   │   ├── requireAdmin.ts
│   │   ├── requireOrganization.ts
│   │   └── requireLocation.ts
│   ├── validation/
│   │   └── schemas.ts
│   ├── utils/
│   │   ├── format.ts
│   │   ├── health-score.ts
│   │   └── cn.ts
│   └── theme/
│       ├── tokens.ts
│       └── theme-provider.tsx
├── hooks/
│   ├── use-location.ts
│   ├── use-organization.ts
│   ├── use-metrics.ts
│   └── use-health-score.ts
├── types/
│   ├── database.ts
│   ├── api.ts
│   └── theme.ts
└── config/
    ├── site.ts
    └── dashboard.ts
```

### 0.5 Environment Variables Setup

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database (Supabase PostgreSQL)
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_url

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DOMAIN=prometheusrestaurant.com

# Integrations (add as needed)
TOAST_API_KEY=
TOAST_API_SECRET=
R365_API_KEY=
OPENTABLE_API_KEY=
BRIGHTLOCAL_API_KEY=
SEMRUSH_API_KEY=

# AI
OPENAI_API_KEY=
# or
ANTHROPIC_API_KEY=
```

### 0.6 Configure Tailwind

Update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        health: {
          excellent: 'hsl(var(--health-excellent))',
          good: 'hsl(var(--health-good))',
          warning: 'hsl(var(--health-warning))',
          danger: 'hsl(var(--health-danger))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...fontFamily.sans],
        mono: ['var(--font-geist-mono)', ...fontFamily.mono],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### 0.7 Set Up Git & GitHub

```bash
git init
git add .
git commit -m "Initial project setup"

# Create GitHub repo and push
gh repo create prometheus --private
git push -u origin main
```

### 0.8 Configure CI/CD

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### 0.9 Deliverables Checklist

- [ ] Next.js 14 project initialized
- [ ] All dependencies installed
- [ ] Folder structure created
- [ ] Environment variables configured
- [ ] Tailwind configured with design tokens
- [ ] Git repository set up
- [ ] CI/CD pipeline configured
- [ ] README.md written

---

## Phase 1: Authentication & Multi-Tenancy (Weeks 2-3)

### 1.1 Supabase Project Setup

1. Create new Supabase project at `supabase.com`
2. Enable Email auth provider
3. (Optional) Enable Google/Microsoft OAuth
4. Configure email templates for white-label support
5. Set up Row Level Security (RLS) policies

### 1.2 Create Supabase Client Utilities

**`src/lib/supabase/client.ts`** (Browser client):

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`src/lib/supabase/server.ts`** (Server client):

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

**`src/lib/supabase/middleware.ts`**:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}
```

### 1.3 Create Middleware

**`src/middleware.ts`**:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup', '/forgot-password']

// Routes that require super admin
const adminRoutes = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // Update Supabase session
  const response = await updateSession(request)

  // Check for custom domain / subdomain for white-label
  const host = hostname
  const isCustomDomain = !host.includes('prometheusrestaurant.com') && !host.includes('localhost')
  const subdomain = host.split('.')[0]

  // Add organization context to headers
  if (isCustomDomain || (subdomain && subdomain !== 'app' && subdomain !== 'www')) {
    response.headers.set('x-organization-domain', isCustomDomain ? host : subdomain)
  }

  // Check authentication for protected routes
  if (!publicRoutes.some(route => pathname.startsWith(route))) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 1.4 Create Auth Helper Functions

**`src/lib/auth/requireAdmin.ts`**:

```typescript
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.userProfile.findUnique({
    where: { supabaseUserId: user.id },
    include: { userOrganizations: true },
  })

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Check if user is super admin
  const isSuperAdmin = profile.userOrganizations.some(
    uo => uo.role === 'super_admin'
  )

  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { user, profile }
}
```

**`src/lib/auth/requireOrganization.ts`**:

```typescript
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function requireOrganization() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get organization from header (set by middleware)
  const headersList = await headers()
  const orgDomain = headersList.get('x-organization-domain')

  let organization

  if (orgDomain) {
    // Find organization by custom domain or subdomain
    organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { customDomain: orgDomain },
          { slug: orgDomain },
        ],
      },
    })
  }

  // If no org found from domain, get user's default organization
  if (!organization) {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { 
        userProfile: { supabaseUserId: user.id } 
      },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    })
    organization = userOrg?.organization
  }

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const profile = await prisma.userProfile.findUnique({
    where: { supabaseUserId: user.id },
    include: {
      userOrganizations: {
        where: { organizationId: organization.id },
      },
    },
  })

  if (!profile || profile.userOrganizations.length === 0) {
    return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
  }

  return { user, profile, organization, role: profile.userOrganizations[0].role }
}
```

### 1.5 Create Auth Pages

**`src/app/(auth)/login/page.tsx`**:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

### 1.6 Deliverables Checklist

- [ ] Supabase project configured
- [ ] Supabase client utilities created
- [ ] Middleware for auth and multi-tenancy
- [ ] `requireAdmin()` helper
- [ ] `requireOrganization()` helper
- [ ] `requireLocation()` helper
- [ ] Login page
- [ ] Signup page
- [ ] Forgot password page
- [ ] Auth callback handler
- [ ] Session refresh logic
- [ ] Tests for auth helpers

---

## Phase 2: Database Schema & Core Models (Weeks 3-4)

### 2.1 Prisma Schema

Create **`prisma/schema.prisma`**:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================
// ORGANIZATION & MULTI-TENANCY
// ============================================

model Organization {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique // for subdomain: slug.prometheusrestaurant.com
  customDomain String?  @unique // for custom domains
  plan         Plan     @default(BASE)
  
  // Branding (JSON)
  branding     Json?    // { logo, favicon, colors, appName }
  emailSettings Json?   // { fromName, replyTo }
  
  // Features
  enabledFeatures String[] @default([])
  
  // Relations
  restaurantGroups RestaurantGroup[]
  userOrganizations UserOrganization[]
  aiPrompts        AIPrompt[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([slug])
  @@index([customDomain])
}

enum Plan {
  BASE
  PRO
}

model RestaurantGroup {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name           String
  
  // Relations
  locations Location[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
}

model Location {
  id                String          @id @default(cuid())
  restaurantGroupId String
  restaurantGroup   RestaurantGroup @relation(fields: [restaurantGroupId], references: [id], onDelete: Cascade)
  
  name              String
  totalSeats        Int?
  hoursOfOperation  Json?           // { monday: { open: "11:00", close: "22:00" }, ... }
  cuisineType       CuisineType?
  timezone          String          @default("America/Chicago")
  
  // Relations
  integrations        Integration[]
  monthlyMetrics      MonthlyMetrics[]
  customerLoyalty     CustomerLoyalty[]
  reviews             ReviewMetrics[]
  websiteVisibility   WebsiteVisibility[]
  prMentions          PRMention[]
  healthScoreConfigs  HealthScoreConfig[]
  healthScoreHistory  HealthScoreHistory[]
  aiInsights          AIInsight[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([restaurantGroupId])
}

enum CuisineType {
  AMERICAN
  AMERICAN_MODERN
  ASIAN_FUSION
  BARBECUE
  CHINESE
  FRENCH
  INDIAN
  ITALIAN
  JAPANESE
  MEDITERRANEAN
  MEXICAN
  SEAFOOD
  STEAKHOUSE
  THAI
  VIETNAMESE
  OTHER
}

// ============================================
// USERS & PERMISSIONS
// ============================================

model UserProfile {
  id             String   @id @default(cuid())
  supabaseUserId String   @unique
  email          String
  name           String?
  avatarUrl      String?
  
  // Relations
  userOrganizations UserOrganization[]
  prMentionsCreated PRMention[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([supabaseUserId])
  @@index([email])
}

model UserOrganization {
  id             String       @id @default(cuid())
  userProfileId  String
  userProfile    UserProfile  @relation(fields: [userProfileId], references: [id], onDelete: Cascade)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  role               UserRole
  assignedLocationIds String[] @default([]) // For location_manager and viewer roles
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userProfileId, organizationId])
  @@index([userProfileId])
  @@index([organizationId])
}

enum UserRole {
  super_admin
  partner_admin
  group_admin
  location_manager
  viewer
}

// ============================================
// INTEGRATIONS
// ============================================

model Integration {
  id         String          @id @default(cuid())
  locationId String
  location   Location        @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  type       IntegrationType
  credentials Json?          // Encrypted
  config      Json?          // Integration-specific config
  
  status     IntegrationStatus @default(DISCONNECTED)
  lastSyncAt DateTime?
  lastError  String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([locationId, type])
  @@index([locationId])
}

enum IntegrationType {
  TOAST
  R365
  OPENTABLE
  BRIGHTLOCAL
  SEMRUSH
  GOOGLE_BUSINESS
}

enum IntegrationStatus {
  CONNECTED
  DISCONNECTED
  ERROR
  SYNCING
}

// ============================================
// METRICS DATA
// ============================================

model MonthlyMetrics {
  id         String   @id @default(cuid())
  locationId String
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  month      DateTime // First day of month
  
  // Sales
  totalSales    Decimal? @db.Decimal(12, 2)
  foodSales     Decimal? @db.Decimal(12, 2)
  alcoholSales  Decimal? @db.Decimal(12, 2)
  beerSales     Decimal? @db.Decimal(12, 2)
  wineSales     Decimal? @db.Decimal(12, 2)
  
  // Costs
  laborCosts    Decimal? @db.Decimal(12, 2)
  foodCosts     Decimal? @db.Decimal(12, 2)
  
  // Customer
  totalCustomers Int?
  
  // Calculated (stored for performance)
  ppa            Decimal? @db.Decimal(10, 2) // Per Person Average
  primeCost      Decimal? @db.Decimal(5, 2)  // As percentage
  revPash        Decimal? @db.Decimal(10, 2) // Revenue per Available Seat Hour
  
  // Targets (for this specific month if different from default)
  targets        Json?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([locationId, month])
  @@index([locationId])
  @@index([month])
}

model CustomerLoyalty {
  id         String   @id @default(cuid())
  locationId String
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  month      DateTime
  
  oneVisit         Int @default(0)
  twoToNineVisits  Int @default(0)
  tenPlusVisits    Int @default(0)
  
  // Calculated
  percentThreePlus Decimal? @db.Decimal(5, 2)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([locationId, month])
  @@index([locationId])
}

model ReviewMetrics {
  id         String   @id @default(cuid())
  locationId String
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  month      DateTime
  
  totalCount      Int      @default(0)
  averageRating   Decimal? @db.Decimal(2, 1)
  newReviewsCount Int      @default(0)
  
  oneStarCount    Int @default(0)
  twoStarCount    Int @default(0)
  threeStarCount  Int @default(0)
  fourStarCount   Int @default(0)
  fiveStarCount   Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([locationId, month])
  @@index([locationId])
}

model WebsiteVisibility {
  id         String   @id @default(cuid())
  locationId String
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  month            DateTime
  visibilityPercent Decimal? @db.Decimal(5, 2)
  trackedKeywords   Json?    // Array of keyword objects with positions
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([locationId, month])
  @@index([locationId])
}

model PRMention {
  id         String   @id @default(cuid())
  locationId String
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  month      DateTime
  count      Int      @default(0)
  notes      String?
  
  enteredById String?
  enteredBy   UserProfile? @relation(fields: [enteredById], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([locationId, month])
  @@index([locationId])
}

// ============================================
// HEALTH SCORE
// ============================================

model HealthScoreConfig {
  id         String   @id @default(cuid())
  locationId String
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  // Weights (must sum to 100)
  weights    Json     // { totalSales: 30, primeCost: 25, ... }
  
  // Targets
  targets    Json     // { totalSales: 567694, primeCost: 60, ppa: 57, ... }
  
  // EBITDA settings
  ebitdaTarget       Decimal? @db.Decimal(12, 2)
  ebitdaBonus        Decimal? @db.Decimal(5, 2) // Points to add if exceeded
  ebitdaPenalty      Decimal? @db.Decimal(5, 2) // Points to subtract if missed
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([locationId])
}

model HealthScoreHistory {
  id         String   @id @default(cuid())
  locationId String
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  month          DateTime
  overallScore   Decimal  @db.Decimal(6, 2)
  metricScores   Json     // { totalSales: 89.46, primeCost: 100.19, ... }
  ebitdaAdjustment Decimal? @db.Decimal(5, 2)
  
  createdAt DateTime @default(now())

  @@unique([locationId, month])
  @@index([locationId])
  @@index([month])
}

// ============================================
// AI FEATURES
// ============================================

model AIPrompt {
  id             String        @id @default(cuid())
  organizationId String?       // Null for global prompts
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  name           String
  promptText     String        @db.Text
  category       AIPromptCategory
  isActive       Boolean       @default(true)
  
  // Relations
  insights       AIInsight[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([category])
}

enum AIPromptCategory {
  MONTHLY_SUMMARY
  RECOMMENDATION
  ALERT
  BENCHMARK
}

model AIInsight {
  id         String   @id @default(cuid())
  locationId String
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  promptId   String
  prompt     AIPrompt @relation(fields: [promptId], references: [id])
  
  month         DateTime
  generatedText String   @db.Text
  
  createdAt DateTime @default(now())

  @@index([locationId])
  @@index([month])
}
```

### 2.2 Run Initial Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 2.3 Create Prisma Client Singleton

**`src/lib/prisma.ts`**:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 2.4 Create Seed Script

**`prisma/seed.ts`**:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default organization (Prometheus)
  const prometheusOrg = await prisma.organization.upsert({
    where: { slug: 'prometheus' },
    update: {},
    create: {
      name: 'Prometheus',
      slug: 'prometheus',
      plan: 'PRO',
      branding: {
        appName: 'Prometheus',
        colors: {
          primary: '#6366f1',
          primaryHover: '#4f46e5',
        },
      },
      enabledFeatures: ['ai_insights', 'benchmarks', 'multi_location'],
    },
  })

  // Create default health score weights
  const defaultWeights = {
    totalSales: 30,
    primeCost: 25,
    foodSales: 20.4,
    alcoholSales: 3.6,
    beerSales: 0.3,
    wineSales: 5.7,
    foodCosts: 15,
    laborCosts: 15,
    ppa: 5,
    customerLoyalty: 5,
    reviews: 2,
    prMentions: 2,
    websiteVisibility: 1,
  }

  // Create global AI prompts
  await prisma.aIPrompt.upsert({
    where: { id: 'default-monthly-summary' },
    update: {},
    create: {
      id: 'default-monthly-summary',
      name: 'Monthly Performance Summary',
      category: 'MONTHLY_SUMMARY',
      promptText: `Analyze the following restaurant performance data for {month}:
      
Sales: {totalSales} (Target: {salesTarget})
Food Costs: {foodCosts}% (Target: {foodCostTarget}%)
Labor Costs: {laborCosts}% (Target: {laborCostTarget}%)
Prime Cost: {primeCost}%
PPA: {ppa}
Customer Loyalty (3+ visits): {customerLoyalty}%
Reviews: {reviewScore} average, {newReviews} new this month

Provide a concise 3-paragraph summary:
1. Overall performance assessment
2. Key wins and areas of concern
3. Top 3 actionable recommendations for next month`,
      isActive: true,
    },
  })

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Update `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Run seed:

```bash
npx prisma db seed
```

### 2.5 Create TypeScript Types

**`src/types/database.ts`**:

```typescript
import type {
  Organization,
  RestaurantGroup,
  Location,
  UserProfile,
  UserOrganization,
  MonthlyMetrics,
  HealthScoreConfig,
  HealthScoreHistory,
} from '@prisma/client'

// Extended types with relations
export type OrganizationWithGroups = Organization & {
  restaurantGroups: RestaurantGroup[]
}

export type LocationWithMetrics = Location & {
  monthlyMetrics: MonthlyMetrics[]
  healthScoreConfigs: HealthScoreConfig[]
  healthScoreHistory: HealthScoreHistory[]
}

export type UserWithOrganizations = UserProfile & {
  userOrganizations: (UserOrganization & {
    organization: Organization
  })[]
}

// Health Score types
export interface HealthScoreWeights {
  totalSales: number
  primeCost: number
  foodSales: number
  alcoholSales: number
  beerSales: number
  wineSales: number
  foodCosts: number
  laborCosts: number
  ppa: number
  customerLoyalty: number
  reviews: number
  prMentions: number
  websiteVisibility: number
}

export interface HealthScoreTargets {
  totalSales: number
  primeCost: number
  foodSales: number
  alcoholSales: number
  beerSales: number
  wineSales: number
  foodCosts: number
  laborCosts: number
  ppa: number
  customerLoyalty: number
  reviews: number
  prMentions: number
  websiteVisibility: number
}

export interface HealthScoreBreakdown {
  metric: string
  weight: number
  actual: number
  target: number
  score: number // percentage of target achieved
  weightedScore: number
}
```

### 2.6 Deliverables Checklist

- [ ] Prisma schema complete
- [ ] Initial migration run
- [ ] Prisma client singleton
- [ ] Seed script with default data
- [ ] TypeScript types for all entities
- [ ] Database connection tested
- [ ] Row Level Security policies in Supabase

---

## Phase 3: Design System & Component Library (Weeks 4-5)

### 3.1 Install shadcn/ui

```bash
npx shadcn@latest init
```

Configure with:
- Style: Default
- Base color: Slate
- CSS variables: Yes

### 3.2 Add Core shadcn Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add dropdown-menu
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add tabs
npx shadcn@latest add tooltip
npx shadcn@latest add popover
npx shadcn@latest add switch
npx shadcn@latest add slider
npx shadcn@latest add progress
npx shadcn@latest add skeleton
npx shadcn@latest add toast
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add separator
npx shadcn@latest add table
```

### 3.3 Configure Global Styles

**`src/app/globals.css`**:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 239 84% 67%;
    --radius: 0.5rem;

    /* Health Score Colors */
    --health-excellent: 142 76% 36%;
    --health-good: 84 81% 44%;
    --health-warning: 48 96% 53%;
    --health-danger: 0 84% 60%;

    /* Chart Colors */
    --chart-1: 239 84% 67%;
    --chart-2: 262 83% 58%;
    --chart-3: 187 92% 43%;
    --chart-4: 160 84% 39%;
    --chart-5: 38 92% 50%;
    --chart-6: 330 81% 60%;
    --chart-7: 215 16% 47%;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 239 84% 67%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Tabular numbers for metrics */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}
```

### 3.4 Create Theme Provider

**`src/lib/theme/theme-provider.tsx`**:

```typescript
'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### 3.5 Create Custom Components

**`src/components/ui/metric-value.tsx`** (For displaying numbers):

```typescript
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface MetricValueProps {
  value: number
  format?: 'currency' | 'percent' | 'number'
  animate?: boolean
  className?: string
}

export function MetricValue({
  value,
  format = 'number',
  animate = true,
  className,
}: MetricValueProps) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value)

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value)
      return
    }

    const duration = 1000
    const steps = 60
    const stepValue = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += stepValue
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(current)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value, animate])

  const formatted = React.useMemo(() => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(displayValue)
      case 'percent':
        return `${displayValue.toFixed(2)}%`
      default:
        return displayValue.toLocaleString('en-US', {
          maximumFractionDigits: 2,
        })
    }
  }, [displayValue, format])

  return (
    <span className={cn('tabular-nums font-semibold', className)}>
      {formatted}
    </span>
  )
}
```

**`src/components/ui/health-badge.tsx`**:

```typescript
import { cn } from '@/lib/utils'

interface HealthBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function HealthBadge({ score, showLabel = false, size = 'md' }: HealthBadgeProps) {
  const getHealthColor = (score: number) => {
    if (score >= 100) return 'bg-health-excellent text-white'
    if (score >= 90) return 'bg-health-good text-white'
    if (score >= 80) return 'bg-health-warning text-black'
    return 'bg-health-danger text-white'
  }

  const getHealthLabel = (score: number) => {
    if (score >= 100) return 'Excellent'
    if (score >= 90) return 'Good'
    if (score >= 80) return 'Fair'
    return 'Needs Attention'
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium tabular-nums',
        getHealthColor(score),
        sizeClasses[size]
      )}
    >
      {score.toFixed(2)}%
      {showLabel && <span className="font-normal">({getHealthLabel(score)})</span>}
    </span>
  )
}
```

**`src/components/ui/trend-indicator.tsx`**:

```typescript
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendIndicatorProps {
  current: number
  previous: number
  format?: 'percent' | 'absolute'
  className?: string
}

export function TrendIndicator({
  current,
  previous,
  format = 'percent',
  className,
}: TrendIndicatorProps) {
  const change = current - previous
  const percentChange = previous !== 0 ? ((change / previous) * 100) : 0

  const isPositive = change > 0
  const isNeutral = change === 0

  const displayValue = format === 'percent'
    ? `${Math.abs(percentChange).toFixed(1)}%`
    : Math.abs(change).toLocaleString()

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isPositive && 'text-health-excellent',
        !isPositive && !isNeutral && 'text-health-danger',
        isNeutral && 'text-muted-foreground',
        className
      )}
    >
      {isPositive && <TrendingUp className="h-4 w-4" />}
      {!isPositive && !isNeutral && <TrendingDown className="h-4 w-4" />}
      {isNeutral && <Minus className="h-4 w-4" />}
      {isPositive && '+'}
      {displayValue}
    </span>
  )
}
```

### 3.6 Deliverables Checklist

- [ ] shadcn/ui initialized and configured
- [ ] All core components installed
- [ ] Global CSS with design tokens
- [ ] Dark mode support
- [ ] Theme provider
- [ ] Custom metric components (MetricValue, HealthBadge, TrendIndicator)
- [ ] Storybook setup (optional but recommended)

---

## Phase 4: Dashboard Layout & Navigation (Weeks 5-6)

### 4.1 Create Dashboard Layout

**`src/app/(dashboard)/layout.tsx`**:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/navigation/sidebar'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { TopBar } from '@/components/navigation/top-bar'
import { LocationProvider } from '@/hooks/use-location'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with organizations and locations
  const profile = await prisma.userProfile.findUnique({
    where: { supabaseUserId: user.id },
    include: {
      userOrganizations: {
        include: {
          organization: {
            include: {
              restaurantGroups: {
                include: {
                  locations: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!profile) {
    redirect('/onboarding')
  }

  // Get all locations user has access to
  const locations = profile.userOrganizations.flatMap(uo =>
    uo.organization.restaurantGroups.flatMap(rg => rg.locations)
  )

  return (
    <LocationProvider locations={locations}>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden lg:flex" />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={profile} />
          
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <MobileNav className="lg:hidden" />
      </div>
    </LocationProvider>
  )
}
```

### 4.2 Create Sidebar Component

**`src/components/navigation/sidebar.tsx`**:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  Star,
  Search,
  Newspaper,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LocationSwitcher } from './location-switcher'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Health Score', href: '/health-score', icon: Target },
  { name: 'Trends', href: '/trends', icon: TrendingUp },
  { type: 'separator', label: 'Operations' },
  { name: 'Sales', href: '/sales', icon: DollarSign },
  { name: 'Costs', href: '/costs', icon: Receipt },
  { name: 'Customers', href: '/customers', icon: Users },
  { type: 'separator', label: 'Marketing' },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Visibility', href: '/visibility', icon: Search },
  { name: 'PR', href: '/pr', icon: Newspaper },
]

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-background transition-all duration-200',
        collapsed ? 'w-[72px]' : 'w-60',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="font-semibold">Prometheus</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && 'mx-auto')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Location Switcher */}
      <div className="border-b p-3">
        <LocationSwitcher collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item, index) =>
          item.type === 'separator' ? (
            <div key={index} className="py-2">
              {!collapsed && (
                <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
              )}
            </div>
          ) : (
            <Link
              key={item.name}
              href={item.href!}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t p-3">
        {bottomNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </div>
    </aside>
  )
}
```

### 4.3 Create Location Switcher

**`src/components/navigation/location-switcher.tsx`**:

```typescript
'use client'

import { Check, ChevronsUpDown, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useLocation } from '@/hooks/use-location'
import { useState } from 'react'

interface LocationSwitcherProps {
  collapsed?: boolean
}

export function LocationSwitcher({ collapsed }: LocationSwitcherProps) {
  const [open, setOpen] = useState(false)
  const { locations, currentLocation, setCurrentLocation } = useLocation()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            collapsed && 'w-10 justify-center px-0'
          )}
        >
          <MapPin className="h-4 w-4 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="ml-2 truncate">
                {currentLocation?.name || 'All Locations'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search location..." />
          <CommandList>
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setCurrentLocation(null)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    !currentLocation ? 'opacity-100' : 'opacity-0'
                  )}
                />
                All Locations
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Locations">
              {locations.map((location) => (
                <CommandItem
                  key={location.id}
                  onSelect={() => {
                    setCurrentLocation(location)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      currentLocation?.id === location.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {location.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

### 4.4 Create Mobile Navigation

**`src/components/navigation/mobile-nav.tsx`**:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Target,
  DollarSign,
  Star,
  MoreHorizontal,
} from 'lucide-react'

const tabs = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Health', href: '/health-score', icon: Target },
  { name: 'Sales', href: '/sales', icon: DollarSign },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'More', href: '/more', icon: MoreHorizontal },
]

interface MobileNavProps {
  className?: string
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-safe',
        className
      )}
    >
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <tab.icon className={cn('h-5 w-5', isActive && 'fill-primary/20')} />
              <span className="text-xs font-medium">{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

### 4.5 Create Location Hook

**`src/hooks/use-location.tsx`**:

```typescript
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Location } from '@prisma/client'

interface LocationContextType {
  locations: Location[]
  currentLocation: Location | null
  setCurrentLocation: (location: Location | null) => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({
  children,
  locations,
}: {
  children: ReactNode
  locations: Location[]
}) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)

  return (
    <LocationContext.Provider
      value={{ locations, currentLocation, setCurrentLocation }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
```

### 4.6 Deliverables Checklist

- [ ] Dashboard layout with responsive design
- [ ] Desktop sidebar (collapsible)
- [ ] Mobile bottom navigation
- [ ] Top bar with user menu
- [ ] Location switcher component
- [ ] Location context/hook
- [ ] Breadcrumbs component
- [ ] Page header component

---

## Phase 5: Chart Components (Weeks 6-7)

### 5.1 Install Chart Dependencies

Already installed Tremor in Phase 0. Configure it:

**`src/lib/tremor.ts`**:

```typescript
// Tremor color configuration
export const chartColors = {
  primary: 'indigo',
  secondary: 'violet',
  tertiary: 'cyan',
  success: 'emerald',
  warning: 'amber',
  danger: 'rose',
  neutral: 'slate',
}
```

### 5.2 Create Comparative Bar Chart

**`src/components/charts/comparative-bar.tsx`**:

```typescript
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthScoreBox } from './health-score-box'

interface ComparativeBarProps {
  title: string
  description?: string
  data: {
    label: string
    value: number
    isTarget?: boolean
    year?: number
  }[]
  format?: 'currency' | 'percent' | 'number'
  targetValue?: number
  healthScore?: {
    percentage: number
    score: number
    maxScore: number
  }
  explanation?: string
}

const formatValue = (value: number, format: string) => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    case 'percent':
      return `${value.toFixed(2)}%`
    default:
      return value.toLocaleString()
  }
}

const getBarColor = (item: any, targetValue?: number) => {
  if (item.isTarget) return 'hsl(var(--muted-foreground))'
  if (item.year && item.year < new Date().getFullYear()) {
    return item.year === new Date().getFullYear() - 1
      ? 'hsl(var(--chart-7))'
      : 'hsl(var(--chart-5))'
  }
  // Current year actual - color based on target
  if (targetValue) {
    const percentage = (item.value / targetValue) * 100
    if (percentage >= 100) return 'hsl(var(--health-excellent))'
    if (percentage >= 90) return 'hsl(var(--health-good))'
    if (percentage >= 80) return 'hsl(var(--health-warning))'
    return 'hsl(var(--health-danger))'
  }
  return 'hsl(var(--primary))'
}

export function ComparativeBar({
  title,
  description,
  data,
  format = 'currency',
  targetValue,
  healthScore,
  explanation,
}: ComparativeBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatValue(value, format)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium">{data.label}</p>
                      <p className="text-lg font-bold tabular-nums">
                        {formatValue(data.value, format)}
                      </p>
                      {targetValue && (
                        <p className="text-sm text-muted-foreground">
                          {((data.value / targetValue) * 100).toFixed(1)}% of target
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry, targetValue)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {healthScore && (
          <HealthScoreBox
            percentage={healthScore.percentage}
            score={healthScore.score}
            maxScore={healthScore.maxScore}
          />
        )}

        {explanation && (
          <p className="mt-4 text-sm text-muted-foreground">
            ℹ️ {explanation}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

### 5.3 Create Stacked Bar Chart

**`src/components/charts/stacked-bar.tsx`**:

```typescript
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthScoreBox } from './health-score-box'

interface StackedBarProps {
  title: string
  description?: string
  data: any[]
  segments: {
    key: string
    label: string
    color: string
  }[]
  format?: 'currency' | 'percent' | 'number'
  healthScore?: {
    percentage: number
    score: number
    maxScore: number
  }
  explanation?: string
}

export function StackedBar({
  title,
  description,
  data,
  segments,
  format = 'currency',
  healthScore,
  explanation,
}: StackedBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="mb-2 font-medium">{label}</p>
                      {payload.map((item: any) => (
                        <div key={item.dataKey} className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-sm">{item.name}:</span>
                          <span className="font-medium tabular-nums">
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Legend />
              {segments.map((segment) => (
                <Bar
                  key={segment.key}
                  dataKey={segment.key}
                  name={segment.label}
                  stackId="stack"
                  fill={segment.color}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {healthScore && (
          <HealthScoreBox
            percentage={healthScore.percentage}
            score={healthScore.score}
            maxScore={healthScore.maxScore}
          />
        )}

        {explanation && (
          <p className="mt-4 text-sm text-muted-foreground">
            ℹ️ {explanation}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

### 5.4 Create Time Series Line Chart

**`src/components/charts/time-series-line.tsx`**:

```typescript
'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthScoreBox } from './health-score-box'

interface TimeSeriesLineProps {
  title: string
  description?: string
  data: {
    date: string
    value: number
  }[]
  format?: 'currency' | 'percent' | 'number'
  goalLine?: {
    value: number
    label: string
    type: 'min' | 'max'
  }
  healthScore?: {
    percentage: number
    score: number
    maxScore: number
  }
  explanation?: string
}

export function TimeSeriesLine({
  title,
  description,
  data,
  format = 'number',
  goalLine,
  healthScore,
  explanation,
}: TimeSeriesLineProps) {
  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`
      case 'percent':
        return `${value.toFixed(2)}%`
      default:
        return value.toLocaleString()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm text-muted-foreground">{data.date}</p>
                      <p className="text-lg font-bold tabular-nums">
                        {formatValue(data.value)}
                      </p>
                    </div>
                  )
                }}
              />
              {goalLine && (
                <ReferenceLine
                  y={goalLine.value}
                  stroke={goalLine.type === 'min' ? 'hsl(var(--health-excellent))' : 'hsl(var(--health-danger))'}
                  strokeDasharray="5 5"
                  label={{
                    value: goalLine.label,
                    position: 'right',
                    fill: goalLine.type === 'min' ? 'hsl(var(--health-excellent))' : 'hsl(var(--health-danger))',
                    fontSize: 12,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {healthScore && (
          <HealthScoreBox
            percentage={healthScore.percentage}
            score={healthScore.score}
            maxScore={healthScore.maxScore}
          />
        )}

        {explanation && (
          <p className="mt-4 text-sm text-muted-foreground">
            ℹ️ {explanation}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

### 5.5 Create Health Score Box Component

**`src/components/charts/health-score-box.tsx`**:

```typescript
'use client'

import { cn } from '@/lib/utils'
import { Sparkline } from './sparkline'

interface HealthScoreBoxProps {
  percentage: number
  score: number
  maxScore: number
  trendData?: number[]
}

export function HealthScoreBox({
  percentage,
  score,
  maxScore,
  trendData,
}: HealthScoreBoxProps) {
  const getHealthColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-health-excellent text-white'
    if (percentage >= 90) return 'bg-health-good text-white'
    if (percentage >= 80) return 'bg-health-warning text-black'
    return 'bg-health-danger text-white'
  }

  return (
    <div className="mt-4 flex items-center gap-4 rounded-lg border p-3">
      <div className="text-sm font-medium text-muted-foreground">
        Health<br />Score
      </div>
      <div
        className={cn(
          'rounded-md px-3 py-1 text-lg font-bold tabular-nums',
          getHealthColor(percentage)
        )}
      >
        {percentage.toFixed(0)}%
      </div>
      {trendData && (
        <div className="flex-1">
          <Sparkline data={trendData} color={getHealthColor(percentage)} />
        </div>
      )}
      <div className="text-right text-sm tabular-nums">
        <span className="font-medium">{score.toFixed(1)}</span>
        <span className="text-muted-foreground"> out of {maxScore}</span>
      </div>
    </div>
  )
}
```

### 5.6 Create Sparkline Component

**`src/components/charts/sparkline.tsx`**:

```typescript
'use client'

import { Line, LineChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

export function Sparkline({ data, color = 'hsl(var(--primary))', height = 24 }: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### 5.7 Deliverables Checklist

- [ ] Comparative bar chart (Actual vs Target vs Prior Years)
- [ ] Stacked bar chart (Beverages, Customer Loyalty, Reviews)
- [ ] Time series line chart with goal lines
- [ ] Sparkline component
- [ ] Health Score box component
- [ ] Chart loading skeletons
- [ ] Chart error states
- [ ] Responsive chart sizing
- [ ] Animation on load

---

## Phase 6: Health Score System (Weeks 7-8)

### 6.1 Create Health Score Calculation Utility

**`src/lib/utils/health-score.ts`**:

```typescript
import { HealthScoreWeights, HealthScoreTargets, HealthScoreBreakdown } from '@/types/database'

export interface MetricData {
  totalSales?: number
  foodSales?: number
  alcoholSales?: number
  beerSales?: number
  wineSales?: number
  foodCosts?: number
  laborCosts?: number
  primeCost?: number
  ppa?: number
  customerLoyalty?: number
  reviews?: number
  prMentions?: number
  websiteVisibility?: number
}

export interface HealthScoreResult {
  overallScore: number
  breakdown: HealthScoreBreakdown[]
  ebitdaAdjustment: number
}

export function calculateHealthScore(
  metrics: MetricData,
  weights: HealthScoreWeights,
  targets: HealthScoreTargets,
  ebitda?: { actual: number; target: number; bonus: number; penalty: number }
): HealthScoreResult {
  const breakdown: HealthScoreBreakdown[] = []

  // Calculate score for each metric
  const metricKeys = Object.keys(weights) as (keyof HealthScoreWeights)[]

  for (const key of metricKeys) {
    const weight = weights[key]
    const target = targets[key]
    const actual = metrics[key]

    if (actual === undefined || target === undefined || weight === 0) {
      continue
    }

    // For cost metrics (lower is better), invert the calculation
    const isCostMetric = ['foodCosts', 'laborCosts', 'primeCost'].includes(key)

    let score: number
    if (isCostMetric) {
      // If actual is lower than target, that's good (score > 100)
      score = target > 0 ? (target / actual) * 100 : 0
    } else {
      // For revenue metrics (higher is better)
      score = target > 0 ? (actual / target) * 100 : 0
    }

    // Cap score at 150% to prevent outliers from skewing
    score = Math.min(score, 150)

    const weightedScore = (score * weight) / 100

    breakdown.push({
      metric: formatMetricName(key),
      weight,
      actual,
      target,
      score,
      weightedScore,
    })
  }

  // Calculate total weighted score
  const totalWeight = breakdown.reduce((sum, item) => sum + item.weight, 0)
  const totalWeightedScore = breakdown.reduce((sum, item) => sum + item.weightedScore, 0)

  // Normalize to 100 if weights don't sum to exactly 100
  const normalizedScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0

  // Calculate EBITDA adjustment
  let ebitdaAdjustment = 0
  if (ebitda) {
    const ebitdaPercentage = ebitda.target > 0 ? (ebitda.actual / ebitda.target) * 100 : 0
    if (ebitdaPercentage >= 100) {
      ebitdaAdjustment = ebitda.bonus
    } else if (ebitdaPercentage < 100) {
      // Penalty is more than bonus (per spec)
      ebitdaAdjustment = -ebitda.penalty * (1 - ebitdaPercentage / 100)
    }
  }

  return {
    overallScore: normalizedScore + ebitdaAdjustment,
    breakdown,
    ebitdaAdjustment,
  }
}

function formatMetricName(key: string): string {
  const names: Record<string, string> = {
    totalSales: 'Total Sales',
    foodSales: 'Food Sales',
    alcoholSales: 'Alcohol Sales',
    beerSales: 'Beer Sales',
    wineSales: 'Wine Sales',
    foodCosts: 'Food Costs',
    laborCosts: 'Labor Costs',
    primeCost: 'Prime Cost',
    ppa: 'PPA',
    customerLoyalty: 'Customer Loyalty',
    reviews: 'Reviews',
    prMentions: 'PR Mentions',
    websiteVisibility: 'Website Visibility',
  }
  return names[key] || key
}

export const DEFAULT_WEIGHTS: HealthScoreWeights = {
  totalSales: 30,
  primeCost: 25,
  foodSales: 20.4,
  alcoholSales: 3.6,
  beerSales: 0.3,
  wineSales: 5.7,
  foodCosts: 15,
  laborCosts: 15,
  ppa: 5,
  customerLoyalty: 5,
  reviews: 2,
  prMentions: 2,
  websiteVisibility: 1,
}
```

### 6.2 Create Health Score API Routes

**`src/app/api/locations/[locationId]/health-score/route.ts`**:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth/requireOrganization'
import { prisma } from '@/lib/prisma'
import { calculateHealthScore, DEFAULT_WEIGHTS } from '@/lib/utils/health-score'

export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  const auth = await requireOrganization()
  if (auth instanceof NextResponse) return auth

  const { locationId } = params
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  // Get location and verify access
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      restaurantGroup: true,
      healthScoreConfigs: true,
    },
  })

  if (!location || location.restaurantGroup.organizationId !== auth.organization.id) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  // Get metrics for the month
  const monthDate = new Date(`${month}-01`)
  
  const [
    monthlyMetrics,
    customerLoyalty,
    reviews,
    websiteVisibility,
    prMentions,
  ] = await Promise.all([
    prisma.monthlyMetrics.findUnique({
      where: { locationId_month: { locationId, month: monthDate } },
    }),
    prisma.customerLoyalty.findUnique({
      where: { locationId_month: { locationId, month: monthDate } },
    }),
    prisma.reviewMetrics.findUnique({
      where: { locationId_month: { locationId, month: monthDate } },
    }),
    prisma.websiteVisibility.findUnique({
      where: { locationId_month: { locationId, month: monthDate } },
    }),
    prisma.pRMention.findUnique({
      where: { locationId_month: { locationId, month: monthDate } },
    }),
  ])

  // Get health score config or use defaults
  const config = location.healthScoreConfigs[0]
  const weights = config?.weights as any || DEFAULT_WEIGHTS
  const targets = config?.targets as any || {}

  // Build metrics object
  const metrics = {
    totalSales: monthlyMetrics?.totalSales?.toNumber(),
    foodSales: monthlyMetrics?.foodSales?.toNumber(),
    alcoholSales: monthlyMetrics?.alcoholSales?.toNumber(),
    beerSales: monthlyMetrics?.beerSales?.toNumber(),
    wineSales: monthlyMetrics?.wineSales?.toNumber(),
    foodCosts: monthlyMetrics?.foodCosts?.toNumber(),
    laborCosts: monthlyMetrics?.laborCosts?.toNumber(),
    primeCost: monthlyMetrics?.primeCost?.toNumber(),
    ppa: monthlyMetrics?.ppa?.toNumber(),
    customerLoyalty: customerLoyalty?.percentThreePlus?.toNumber(),
    reviews: reviews?.averageRating?.toNumber(),
    prMentions: prMentions?.count,
    websiteVisibility: websiteVisibility?.visibilityPercent?.toNumber(),
  }

  // Calculate health score
  const result = calculateHealthScore(metrics, weights, targets)

  return NextResponse.json({
    month,
    ...result,
    metrics,
    weights,
    targets,
  })
}
```

### 6.3 Create Health Score Hero Card

**`src/components/dashboard/health-score-hero.tsx`**:

```typescript
'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkline } from '@/components/charts/sparkline'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { HealthScoreBreakdown } from '@/types/database'

interface HealthScoreHeroProps {
  score: number
  breakdown: HealthScoreBreakdown[]
  trendData: number[]
  ebitdaAdjustment?: number
}

export function HealthScoreHero({
  score,
  breakdown,
  trendData,
  ebitdaAdjustment = 0,
}: HealthScoreHeroProps) {
  const getScoreColor = (score: number) => {
    if (score >= 100) return 'text-health-excellent'
    if (score >= 90) return 'text-health-good'
    if (score >= 80) return 'text-health-warning'
    return 'text-health-danger'
  }

  const getProgressColor = (score: number) => {
    if (score >= 100) return 'bg-health-excellent'
    if (score >= 90) return 'bg-health-good'
    if (score >= 80) return 'bg-health-warning'
    return 'bg-health-danger'
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Overall Health Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Score Display */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted/50 p-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn('text-6xl font-bold tabular-nums', getScoreColor(score))}
            >
              {score.toFixed(2)}
            </motion.div>
            <div className="mt-4 h-16 w-48">
              <Sparkline data={trendData} color="hsl(var(--primary))" height={64} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Trend (12 months)</p>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr,60px,80px] gap-2 text-sm font-medium text-muted-foreground">
              <span>Metric</span>
              <span className="text-right">Weight</span>
              <span className="text-right">Score</span>
            </div>
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {breakdown.map((item) => (
                <div
                  key={item.metric}
                  className="grid grid-cols-[1fr,60px,80px] items-center gap-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full transition-all', getProgressColor(item.score))}
                        style={{ width: `${Math.min(item.score, 100)}%` }}
                      />
                    </div>
                    <span className="w-24 truncate text-sm">{item.metric}</span>
                  </div>
                  <span className="text-right text-sm tabular-nums text-muted-foreground">
                    {item.weight}%
                  </span>
                  <span
                    className={cn(
                      'text-right text-sm font-medium tabular-nums',
                      getScoreColor(item.score)
                    )}
                  >
                    {item.score.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>

            {ebitdaAdjustment !== 0 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="text-sm font-medium">EBITDA Adjustment</span>
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    ebitdaAdjustment > 0 ? 'text-health-excellent' : 'text-health-danger'
                  )}
                >
                  {ebitdaAdjustment > 0 ? '+' : ''}{ebitdaAdjustment.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 6.4 Create Health Score Configuration Page

**`src/app/(dashboard)/health-score/page.tsx`**:

```typescript
import { Suspense } from 'react'
import { HealthScoreHero } from '@/components/dashboard/health-score-hero'
import { HealthScoreConfig } from '@/components/dashboard/health-score-config'
import { Skeleton } from '@/components/ui/skeleton'

export default function HealthScorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Health Score</h1>
        <p className="text-muted-foreground">
          Track your restaurant's overall performance
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <HealthScoreHero
          score={93.06}
          breakdown={[
            { metric: 'Total Sales', weight: 30, actual: 507855, target: 567694, score: 89.46, weightedScore: 26.84 },
            { metric: 'Prime Cost', weight: 25, actual: 59.5, target: 60, score: 100.84, weightedScore: 25.21 },
            // ... more breakdown items
          ]}
          trendData={[88, 91, 89, 92, 90, 93, 91, 94, 92, 93, 91, 93]}
          ebitdaAdjustment={0}
        />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <HealthScoreConfig />
      </Suspense>
    </div>
  )
}
```

### 6.5 Deliverables Checklist

- [ ] Health score calculation utility
- [ ] Health score API route (GET/POST)
- [ ] Health score hero card component
- [ ] Health score configuration page
- [ ] Weight adjustment UI with sliders
- [ ] Target setting forms
- [ ] Health score history tracking
- [ ] Monthly health score cron job

---

## Phase 7: Data Entry & Settings (Weeks 8-9)

### 7.1 Settings Page Structure

Create settings pages:
- `/settings` - General settings (name, seats, hours, cuisine)
- `/settings/integrations` - Integration connections
- `/settings/team` - User management
- `/settings/billing` - Subscription management
- `/settings/appearance` - Theme customization (for partners)

### 7.2 Location Settings Form

**`src/app/(dashboard)/settings/page.tsx`**:

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HoursOfOperationForm } from '@/components/forms/hours-of-operation'
import { useLocation } from '@/hooks/use-location'

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  totalSeats: z.number().min(1, 'Must have at least 1 seat'),
  cuisineType: z.string().optional(),
  timezone: z.string(),
})

type LocationFormData = z.infer<typeof locationSchema>

export default function SettingsPage() {
  const { currentLocation } = useLocation()

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: currentLocation?.name || '',
      totalSeats: currentLocation?.totalSeats || 0,
      cuisineType: currentLocation?.cuisineType || '',
      timezone: currentLocation?.timezone || 'America/Chicago',
    },
  })

  const onSubmit = async (data: LocationFormData) => {
    // API call to update location
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your restaurant location settings
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              Basic information about your restaurant location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name</Label>
                <Input id="name" {...form.register('name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalSeats">Total Available Seats</Label>
                <Input
                  id="totalSeats"
                  type="number"
                  {...form.register('totalSeats', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cuisineType">Cuisine Type</Label>
                <Select
                  value={form.watch('cuisineType')}
                  onValueChange={(value) => form.setValue('cuisineType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cuisine type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMERICAN">American</SelectItem>
                    <SelectItem value="AMERICAN_MODERN">American (Modern)</SelectItem>
                    <SelectItem value="ASIAN_FUSION">Asian Fusion</SelectItem>
                    <SelectItem value="BARBECUE">Barbecue</SelectItem>
                    <SelectItem value="FRENCH">French</SelectItem>
                    <SelectItem value="ITALIAN">Italian</SelectItem>
                    <SelectItem value="MEXICAN">Mexican</SelectItem>
                    <SelectItem value="SEAFOOD">Seafood</SelectItem>
                    <SelectItem value="STEAKHOUSE">Steakhouse</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={form.watch('timezone')}
                  onValueChange={(value) => form.setValue('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern</SelectItem>
                    <SelectItem value="America/Chicago">Central</SelectItem>
                    <SelectItem value="America/Denver">Mountain</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hours of Operation</CardTitle>
            <CardDescription>
              Set your restaurant's operating hours for each day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HoursOfOperationForm />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  )
}
```

### 7.3 Deliverables Checklist

- [ ] Location settings page
- [ ] Hours of operation form
- [ ] Cuisine type selector
- [ ] Team/user management page
- [ ] Invite user flow
- [ ] Role assignment UI
- [ ] Billing/subscription page (integrate with Stripe)
- [ ] API routes for all settings CRUD operations
- [ ] Zod validation schemas

---

## Phase 8: Integrations (Weeks 9-11)

### 8.1 Integration Architecture

Each integration follows this pattern:
1. **OAuth/API Key Connection** - Store credentials securely
2. **Initial Sync** - Pull last 12 months of data
3. **Scheduled Sync** - Daily/hourly updates
4. **Webhook Handler** - Real-time updates (if supported)

### 8.2 Create Integration Service Base

**`src/lib/integrations/base.ts`**:

```typescript
import { prisma } from '@/lib/prisma'
import { IntegrationType, IntegrationStatus } from '@prisma/client'

export abstract class IntegrationService {
  protected locationId: string
  protected integrationType: IntegrationType

  constructor(locationId: string, integrationType: IntegrationType) {
    this.locationId = locationId
    this.integrationType = integrationType
  }

  abstract connect(credentials: any): Promise<void>
  abstract sync(): Promise<void>
  abstract disconnect(): Promise<void>

  protected async updateStatus(status: IntegrationStatus, error?: string) {
    await prisma.integration.update({
      where: {
        locationId_type: {
          locationId: this.locationId,
          type: this.integrationType,
        },
      },
      data: {
        status,
        lastError: error,
        lastSyncAt: status === 'CONNECTED' ? new Date() : undefined,
      },
    })
  }

  protected async saveMetrics(month: Date, data: any) {
    await prisma.monthlyMetrics.upsert({
      where: {
        locationId_month: {
          locationId: this.locationId,
          month,
        },
      },
      update: data,
      create: {
        locationId: this.locationId,
        month,
        ...data,
      },
    })
  }
}
```

### 8.3 Toast Integration

**`src/lib/integrations/toast.ts`**:

```typescript
import { IntegrationService } from './base'

export class ToastIntegration extends IntegrationService {
  constructor(locationId: string) {
    super(locationId, 'TOAST')
  }

  async connect(credentials: { apiKey: string; restaurantGuid: string }) {
    // Validate credentials with Toast API
    // Store encrypted credentials
    // Start initial sync
  }

  async sync() {
    try {
      await this.updateStatus('SYNCING')

      // Fetch data from Toast API
      // - Sales data
      // - Labor data
      // - Menu item performance

      // Process and save to database
      // ...

      await this.updateStatus('CONNECTED')
    } catch (error) {
      await this.updateStatus('ERROR', error.message)
      throw error
    }
  }

  async disconnect() {
    // Remove credentials
    // Update status
  }
}
```

### 8.4 OpenTable Integration

**`src/lib/integrations/opentable.ts`**:

```typescript
import { IntegrationService } from './base'

export class OpenTableIntegration extends IntegrationService {
  constructor(locationId: string) {
    super(locationId, 'OPENTABLE')
  }

  async connect(credentials: { apiKey: string; restaurantId: string }) {
    // Validate and store credentials
  }

  async sync() {
    try {
      await this.updateStatus('SYNCING')

      // Fetch Guest Frequency Report
      // - Lifetime visits
      // - Visit frequency segments

      // Calculate loyalty metrics
      // ...

      await this.updateStatus('CONNECTED')
    } catch (error) {
      await this.updateStatus('ERROR', error.message)
      throw error
    }
  }

  async disconnect() {
    // Clean up
  }
}
```

### 8.5 Integration Connection UI

**`src/app/(dashboard)/settings/integrations/page.tsx`**:

```typescript
import { IntegrationCard } from '@/components/integrations/integration-card'

const integrations = [
  {
    id: 'toast',
    name: 'Toast POS',
    description: 'Sync sales, labor costs, and menu performance',
    logo: '/integrations/toast.svg',
    category: 'Point of Sale',
  },
  {
    id: 'r365',
    name: 'Restaurant 365',
    description: 'Sync sales, inventory, and labor data',
    logo: '/integrations/r365.svg',
    category: 'Point of Sale',
  },
  {
    id: 'opentable',
    name: 'OpenTable',
    description: 'Sync guest frequency and reservation data',
    logo: '/integrations/opentable.svg',
    category: 'Reservations',
  },
  {
    id: 'brightlocal',
    name: 'BrightLocal',
    description: 'Sync review counts and ratings',
    logo: '/integrations/brightlocal.svg',
    category: 'Reviews',
  },
  {
    id: 'semrush',
    name: 'SEMRush',
    description: 'Sync website visibility and keyword rankings',
    logo: '/integrations/semrush.svg',
    category: 'SEO',
  },
]

export default async function IntegrationsPage() {
  // Fetch current integration statuses
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your restaurant systems to pull data automatically
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            // status from DB
          />
        ))}
      </div>
    </div>
  )
}
```

### 8.6 Sync Scheduler (Cron Jobs)

Set up Vercel Cron or similar:

**`vercel.json`**:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-integrations",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/calculate-health-scores",
      "schedule": "0 7 1 * *"
    }
  ]
}
```

### 8.7 Deliverables Checklist

- [ ] Integration base service class
- [ ] Toast integration
- [ ] Restaurant 365 integration
- [ ] OpenTable integration
- [ ] BrightLocal integration
- [ ] SEMRush integration
- [ ] Integration connection UI
- [ ] OAuth flows where needed
- [ ] Credential encryption
- [ ] Sync status monitoring
- [ ] Error handling and retry logic
- [ ] Cron jobs for scheduled syncs
- [ ] Webhook handlers

---

## Phase 9: AI Features (Pro Plan) (Weeks 11-12)

### 9.1 AI Service Setup

**`src/lib/ai/service.ts`**:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateInsight(
  prompt: string,
  data: Record<string, any>
): Promise<string> {
  // Replace placeholders in prompt with actual data
  let processedPrompt = prompt
  for (const [key, value] of Object.entries(data)) {
    processedPrompt = processedPrompt.replace(`{${key}}`, String(value))
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: processedPrompt,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
```

### 9.2 Monthly Summary Generation

**`src/app/api/ai/monthly-summary/route.ts`**:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth/requireOrganization'
import { prisma } from '@/lib/prisma'
import { generateInsight } from '@/lib/ai/service'

export async function POST(request: NextRequest) {
  const auth = await requireOrganization()
  if (auth instanceof NextResponse) return auth

  // Check if Pro plan
  if (auth.organization.plan !== 'PRO') {
    return NextResponse.json(
      { error: 'AI features require Pro plan' },
      { status: 403 }
    )
  }

  const { locationId, month } = await request.json()

  // Get all relevant data for the month
  const [metrics, loyalty, reviews, visibility] = await Promise.all([
    prisma.monthlyMetrics.findUnique({
      where: { locationId_month: { locationId, month: new Date(month) } },
    }),
    prisma.customerLoyalty.findUnique({
      where: { locationId_month: { locationId, month: new Date(month) } },
    }),
    prisma.reviewMetrics.findUnique({
      where: { locationId_month: { locationId, month: new Date(month) } },
    }),
    prisma.websiteVisibility.findUnique({
      where: { locationId_month: { locationId, month: new Date(month) } },
    }),
  ])

  // Get the prompt
  const prompt = await prisma.aIPrompt.findFirst({
    where: {
      category: 'MONTHLY_SUMMARY',
      isActive: true,
      OR: [
        { organizationId: auth.organization.id },
        { organizationId: null },
      ],
    },
    orderBy: { organizationId: 'desc' }, // Prefer org-specific prompt
  })

  if (!prompt) {
    return NextResponse.json({ error: 'No prompt configured' }, { status: 404 })
  }

  // Generate insight
  const insight = await generateInsight(prompt.promptText, {
    month,
    totalSales: metrics?.totalSales?.toString() || 'N/A',
    foodCosts: metrics?.foodCosts?.toString() || 'N/A',
    laborCosts: metrics?.laborCosts?.toString() || 'N/A',
    primeCost: metrics?.primeCost?.toString() || 'N/A',
    ppa: metrics?.ppa?.toString() || 'N/A',
    customerLoyalty: loyalty?.percentThreePlus?.toString() || 'N/A',
    reviewScore: reviews?.averageRating?.toString() || 'N/A',
    newReviews: reviews?.newReviewsCount?.toString() || 'N/A',
  })

  // Save insight
  await prisma.aIInsight.create({
    data: {
      locationId,
      promptId: prompt.id,
      month: new Date(month),
      generatedText: insight,
    },
  })

  return NextResponse.json({ insight })
}
```

### 9.3 AI Insights Display Component

**`src/components/dashboard/ai-insights.tsx`**:

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface AIInsightsProps {
  locationId: string
  month: string
  initialInsight?: string
}

export function AIInsights({ locationId, month, initialInsight }: AIInsightsProps) {
  const [insight, setInsight] = useState(initialInsight)
  const [loading, setLoading] = useState(false)

  const generateInsight = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/monthly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, month }),
      })
      const data = await response.json()
      setInsight(data.insight)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <CardDescription>
            AI-powered analysis of your restaurant's performance
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateInsight}
          disabled={loading}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Regenerate
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : insight ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {insight.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Generate AI insights to get personalized recommendations
            </p>
            <Button onClick={generateInsight} className="mt-4">
              Generate Insights
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 9.4 Deliverables Checklist

- [ ] AI service with Anthropic/OpenAI integration
- [ ] Monthly summary generation
- [ ] AI insights API routes
- [ ] AI insights display component
- [ ] Prompt management in admin
- [ ] Organization-specific prompt overrides
- [ ] Rate limiting for AI calls
- [ ] Cost tracking for AI usage

---

## Phase 10: White-Label System (Weeks 12-13)

### 10.1 Theme Provider with Organization Context

**`src/lib/theme/organization-theme.tsx`**:

```typescript
'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { Organization } from '@prisma/client'

interface OrganizationTheme {
  appName: string
  logo: string
  favicon: string
  colors: {
    primary: string
    primaryHover: string
    primaryMuted: string
  }
}

const OrganizationThemeContext = createContext<OrganizationTheme | null>(null)

export function OrganizationThemeProvider({
  children,
  organization,
}: {
  children: ReactNode
  organization: Organization
}) {
  const branding = organization.branding as OrganizationTheme | null

  useEffect(() => {
    if (branding?.colors) {
      // Apply CSS custom properties
      document.documentElement.style.setProperty(
        '--primary',
        branding.colors.primary
      )
      document.documentElement.style.setProperty(
        '--primary-hover',
        branding.colors.primaryHover
      )
    }

    // Update favicon
    if (branding?.favicon) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      if (link) link.href = branding.favicon
    }

    // Update document title
    if (branding?.appName) {
      document.title = branding.appName
    }
  }, [branding])

  return (
    <OrganizationThemeContext.Provider value={branding}>
      {children}
    </OrganizationThemeContext.Provider>
  )
}

export function useOrganizationTheme() {
  return useContext(OrganizationThemeContext)
}
```

### 10.2 Custom Domain Handling

Update middleware to handle custom domains and set organization context.

### 10.3 Branding Configuration UI

**`src/app/(dashboard)/settings/appearance/page.tsx`**:

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/ui/image-upload'

export default function AppearancePage() {
  const [logo, setLogo] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [appName, setAppName] = useState('Prometheus')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appearance</h1>
        <p className="text-muted-foreground">
          Customize the look and feel of your dashboard
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize your dashboard with your brand's identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>App Name</Label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Your App Name"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <ImageUpload value={logo} onChange={setLogo} />
          </div>

          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#6366f1"
                className="w-32"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mini preview of dashboard with applied branding */}
        </CardContent>
      </Card>
    </div>
  )
}
```

### 10.4 Deliverables Checklist

- [ ] Organization theme provider
- [ ] CSS variable injection
- [ ] Logo/favicon dynamic loading
- [ ] Custom domain DNS instructions
- [ ] Branding configuration UI
- [ ] Live preview of branding changes
- [ ] Email template customization

---

## Phase 11: Admin Panels (Weeks 13-14)

### 11.1 Super Admin Dashboard

**`src/app/(admin)/page.tsx`**:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

export default async function AdminDashboard() {
  const [orgCount, locationCount, userCount] = await Promise.all([
    prisma.organization.count(),
    prisma.location.count(),
    prisma.userProfile.count(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{orgCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{locationCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{userCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### 11.2 Organization Management

Create CRUD pages for:
- Organizations list/create/edit
- AI Prompts management
- System-wide settings
- User management across all orgs

### 11.3 Deliverables Checklist

- [ ] Admin layout with navigation
- [ ] Admin dashboard with stats
- [ ] Organization CRUD
- [ ] Global AI prompt management
- [ ] User management
- [ ] System settings
- [ ] Audit logs

---

## Phase 12: Testing & QA (Weeks 14-15)

### 12.1 Testing Strategy

```
src/__tests__/
├── unit/
│   ├── health-score.test.ts
│   ├── format-utils.test.ts
│   └── validation.test.ts
├── api/
│   ├── locations.test.ts
│   ├── metrics.test.ts
│   └── health-score.test.ts
├── components/
│   ├── charts.test.tsx
│   └── forms.test.tsx
└── e2e/
    ├── auth.spec.ts
    ├── dashboard.spec.ts
    └── settings.spec.ts
```

### 12.2 Test Setup

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom @playwright/test
```

### 12.3 Example API Route Test

```typescript
import { GET } from '@/app/api/locations/[locationId]/health-score/route'
import { requireOrganization } from '@/lib/auth/requireOrganization'
import { NextRequest, NextResponse } from 'next/server'

jest.mock('@/lib/auth/requireOrganization')
jest.mock('@/lib/prisma')

describe('Health Score API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    (requireOrganization as jest.Mock).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const request = new NextRequest('http://localhost/api/locations/123/health-score')
    const response = await GET(request, { params: { locationId: '123' } })

    expect(response.status).toBe(401)
  })

  it('returns health score data when authenticated', async () => {
    (requireOrganization as jest.Mock).mockResolvedValue({
      user: { id: 'user-1' },
      organization: { id: 'org-1' },
    })

    // Mock prisma calls...

    const request = new NextRequest('http://localhost/api/locations/123/health-score')
    const response = await GET(request, { params: { locationId: '123' } })

    expect(response.status).toBe(200)
  })
})
```

### 12.4 Deliverables Checklist

- [ ] Unit tests for utilities
- [ ] API route tests
- [ ] Component tests
- [ ] E2E tests with Playwright
- [ ] Test coverage > 80%
- [ ] CI/CD running all tests
- [ ] Manual QA checklist completed

---

## Phase 13: Deployment & Launch (Weeks 15-16)

### 13.1 Vercel Deployment

1. Connect GitHub repo to Vercel
2. Configure environment variables
3. Set up custom domain: `app.prometheusrestaurant.com`
4. Configure wildcard subdomain: `*.prometheusrestaurant.com`

### 13.2 Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations run on production
- [ ] Supabase production project configured
- [ ] RLS policies verified
- [ ] Error monitoring (Sentry) configured
- [ ] Analytics (Posthog/Mixpanel) configured
- [ ] Performance monitoring enabled
- [ ] SSL certificates active
- [ ] Custom domain DNS configured
- [ ] Backup strategy in place
- [ ] Rate limiting configured
- [ ] CORS properly configured

### 13.3 Launch Tasks

1. Final security audit
2. Performance testing (Lighthouse, WebPageTest)
3. Load testing
4. Documentation complete
5. Support/help content ready
6. Onboarding flow tested
7. Billing integration tested (Stripe)

### 13.4 Post-Launch

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Plan iteration based on feedback

---

## Summary Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 0: Setup | Week 1 | Project structure, dependencies, CI/CD |
| 1: Auth | Weeks 2-3 | Supabase auth, multi-tenancy middleware |
| 2: Database | Weeks 3-4 | Prisma schema, migrations, seed data |
| 3: Design System | Weeks 4-5 | shadcn/ui, theme, custom components |
| 4: Layout | Weeks 5-6 | Dashboard shell, navigation, location switcher |
| 5: Charts | Weeks 6-7 | All chart types, responsive, animated |
| 6: Health Score | Weeks 7-8 | Calculation engine, hero card, config UI |
| 7: Settings | Weeks 8-9 | Forms, hours, team management |
| 8: Integrations | Weeks 9-11 | Toast, OpenTable, BrightLocal, SEMRush |
| 9: AI Features | Weeks 11-12 | Insights generation, prompt management |
| 10: White-Label | Weeks 12-13 | Theming, custom domains, branding UI |
| 11: Admin | Weeks 13-14 | Super admin panel, org management |
| 12: Testing | Weeks 14-15 | Unit, API, E2E tests |
| 13: Launch | Weeks 15-16 | Deployment, monitoring, go-live |

---

## Questions for Stakeholders

1. **Payment processing** — Stripe or another provider?
2. **Email provider** — Resend, SendGrid, or Supabase built-in?
3. **File storage** — Supabase Storage or S3?
4. **Analytics** — Posthog, Mixpanel, or custom?
5. **Error monitoring** — Sentry?
6. **Initial pilot customer** — Who to test with first?
