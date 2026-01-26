# Data Warehouse Architecture

> Technical specification for Prometheus's data warehouse strategy, operational data layer, and scaling approach.

---

## Overview

Prometheus serves two fundamentally different data needs:

| Need | Pattern | Characteristics |
|------|---------|-----------------|
| **Dashboards** | OLTP | Fast reads, pre-aggregated, real-time-ish |
| **Intelligence** | OLAP | Deep analysis, complex queries, historical |

A single database structure can't optimize for both. Our architecture uses a **two-layer approach** that starts simple and scales as needed.

---

## The Problem

### Dashboard Data (What We Had)

```
DailyMetrics
├── date
├── totalSales      ← Just one number per day
├── laborCost       ← Just one number per day
└── foodCost        ← Just one number per day
```

This works for showing charts, but when Intelligence asks "Why are sales down?", we need to know:
- Which daypart is down? (Breakfast? Dinner?)
- Which items are declining?
- Is it fewer guests or lower check averages?
- What were the staffing levels during slow periods?

### What Intelligence Needs

```
Operational Data
├── Sales by daypart (breakfast, lunch, dinner, late night)
├── Sales by channel (dine-in, takeout, delivery)
├── Menu item performance (weekly)
├── Labor by position (servers, cooks, hosts)
├── Transaction details (payment mix, discounts, voids)
└── 90+ days of history for trend analysis
```

---

## Architecture Overview

```
                                    EXTERNAL SOURCES
          ┌─────────┬─────────┬─────────┬───────────┬─────────┬─────────────┐
          │  Toast  │   R365  │OpenTable│BrightLocal│ SEMrush │Sprout/Social│
          └────┬────┴────┬────┴────┬────┴─────┬─────┴────┬────┴──────┬──────┘
               │         │         │          │          │           │
               ▼         ▼         ▼          ▼          ▼           ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                          INGESTION LAYER                                 │
    │                    (Nightly sync jobs via APIs)                          │
    │    • Scheduled extraction      • Error handling & retry                  │
    │    • Rate limit management     • Change detection                        │
    │    • Raw response archival     • Validation & cleansing                  │
    └──────────────────────────────────────┬───────────────────────────────────┘
                                           │
                       ┌───────────────────┴───────────────────┐
                       ▼                                       ▼
    ┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
    │      OPERATIONAL DATA LAYER         │  │         DASHBOARD DATA LAYER        │
    │        (Granular / Warehouse)       │  │           (Aggregated / Fast)       │
    │                                     │  │                                     │
    │  • DaypartMetrics (sales by shift)  │  │  • DailyMetrics (daily totals)      │
    │  • MenuItemSales (item-level)       │  │  • MonthlyMetrics (rolled up)       │
    │  • LaborDetail (by position)        │  │  • ReviewSnapshot (monthly agg)     │
    │  • TransactionSummary (by day)      │  │  • VisibilitySnapshot               │
    │  • HourlySales (future)             │  │  • SocialSnapshot                   │
    │                                     │  │  • HealthScoreHistory               │
    │  Retention: 2 years                 │  │                                     │
    │  Purpose: Intelligence analysis     │  │  Retention: Forever                 │
    │                                     │  │  Purpose: Fast dashboard queries    │
    └─────────────────┬───────────────────┘  └─────────────────────────────────────┘
                      │                                        ▲
                      ▼                                        │
    ┌─────────────────────────────────────┐                    │
    │      TRANSFORMATION LAYER           │                    │
    │           (ETL / dbt)               │────────────────────┘
    │                                     │    Aggregates flow to dashboard layer
    │  • Calculate daypart trends         │
    │  • Compute menu item velocity       │
    │  • Labor efficiency metrics         │
    │  • Pre-built insight summaries      │
    │  • Alert condition checks           │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │         INSIGHT CACHE LAYER         │
    │      (Pre-calculated for AI)        │
    │                                     │
    │  • InsightCache table               │
    │  • Refreshed nightly                │
    │  • 7/30/90 day windows              │
    │  • Structured JSON for Claude       │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐     ┌─────────────────────────────────┐
    │       INTELLIGENCE ENGINE           │────▶│          CLAUDE API             │
    │                                     │     │                                 │
    │  • Context builder                  │     │  • ~10-15K tokens per run       │
    │  • Report type router               │     │  • Structured output            │
    │  • Usage tracking                   │     │  • Cost: $0.03-0.10/run         │
    │  • Response parser                  │     │                                 │
    └─────────────────────────────────────┘     └─────────────────────────────────┘
```

---

## Data Layer Details

### Operational Layer (Warehouse-Style)

Granular data needed for deep analysis. This is where Intelligence queries.

| Table | Grain | Rows/Location/Year | Purpose |
|-------|-------|-------------------|---------|
| DaypartMetrics | Day × Daypart | ~1,460 | Sales/labor by breakfast/lunch/dinner |
| MenuItemSales | Week × Item | ~5,200 | Menu performance analysis |
| LaborDetail | Day × Position | ~3,650 | Staffing optimization |
| TransactionSummary | Day | ~365 | Payment mix, discounts, voids |
| CategorySales | Day × Category | ~2,500 | Category performance |

**At 100 locations: ~1.3M rows/year** — easily handled by Postgres

### Dashboard Layer (Aggregated)

Pre-rolled data for instant dashboard loads. Simple queries, fast results.

| Table | Grain | Purpose |
|-------|-------|---------|
| DailyMetrics | Day | Sales, costs, guest totals |
| WeeklyMetrics | Week | Weekly rollups |
| MonthlyMetrics | Month | Chart data, YoY comparisons |
| ReviewSnapshot | Month | Review aggregates |
| VisibilitySnapshot | Month | SEO/Maps aggregates |
| SocialSnapshot | Month | Social media aggregates |

### Insight Cache Layer

Pre-calculated analytics ready to feed to Claude. Refreshed nightly.

| InsightType | Window | What's Pre-Calculated |
|-------------|--------|----------------------|
| SALES_TRENDS | 7/30/90d | Daypart trends, channel mix, vs prior period |
| MENU_MOVERS | 30d | Top growing/declining items, velocity changes |
| LABOR_EFFICIENCY | 30d | By daypart, overtime alerts, understaffed shifts |
| GUEST_PATTERNS | 30d | Traffic trends, check avg, new vs returning |
| REVIEW_THEMES | 30d | Common complaints, sentiment shifts |
| CATEGORY_PERFORMANCE | 30d | Apps/Entrees/Drinks trends |
| CHANNEL_MIX | 30d | Dine-in vs takeout vs delivery |

---

## Scaling Strategy

### Phase 1: MVP (0-50 Locations)

**Single Supabase Database**

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OPERATIONAL TABLES (Granular)                                  │
│  ├── DaypartMetrics          90 days × 4 dayparts = 360 rows   │
│  ├── MenuItemSalesWeekly     52 weeks × 100 items = 5,200 rows │
│  ├── LaborDetail             365 days × 10 positions = 3,650   │
│  └── TransactionSummary      365 days = 365 rows               │
│                                                                 │
│  DASHBOARD TABLES (Aggregated)                                  │
│  ├── DailyMetrics            Pre-rolled daily totals           │
│  ├── MonthlyMetrics          Pre-rolled monthly totals         │
│  └── *Snapshot tables        Monthly aggregates                │
│                                                                 │
│  INSIGHT TABLES                                                 │
│  ├── InsightCache            Pre-calculated AI context         │
│  └── IntelligenceReport      Saved report history              │
│                                                                 │
│  APP TABLES                                                     │
│  └── Locations, Users, Config, etc.                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Why this works:
• 50 locations × 15K rows/year = 750K rows/year
• Good indexes + table partitioning = fast queries
• Supabase Pro handles this easily
• Single codebase, simple ops
```

### Phase 2: Growth (50-200 Locations)

**Add BigQuery for Analytics**

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Operational)                     │
│  • User-facing app data                                        │
│  • Dashboard aggregates (fast reads)                           │
│  • Real-time features                                          │
│  • InsightCache (AI context)                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Nightly sync
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BIGQUERY (Analytics)                       │
│  • All granular operational data                               │
│  • 2+ years retention                                          │
│  • Complex cross-location queries                              │
│  • Intelligence context building                               │
│  • Benchmarking across portfolio                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ dbt transforms
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DBT TRANSFORMS                             │
│  • Calculate trends & aggregates                               │
│  • Build InsightCache data                                     │
│  • Push aggregates back to Supabase                           │
└─────────────────────────────────────────────────────────────────┘

Cost: ~$50-200/month for BigQuery at this scale
```

### Phase 3: Enterprise (200+ Locations)

**Full Data Platform**

```
┌─────────────────────────────────────────────────────────────────┐
│                     INGESTION (Fivetran/Airbyte)               │
│  • Managed connectors to Toast, R365, etc.                     │
│  • Automatic schema handling                                   │
│  • Built-in error handling                                     │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BIGQUERY / SNOWFLAKE                          │
│                    (Enterprise Data Warehouse)                 │
│  • Unlimited scale                                             │
│  • Cross-location benchmarking                                 │
│  • Portfolio-level analytics                                   │
│  • ML features for predictions                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│    SUPABASE      │ │   LOOKER/MODE    │ │   INTELLIGENCE   │
│   (App Layer)    │ │  (Ops Dashboards)│ │     ENGINE       │
└──────────────────┘ └──────────────────┘ └──────────────────┘

Cost: $500-2000/month depending on volume
```

---

## Warehouse Technology Options

| Option | Pros | Cons | Cost | Best For |
|--------|------|------|------|----------|
| **Supabase (same DB)** | Simple, no new infra | Not optimized for analytics | Included | MVP, <50 locations |
| **BigQuery** | Serverless, scales infinitely, great for analytics | Google ecosystem, learning curve | ~$5/TB queried | 50+ locations |
| **Snowflake** | Best-in-class analytics, easy | Expensive, overkill for MVP | $$$$ | Enterprise |
| **ClickHouse** | Blazing fast, open source | Self-hosted complexity | Free / hosting | Tech-forward teams |
| **Supabase + TimescaleDB** | Time-series optimized, stays in Postgres | Extension complexity | Included | Good middle ground |

**Recommendation:** Start with Supabase, add BigQuery at 50+ locations.

---

## Operational Data Schemas

### DaypartMetrics

The core operational table. Captures sales and labor at the daypart level.

```prisma
model DaypartMetrics {
  id              String   @id @default(cuid())
  locationId      String
  date            DateTime @db.Date
  daypart         Daypart
  
  // Sales metrics
  grossSales          Decimal  @db.Decimal(10, 2)
  netSales            Decimal  @db.Decimal(10, 2)
  discounts           Decimal  @db.Decimal(10, 2)  @default(0)
  comps               Decimal  @db.Decimal(10, 2)  @default(0)
  voids               Decimal  @db.Decimal(10, 2)  @default(0)
  refunds             Decimal  @db.Decimal(10, 2)  @default(0)
  
  // Guest metrics
  guestCount          Int
  checkCount          Int      // Number of tickets/transactions
  checkAverage        Decimal  @db.Decimal(10, 2)
  
  // Revenue center breakdown
  dineInSales         Decimal? @db.Decimal(10, 2)
  dineInGuests        Int?
  barSales            Decimal? @db.Decimal(10, 2)
  barGuests           Int?
  takeoutSales        Decimal? @db.Decimal(10, 2)
  takeoutOrders       Int?
  deliverySales       Decimal? @db.Decimal(10, 2)
  deliveryOrders      Int?
  cateringSales       Decimal? @db.Decimal(10, 2)
  cateringOrders      Int?
  
  // Labor metrics
  laborHours          Decimal  @db.Decimal(10, 2)
  laborCost           Decimal  @db.Decimal(10, 2)
  laborPercent        Decimal  @db.Decimal(5, 2)   // (laborCost / netSales) * 100
  
  // Labor breakdown by department
  fohHours            Decimal? @db.Decimal(10, 2)
  fohCost             Decimal? @db.Decimal(10, 2)
  bohHours            Decimal? @db.Decimal(10, 2)
  bohCost             Decimal? @db.Decimal(10, 2)
  
  // Staffing counts
  fohHeadcount        Int?     // Number of FOH employees worked
  bohHeadcount        Int?     // Number of BOH employees worked
  
  // Weather (for context)
  weatherCondition    String?  // "sunny", "rainy", "snow"
  highTemp            Int?
  lowTemp             Int?
  
  // Targets (optional, for comparison)
  salesTarget         Decimal? @db.Decimal(10, 2)
  laborTarget         Decimal? @db.Decimal(5, 2)   // Target labor %
  guestTarget         Int?
  
  // Sync metadata
  source              String   @default("TOAST")
  syncedAt            DateTime
  syncStatus          SyncStatus @default(SUCCESS)
  
  location            Location @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([locationId, date, daypart])
  @@index([locationId, date])
  @@index([locationId, daypart])
}

enum Daypart {
  BREAKFAST       // Typically 6am-11am
  LUNCH           // Typically 11am-4pm
  DINNER          // Typically 4pm-10pm
  LATE_NIGHT      // Typically 10pm-close
}
```

### MenuItemSales

Weekly menu item performance for menu engineering analysis.

```prisma
model MenuItemSales {
  id              String   @id @default(cuid())
  locationId      String
  weekStart       DateTime @db.Date  // Monday of the week
  
  // Item identification
  itemId              String   // Toast/POS item ID
  itemName            String
  plu                 String?  // PLU code if available
  
  // Categorization
  category            String   // "Appetizers", "Entrees", "Desserts", etc.
  subcategory         String?  // "Salads", "Steaks", etc.
  menuSection         String?  // "Lunch Menu", "Dinner Menu", "Bar Menu"
  
  // Sales metrics
  quantitySold        Int
  grossSales          Decimal  @db.Decimal(10, 2)
  netSales            Decimal  @db.Decimal(10, 2)
  discountAmount      Decimal  @db.Decimal(10, 2)  @default(0)
  
  // Pricing
  avgPrice            Decimal  @db.Decimal(10, 2)  // Net sales / qty
  menuPrice           Decimal? @db.Decimal(10, 2)  // Listed price
  
  // Cost metrics (from R365 if available)
  theoreticalCost     Decimal? @db.Decimal(10, 2)  // Expected food cost
  actualCost          Decimal? @db.Decimal(10, 2)  // Actual food cost
  costPercent         Decimal? @db.Decimal(5, 2)   // (cost / price) * 100
  marginPercent       Decimal? @db.Decimal(5, 2)   // ((price - cost) / price) * 100
  contributionMargin  Decimal? @db.Decimal(10, 2)  // (price - cost) * qty
  
  // Daypart breakdown (optional)
  breakfastQty        Int?
  lunchQty            Int?
  dinnerQty           Int?
  lateNightQty        Int?
  
  // Channel breakdown (optional)
  dineInQty           Int?
  takeoutQty          Int?
  deliveryQty         Int?
  
  // Modifications
  modifierRevenue     Decimal? @db.Decimal(10, 2)
  avgModifiersPerItem Decimal? @db.Decimal(5, 2)
  
  // Void/Waste
  voidedQty           Int?     @default(0)
  voidedAmount        Decimal? @db.Decimal(10, 2)
  
  // Sync metadata
  source              String   @default("TOAST")
  syncedAt            DateTime
  
  location            Location @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([locationId, weekStart, itemId])
  @@index([locationId, weekStart])
  @@index([locationId, category])
  @@index([locationId, itemName])
}
```

### LaborDetail

Daily labor by position for staffing optimization.

```prisma
model LaborDetail {
  id              String   @id @default(cuid())
  locationId      String
  date            DateTime @db.Date
  
  // Position info
  position            String   // "Server", "Cook", "Host", "Bartender", etc.
  department          LaborDepartment
  
  // Hours
  regularHours        Decimal  @db.Decimal(10, 2)
  overtimeHours       Decimal  @db.Decimal(10, 2)  @default(0)
  doubleTimeHours     Decimal  @db.Decimal(10, 2)  @default(0)
  totalHours          Decimal  @db.Decimal(10, 2)
  
  // Pay
  regularPay          Decimal  @db.Decimal(10, 2)
  overtimePay         Decimal  @db.Decimal(10, 2)  @default(0)
  doubleTimePay       Decimal  @db.Decimal(10, 2)  @default(0)
  totalPay            Decimal  @db.Decimal(10, 2)
  
  // Staffing
  headcount           Int      // Number of employees worked this position
  avgHoursPerPerson   Decimal  @db.Decimal(5, 2)
  avgPayPerPerson     Decimal  @db.Decimal(10, 2)
  
  // Efficiency (calculated)
  salesPerLaborHour   Decimal? @db.Decimal(10, 2)  // SPLH
  guestsPerLaborHour  Decimal? @db.Decimal(10, 2)
  
  // Tips (if tracked)
  totalTips           Decimal? @db.Decimal(10, 2)
  tipsPerHour         Decimal? @db.Decimal(10, 2)
  
  // Sync metadata
  source              String   @default("TOAST")
  syncedAt            DateTime
  
  location            Location @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([locationId, date, position])
  @@index([locationId, date])
  @@index([locationId, department])
}

enum LaborDepartment {
  FOH       // Front of House
  BOH       // Back of House
  MGMT      // Management
  ADMIN     // Administrative
  OTHER
}
```

### CategorySales

Daily category-level aggregation for faster trend analysis.

```prisma
model CategorySales {
  id              String   @id @default(cuid())
  locationId      String
  date            DateTime @db.Date
  
  category            String   // "Appetizers", "Entrees", "Beverages", etc.
  
  // Sales metrics
  quantitySold        Int
  netSales            Decimal  @db.Decimal(10, 2)
  
  // Mix metrics
  percentOfSales      Decimal  @db.Decimal(5, 2)   // % of total daily sales
  percentOfItems      Decimal  @db.Decimal(5, 2)   // % of total items sold
  
  // Check contribution
  attachRate          Decimal? @db.Decimal(5, 2)   // % of checks containing this category
  avgPerCheck         Decimal? @db.Decimal(10, 2)  // Avg category $ per check
  
  // Margins (if available)
  avgCostPercent      Decimal? @db.Decimal(5, 2)
  totalMargin         Decimal? @db.Decimal(10, 2)
  
  location            Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, date, category])
  @@index([locationId, date])
}
```

### TransactionSummary

Daily transaction-level aggregates for payment and discount analysis.

```prisma
model TransactionSummary {
  id              String   @id @default(cuid())
  locationId      String
  date            DateTime @db.Date
  
  // Transaction counts
  totalTransactions   Int
  dineInTransactions  Int?
  takeoutTransactions Int?
  deliveryTransactions Int?
  
  // Payment method mix
  cashAmount          Decimal  @db.Decimal(10, 2)  @default(0)
  cashCount           Int      @default(0)
  creditAmount        Decimal  @db.Decimal(10, 2)  @default(0)
  creditCount         Int      @default(0)
  debitAmount         Decimal  @db.Decimal(10, 2)  @default(0)
  debitCount          Int      @default(0)
  giftCardAmount      Decimal  @db.Decimal(10, 2)  @default(0)
  giftCardCount       Int      @default(0)
  mobilePayAmount     Decimal? @db.Decimal(10, 2)  // Apple Pay, Google Pay
  mobilePayCount      Int?
  otherPaymentAmount  Decimal? @db.Decimal(10, 2)
  otherPaymentCount   Int?
  
  // Discounts
  totalDiscountAmount Decimal  @db.Decimal(10, 2)  @default(0)
  discountCount       Int      @default(0)
  avgDiscountPercent  Decimal? @db.Decimal(5, 2)
  
  // Discount breakdown by type
  promoDiscounts      Decimal? @db.Decimal(10, 2)
  employeeDiscounts   Decimal? @db.Decimal(10, 2)
  managerComps        Decimal? @db.Decimal(10, 2)
  loyaltyDiscounts    Decimal? @db.Decimal(10, 2)
  
  // Voids & Refunds
  voidAmount          Decimal  @db.Decimal(10, 2)  @default(0)
  voidCount           Int      @default(0)
  refundAmount        Decimal  @db.Decimal(10, 2)  @default(0)
  refundCount         Int      @default(0)
  
  // Service charges & fees
  serviceCharges      Decimal? @db.Decimal(10, 2)
  deliveryFees        Decimal? @db.Decimal(10, 2)
  processingFees      Decimal? @db.Decimal(10, 2)
  
  // Tips
  totalTips           Decimal? @db.Decimal(10, 2)
  tipPercentAvg       Decimal? @db.Decimal(5, 2)
  
  // Gift cards
  giftCardsSold       Decimal? @db.Decimal(10, 2)
  giftCardsSoldCount  Int?
  
  // Sync metadata
  source              String   @default("TOAST")
  syncedAt            DateTime
  
  location            Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, date])
  @@index([locationId, date])
}
```

### HourlySales (Future - Phase 2)

Hour-by-hour sales for detailed shift optimization.

```prisma
model HourlySales {
  id              String   @id @default(cuid())
  locationId      String
  date            DateTime @db.Date
  hour            Int      // 0-23
  
  netSales            Decimal  @db.Decimal(10, 2)
  guestCount          Int
  checkCount          Int
  checkAverage        Decimal  @db.Decimal(10, 2)
  
  laborHours          Decimal? @db.Decimal(10, 2)
  laborCost           Decimal? @db.Decimal(10, 2)
  
  location            Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, date, hour])
  @@index([locationId, date])
}
```

---

## Insight Cache Schema

Pre-calculated analytics that feed into the Intelligence engine.

```prisma
model InsightCache {
  id              String   @id @default(cuid())
  locationId      String
  
  insightType         InsightType
  periodDays          Int          // 7, 30, 90
  
  // The pre-digested insight data as structured JSON
  data                Json
  
  // Calculation metadata
  calculatedAt        DateTime     @default(now())
  expiresAt           DateTime
  dataVersion         Int          @default(1)  // For cache invalidation
  
  // Status
  isStale             Boolean      @default(false)
  lastError           String?
  
  location            Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, insightType, periodDays])
  @@index([locationId, expiresAt])
  @@index([isStale])
}

enum InsightType {
  // Sales insights
  SALES_TRENDS           // Daypart trends, vs prior period, seasonality
  CHANNEL_MIX            // Dine-in vs takeout vs delivery trends
  CHECK_ANALYSIS         // Check avg trends, party size
  
  // Menu insights
  MENU_MOVERS            // Top growing/declining items
  CATEGORY_PERFORMANCE   // Category trends, attach rates
  MENU_ENGINEERING       // Stars, plowhorses, puzzles, dogs
  
  // Labor insights
  LABOR_EFFICIENCY       // By daypart, overtime alerts, SPLH
  STAFFING_PATTERNS      // Over/understaffed periods
  
  // Guest insights
  GUEST_PATTERNS         // Traffic trends, new vs returning
  LOYALTY_METRICS        // VIP behavior, churn risk
  
  // Review insights
  REVIEW_THEMES          // Common complaints/praise (NLP summary)
  SENTIMENT_TRENDS       // Sentiment over time
  
  // Operational alerts
  ALERT_CONDITIONS       // Triggered alert flags
}
```

### InsightCache Data Structure Examples

```typescript
// InsightType: SALES_TRENDS
interface SalesTrendsInsight {
  summary: {
    totalNetSales: number;
    vsPriorPeriod: number;      // % change
    vsLastYear: number;         // % change (if available)
    avgDailySales: number;
  };
  byDaypart: Array<{
    daypart: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'LATE_NIGHT';
    netSales: number;
    salesChange: number;        // % vs prior period
    guestCount: number;
    guestChange: number;        // % vs prior period
    checkAverage: number;
    checkAvgChange: number;     // % vs prior period
    percentOfTotal: number;     // % of total sales
  }>;
  byDayOfWeek: Array<{
    day: string;                // "Monday", "Tuesday", etc.
    avgSales: number;
    vsPriorPeriod: number;
  }>;
  byChannel: Array<{
    channel: 'dineIn' | 'takeout' | 'delivery' | 'catering';
    netSales: number;
    salesChange: number;
    percentOfTotal: number;
  }>;
  alerts: Array<{
    type: 'decline' | 'growth' | 'anomaly';
    severity: 'high' | 'medium' | 'low';
    message: string;
    metric: string;
    value: number;
    change: number;
  }>;
}

// InsightType: MENU_MOVERS
interface MenuMoversInsight {
  summary: {
    totalItemsSold: number;
    uniqueItemsSold: number;
    avgItemsPerCheck: number;
  };
  topGrowing: Array<{
    itemName: string;
    category: string;
    currentQty: number;
    priorQty: number;
    change: number;             // % change
    currentSales: number;
    marginPercent?: number;
  }>;
  topDeclining: Array<{
    itemName: string;
    category: string;
    currentQty: number;
    priorQty: number;
    change: number;             // % change (negative)
    currentSales: number;
    marginPercent?: number;
  }>;
  categoryTrends: Array<{
    category: string;
    currentSales: number;
    salesChange: number;
    attachRate: number;         // % of checks
    attachRateChange: number;
  }>;
}

// InsightType: LABOR_EFFICIENCY
interface LaborEfficiencyInsight {
  summary: {
    totalLaborCost: number;
    totalLaborHours: number;
    avgLaborPercent: number;
    laborPercentTarget: number;
    vsPriorPeriod: number;
  };
  byDaypart: Array<{
    daypart: string;
    laborCost: number;
    laborHours: number;
    laborPercent: number;
    salesPerLaborHour: number;  // SPLH
    vsTarget: number;           // +/- vs target
    efficiency: 'optimal' | 'overstaffed' | 'understaffed';
  }>;
  byDepartment: Array<{
    department: 'FOH' | 'BOH' | 'MGMT';
    laborCost: number;
    laborPercent: number;
    headcount: number;
    avgHoursPerPerson: number;
  }>;
  overtimeAnalysis: {
    totalOvertimeHours: number;
    totalOvertimeCost: number;
    topOvertimePositions: Array<{
      position: string;
      overtimeHours: number;
      overtimeCost: number;
    }>;
  };
  alerts: Array<{
    type: 'overstaffed' | 'understaffed' | 'overtime' | 'efficiency';
    severity: 'high' | 'medium' | 'low';
    message: string;
    potentialSavings?: number;
  }>;
}
```

---

## ETL Pipeline

### Nightly Sync Process

```typescript
// Runs at 6:00 AM daily

async function nightlyETL(locationId: string): Promise<void> {
  const yesterday = getYesterday();
  
  try {
    // ─────────────────────────────────────────────────────────
    // PHASE 1: EXTRACT - Pull from external sources
    // ─────────────────────────────────────────────────────────
    
    // Toast POS data
    const toastData = await extractToastData(locationId, yesterday);
    // Returns: { dayparts, labor, transactions, menuItems }
    
    // R365 data (if connected)
    const r365Data = await extractR365Data(locationId, yesterday);
    // Returns: { foodCost, invoices, inventory }
    
    // ─────────────────────────────────────────────────────────
    // PHASE 2: LOAD - Store granular operational data
    // ─────────────────────────────────────────────────────────
    
    // Daypart metrics
    await upsertDaypartMetrics(locationId, yesterday, toastData.dayparts);
    
    // Labor detail
    await upsertLaborDetail(locationId, yesterday, toastData.labor);
    
    // Transaction summary
    await upsertTransactionSummary(locationId, yesterday, toastData.transactions);
    
    // Category sales
    await upsertCategorySales(locationId, yesterday, toastData.menuItems);
    
    // Weekly: Menu item sales (run on Mondays)
    if (isMonday()) {
      const weekStart = getLastMonday();
      await upsertMenuItemSales(locationId, weekStart, toastData.menuItems);
    }
    
    // ─────────────────────────────────────────────────────────
    // PHASE 3: TRANSFORM - Calculate dashboard aggregates
    // ─────────────────────────────────────────────────────────
    
    // Update DailyMetrics (dashboard layer)
    await updateDailyMetrics(locationId, yesterday, {
      toast: toastData,
      r365: r365Data,
    });
    
    // Update MonthlyMetrics (if end of month or data changed)
    await refreshMonthlyMetrics(locationId, getCurrentMonth());
    
    // ─────────────────────────────────────────────────────────
    // PHASE 4: INSIGHTS - Pre-calculate for Intelligence
    // ─────────────────────────────────────────────────────────
    
    // Refresh all insight caches
    await refreshInsightCache(locationId, InsightType.SALES_TRENDS, 30);
    await refreshInsightCache(locationId, InsightType.MENU_MOVERS, 30);
    await refreshInsightCache(locationId, InsightType.LABOR_EFFICIENCY, 30);
    await refreshInsightCache(locationId, InsightType.GUEST_PATTERNS, 30);
    await refreshInsightCache(locationId, InsightType.CATEGORY_PERFORMANCE, 30);
    await refreshInsightCache(locationId, InsightType.CHANNEL_MIX, 30);
    
    // Check alert conditions
    await checkAlertConditions(locationId);
    
    // ─────────────────────────────────────────────────────────
    // PHASE 5: LOG - Record sync status
    // ─────────────────────────────────────────────────────────
    
    await createSyncLog(locationId, {
      status: 'SUCCESS',
      dataDate: yesterday,
      recordsProcessed: {
        dayparts: toastData.dayparts.length,
        labor: toastData.labor.length,
        menuItems: toastData.menuItems.length,
      },
    });
    
  } catch (error) {
    await createSyncLog(locationId, {
      status: 'FAILED',
      dataDate: yesterday,
      error: error.message,
    });
    
    // Alert on failure
    await sendSyncFailureAlert(locationId, error);
  }
}
```

---

## Data Retention Strategy

| Data Type | Granularity | Retention | Storage Location |
|-----------|-------------|-----------|------------------|
| DaypartMetrics | Daily × Daypart | 2 years | Operational |
| MenuItemSales | Weekly × Item | 2 years | Operational |
| LaborDetail | Daily × Position | 2 years | Operational |
| TransactionSummary | Daily | 2 years | Operational |
| CategorySales | Daily × Category | 2 years | Operational |
| Dashboard aggregates | Daily/Monthly | Forever | Dashboard |
| InsightCache | Pre-calculated | 24-48 hours | Refreshed nightly |
| IntelligenceReport | Saved reports | Forever | App |
| Raw API responses | JSON archive | 90 days | Cold storage, then delete |

---

## Data Sync Schedules

| Data Type | Source | Frequency | Time | Operational Table | Dashboard Table |
|-----------|--------|-----------|------|-------------------|-----------------|
| Daypart Sales | Toast | Nightly | 6:00 AM | DaypartMetrics | DailyMetrics |
| Labor Detail | Toast | Nightly | 6:00 AM | LaborDetail | DailyMetrics |
| Transactions | Toast | Nightly | 6:00 AM | TransactionSummary | — |
| Category Sales | Toast | Nightly | 6:00 AM | CategorySales | — |
| Menu Items | Toast | Weekly | Monday 6:00 AM | MenuItemSales | — |
| Food Costs | R365 | Nightly | 6:00 AM | — | DailyMetrics |
| Guest CRM | OpenTable | Nightly | 6:00 AM | Guest, GuestVisit | DailyCustomerMetrics |
| Reviews | BrightLocal | Daily | 12:00 AM | Review | ReviewSnapshot |
| Website Visibility | SEMrush | Weekly | Sunday 6:00 AM | KeywordRanking | VisibilitySnapshot |
| Maps Visibility | BrightLocal | Weekly | Sunday 6:00 AM | KeywordLocalRanking | MapsVisibilitySnapshot |
| Social Media | Sprout/Metricool | Daily | 7:00 AM | SocialPost | SocialSnapshot |
| **Insight Cache** | **Calculated** | **Nightly** | **6:30 AM** | **InsightCache** | **—** |

---

## What Data to Pull from Toast

### Phase 1 (MVP - Critical)

| Data | API Endpoint | Fields Needed |
|------|--------------|---------------|
| Sales by daypart | `/orders` or `/salesSummary` | Net sales, guest count, check count by hour/daypart |
| Guest count by daypart | `/orders` | Covers/guests per order |
| Labor hours/cost by day | `/labor/timeEntries` | Clock in/out, position, wages |
| Menu category sales | `/menuItems` + `/orders` | Item sales aggregated by category |

### Phase 2 (After Launch)

| Data | API Endpoint | Fields Needed |
|------|--------------|---------------|
| Full menu item sales | `/orders/items` | Every item sold with timestamp |
| Labor by position | `/labor/timeEntries` | Detailed position breakdown |
| Voids/comps | `/orders` | Void reason, amount, server |
| Payment mix | `/payments` | Payment method, amount |
| Discounts | `/orders/discounts` | Discount type, amount |

### Phase 3 (Power Features)

| Data | API Endpoint | Fields Needed |
|------|--------------|---------------|
| Hourly sales | `/orders` | Orders by hour |
| Server performance | `/orders` + `/employees` | Sales/tips by server |
| Modifier sales | `/orders/items/modifiers` | Modifier revenue |

---

## AI Token Efficiency

### Context Window Math

Claude Sonnet has 200K token context. Typical Intelligence run:

| Data | Tokens (est.) |
|------|---------------|
| 90 days of daypart sales (4 dayparts × 90 days) | ~2,000 |
| Menu mix summary (top 30 items × 12 weeks) | ~2,500 |
| Labor breakdown (90 days × 4 dayparts) | ~2,000 |
| Recent reviews (30 reviews, summarized) | ~3,000 |
| System prompt + formatting | ~2,000 |
| **Total** | **~11,500 tokens** |

**Cost:** ~$0.03-0.05 per Intelligence run

### The Strategy: Pre-Aggregation + Focused Context

Don't dump raw data. Pre-calculate insights, then let AI interpret:

```
❌ BAD: Send 90 days × 100 menu items = 9,000 rows

✅ GOOD: Pre-calculate and send:
- "Top 5 declining items (qty): Salmon -23%, Burger -18%..."
- "Top 5 growing items: Chicken +31%, Tacos +22%..."
- "Category trends: Apps -12%, Entrees +3%, Desserts -8%"
```

This is why the InsightCache layer exists — it does the heavy lifting before Claude sees anything.

---

## Summary

| Question | Answer |
|----------|--------|
| Do you need a data warehouse? | **Not yet** — Supabase can handle MVP + first 50 locations |
| What structure do you need? | **Two-layer**: Operational (granular) + Dashboard (aggregated) |
| When to add BigQuery/Snowflake? | **50+ locations** or when queries slow down |
| What to build now? | **Operational tables** + **InsightCache** + **Nightly ETL job** |
| Will AI be efficient? | **Yes** — pre-aggregate, send ~10-15K tokens |
| Cost per Intelligence run? | **$0.03-0.10** depending on depth |
