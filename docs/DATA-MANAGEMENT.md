# Data Management

> Specification for raw data tables, sync operations, and data storage architecture.

## Overview

Prometheus stores daily data locally rather than making real-time API calls. This provides:
- Fast dashboard loading
- No rate limit issues with integration APIs
- Historical data control
- Cross-source calculations
- Resilience when external services are down

Data flows: **Integration → Sync Service → Daily Tables → Monthly Rollups → Dashboard**

---

## Data Architecture

### Storage Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                         EXTERNAL                                │
│  Toast POS    R365    OpenTable    BrightLocal    SEMRush      │
└──────┬─────────┬─────────┬────────────┬────────────┬───────────┘
       │         │         │            │            │
       ▼         ▼         ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SYNC SERVICE                               │
│  - Scheduled jobs (nightly, hourly, weekly)                    │
│  - Manual re-sync triggers                                      │
│  - Error handling & retry logic                                 │
│  - Change detection                                             │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Our DB)                          │
├─────────────────────────────────────────────────────────────────┤
│  DailyMetrics          ← Source of truth                       │
│  DailyCustomerMetrics  ← Guest data by day                     │
│  DailyReviews          ← Review counts by day                  │
│  MonthlyMetrics        ← Rolled up from daily (cached)         │
│  HealthScoreHistory    ← Calculated scores                     │
│  SyncLog               ← Audit trail                           │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DASHBOARD                                  │
│  - Charts pull from MonthlyMetrics (fast)                      │
│  - Data tables pull from DailyMetrics                          │
│  - Health scores from HealthScoreHistory                       │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Schedules

| Data Type | Source | Frequency | Time |
|-----------|--------|-----------|------|
| Sales | Toast | Nightly | 6:00 AM |
| Labor Costs | Toast | Nightly | 6:00 AM |
| Food Costs | R365 | Nightly | 6:00 AM |
| Customer Counts | Toast/OpenTable | Nightly | 6:00 AM |
| Guest Frequency | OpenTable | Daily | 6:00 AM |
| Reviews | BrightLocal | Daily | 12:00 AM |
| Website Visibility | SEMRush | Weekly | Sunday 12:00 AM |
| PR Mentions | Manual/RSS | Weekly | Monday 6:00 AM |

---

## Database Schema

### DailyMetrics (Source of Truth)

```prisma
model DailyMetrics {
  id              String   @id @default(cuid())
  locationId      String
  date            DateTime @db.Date
  
  // Sales
  totalSales      Decimal  @db.Decimal(12, 2)
  foodSales       Decimal  @db.Decimal(12, 2)
  alcoholSales    Decimal  @db.Decimal(12, 2)
  beerSales       Decimal  @db.Decimal(12, 2)
  wineSales       Decimal  @db.Decimal(12, 2)
  
  // Costs (stored as dollar amounts)
  laborCosts      Decimal  @db.Decimal(12, 2)
  foodCosts       Decimal  @db.Decimal(12, 2)
  
  // Customers
  totalCustomers  Int
  reservations    Int?
  walkIns         Int?
  
  // Sync metadata
  source          String   // 'toast', 'r365', 'opentable', 'manual'
  syncedAt        DateTime
  syncStatus      SyncStatus @default(SUCCESS)
  syncError       String?
  
  // Manual adjustments
  manualOverride  Boolean  @default(false)
  overrideReason  String?
  overrideBy      String?  // userId who made the change
  overrideAt      DateTime?
  
  // Original values (before manual override)
  originalTotalSales    Decimal? @db.Decimal(12, 2)
  originalFoodSales     Decimal? @db.Decimal(12, 2)
  originalAlcoholSales  Decimal? @db.Decimal(12, 2)
  originalBeerSales     Decimal? @db.Decimal(12, 2)
  originalWineSales     Decimal? @db.Decimal(12, 2)
  originalLaborCosts    Decimal? @db.Decimal(12, 2)
  originalFoodCosts     Decimal? @db.Decimal(12, 2)
  
  location        Location @relation(fields: [locationId], references: [id])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([locationId, date])
  @@index([locationId, date])
  @@index([syncStatus])
}

enum SyncStatus {
  SUCCESS
  ERROR
  PENDING
  PARTIAL
}
```

### DailyCustomerMetrics

```prisma
model DailyCustomerMetrics {
  id              String   @id @default(cuid())
  locationId      String
  date            DateTime @db.Date
  
  // Guest frequency (from OpenTable)
  oneVisitGuests      Int
  twoToNineGuests     Int
  tenPlusGuests       Int
  
  // Sync metadata
  source          String
  syncedAt        DateTime
  syncStatus      SyncStatus @default(SUCCESS)
  syncError       String?
  
  location        Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, date])
}
```

### DailyReviews

```prisma
model DailyReviews {
  id              String   @id @default(cuid())
  locationId      String
  date            DateTime @db.Date
  
  // Review counts by rating
  oneStarCount    Int      @default(0)
  twoStarCount    Int      @default(0)
  threeStarCount  Int      @default(0)
  fourStarCount   Int      @default(0)
  fiveStarCount   Int      @default(0)
  
  // Aggregates
  totalReviews    Int
  averageRating   Decimal  @db.Decimal(3, 2)
  
  // Sync metadata
  source          String   // 'brightlocal', 'manual'
  syncedAt        DateTime
  syncStatus      SyncStatus @default(SUCCESS)
  
  location        Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, date])
}
```

### MonthlyMetrics (Rolled Up Cache)

```prisma
model MonthlyMetrics {
  id              String   @id @default(cuid())
  locationId      String
  month           String   // 'YYYY-MM' format
  
  // Sales (summed from daily)
  totalSales      Decimal  @db.Decimal(12, 2)
  foodSales       Decimal  @db.Decimal(12, 2)
  alcoholSales    Decimal  @db.Decimal(12, 2)
  beerSales       Decimal  @db.Decimal(12, 2)
  wineSales       Decimal  @db.Decimal(12, 2)
  
  // Costs (summed from daily)
  laborCosts      Decimal  @db.Decimal(12, 2)
  foodCosts       Decimal  @db.Decimal(12, 2)
  
  // Calculated percentages
  laborCostsPercent   Decimal @db.Decimal(5, 2)
  foodCostsPercent    Decimal @db.Decimal(5, 2)
  primeCostPercent    Decimal @db.Decimal(5, 2)
  
  // Customers (summed from daily)
  totalCustomers  Int
  ppa             Decimal  @db.Decimal(8, 2)  // totalSales / totalCustomers
  
  // Customer loyalty (end of month snapshot)
  oneVisitGuests      Int?
  twoToNineGuests     Int?
  tenPlusGuests       Int?
  loyaltyPercent      Decimal? @db.Decimal(5, 2)
  
  // Reviews (summed from daily)
  totalReviews    Int?
  averageRating   Decimal? @db.Decimal(3, 2)
  negativeReviews Int?     // 1-3 star count
  
  // Marketing (monthly values)
  websiteVisibility   Decimal? @db.Decimal(5, 2)
  prMentionsCount     Int?
  
  // Targets (set by user or imported)
  totalSalesTarget    Decimal? @db.Decimal(12, 2)
  foodSalesTarget     Decimal? @db.Decimal(12, 2)
  alcoholSalesTarget  Decimal? @db.Decimal(12, 2)
  beerSalesTarget     Decimal? @db.Decimal(12, 2)
  wineSalesTarget     Decimal? @db.Decimal(12, 2)
  laborCostsTarget    Decimal? @db.Decimal(5, 2)  // as percentage
  foodCostsTarget     Decimal? @db.Decimal(5, 2)  // as percentage
  ppaTarget           Decimal? @db.Decimal(8, 2)
  loyaltyTarget       Decimal? @db.Decimal(5, 2)
  reviewsTarget       Decimal? @db.Decimal(3, 2)
  prMentionsTarget    Int?
  visibilityTarget    Decimal? @db.Decimal(5, 2)
  
  // Rollup metadata
  calculatedAt    DateTime
  daysIncluded    Int      // how many days of data
  hasGaps         Boolean  @default(false)  // missing days?
  
  location        Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, month])
  @@index([locationId, month])
}
```

### SyncLog (Audit Trail)

```prisma
model SyncLog {
  id              String   @id @default(cuid())
  locationId      String
  
  // What was synced
  syncType        String   // 'daily_metrics', 'reviews', 'visibility', etc.
  source          String   // 'toast', 'r365', 'brightlocal', etc.
  dateRangeStart  DateTime
  dateRangeEnd    DateTime
  
  // Result
  status          SyncStatus
  recordsFound    Int
  recordsCreated  Int
  recordsUpdated  Int
  recordsSkipped  Int
  
  // Changes detected
  changesDetected Json?    // { field: { old: x, new: y } }
  
  // Errors
  errorMessage    String?
  errorDetails    Json?
  
  // Trigger
  triggeredBy     String   // 'scheduled', 'manual', userId
  
  startedAt       DateTime
  completedAt     DateTime?
  durationMs      Int?
  
  location        Location @relation(fields: [locationId], references: [id])
  
  createdAt       DateTime @default(now())
  
  @@index([locationId, syncType])
  @@index([status])
  @@index([createdAt])
}
```

---

## Data Table UI

### Page Location

```
/dashboard/sales/data     - Sales daily data
/dashboard/costs/data     - Costs daily data  
/dashboard/customers/data - Customer daily data
/dashboard/reviews/data   - Reviews daily data
```

Or as a tab on each page:
```
/dashboard/sales?view=charts  (default)
/dashboard/sales?view=data
```

### Sales Data Table

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Sales Data                                                                          │
│ Last synced: Jan 25, 2025 6:00 AM from Toast                    [↻ Sync Now]       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ [January 2025 ▼]  [Filter by day ▼]  [Show: All ▼]            [Export CSV]         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ☐ │ Date       │ Total     │ Food      │ Alcohol  │ Beer    │ Wine    │ Status    │
│───┼────────────┼───────────┼───────────┼──────────┼─────────┼─────────┼───────────│
│ ☐ │ Sat Jan 25 │ $19,456   │ $13,200   │ $2,340   │ $1,580  │ $2,336  │ ● Synced  │
│ ☐ │ Fri Jan 24 │ $18,234   │ $12,450   │ $2,100   │ $1,450  │ $2,234  │ ● Synced  │
│ ☐ │ Thu Jan 23 │ $14,120   │ $9,800    │ $1,650   │ $1,120  │ $1,550  │ ● Synced  │
│ ☐ │ Wed Jan 22 │ $12,890 ⚠ │ $8,920    │ $1,480   │ $980    │ $1,510  │ ✎ Manual  │
│ ☐ │ Tue Jan 21 │ $11,456   │ $7,890    │ $1,320   │ $890    │ $1,356  │ ● Synced  │
│ ☐ │ Mon Jan 20 │ —         │ —         │ —        │ —       │ —       │ ✗ Error   │
│ ☐ │ Sun Jan 19 │ $16,780   │ $11,200   │ $2,080   │ $1,380  │ $2,120  │ ● Synced  │
│ ... │          │           │           │          │         │         │           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ MTD Total      │ $507,855  │ $348,420  │ $52,311  │ $38,450 │ $68,674 │ 24/25 days│
│ vs Target      │ 89.5%     │ 88.4%     │ 92.2%    │ 91.5%   │ 91.7%   │           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 0 selected                              [↻ Re-sync Selected]  [↻ Re-sync Month]    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Status Indicators

| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| Synced | ● | Green | Data synced successfully |
| Manual | ✎ | Yellow | User made manual adjustment |
| Error | ✗ | Red | Sync failed, no data |
| Partial | ◐ | Orange | Some fields synced, others failed |
| Pending | ○ | Gray | Sync scheduled, not yet run |

### Row Actions (on hover or click)

```
┌─────────────────────────────┐
│ Wed Jan 22                  │
├─────────────────────────────┤
│ ↻ Re-sync this day          │
│ ✎ Edit values               │
│ ↩ Restore original values   │
│ 📋 View sync history        │
└─────────────────────────────┘
```

### Filters

**Month selector:**
- Dropdown with recent months
- Date range picker for custom range

**Day filter:**
- All days
- Weekdays only
- Weekends only
- Specific day (e.g., all Fridays)

**Status filter:**
- All
- Synced only
- Errors only
- Manual adjustments only

### Columns by Data Type

**Sales Data:**
| Column | Source |
|--------|--------|
| Total Sales | Toast |
| Food Sales | Toast |
| Alcohol Sales | Toast |
| Beer Sales | Toast |
| Wine Sales | Toast |

**Costs Data:**
| Column | Source |
|--------|--------|
| Labor Costs ($) | Toast |
| Labor Costs (%) | Calculated |
| Food Costs ($) | R365 |
| Food Costs (%) | Calculated |
| Prime Cost (%) | Calculated |

**Customer Data:**
| Column | Source |
|--------|--------|
| Total Customers | Toast |
| Reservations | OpenTable |
| Walk-ins | Calculated |
| 1 Visit | OpenTable |
| 2-9 Visits | OpenTable |
| 10+ Visits | OpenTable |

**Reviews Data:**
| Column | Source |
|--------|--------|
| 5 Star | BrightLocal |
| 4 Star | BrightLocal |
| 3 Star | BrightLocal |
| 2 Star | BrightLocal |
| 1 Star | BrightLocal |
| Average | Calculated |

---

## Re-Sync Flows

### Manual Re-sync Single Day

```
User clicks [↻ Re-sync] on Jan 20 row

1. Show confirmation dialog:
   ┌─────────────────────────────────────────────┐
   │ Re-sync January 20, 2025?                   │
   │                                             │
   │ This will fetch fresh data from Toast and   │
   │ update the stored values.                   │
   │                                             │
   │ Note: If you made manual adjustments, they  │
   │ will be overwritten.                        │
   │                                             │
   │           [Cancel]  [Re-sync]               │
   └─────────────────────────────────────────────┘

2. Show loading state on row:
   │ Mon Jan 20 │ Syncing...                     │

3. Call sync service:
   POST /api/sync/daily
   { locationId, date: '2025-01-20', source: 'toast' }

4. On success, show changes:
   ┌─────────────────────────────────────────────┐
   │ ✓ Sync Complete                             │
   │                                             │
   │ Changes detected:                           │
   │ • Total Sales: —  →  $9,234                 │
   │ • Food Sales: —  →  $6,450                  │
   │                                             │
   │ Monthly totals have been recalculated.      │
   │                                             │
   │                              [Done]         │
   └─────────────────────────────────────────────┘

5. Update row in table
6. Trigger monthly rollup recalculation
7. Log to SyncLog
```

### Manual Re-sync Multiple Days

```
User selects 5 rows, clicks [↻ Re-sync Selected]

1. Confirmation with count:
   "Re-sync 5 days? This may take a moment."

2. Show progress:
   "Syncing 2 of 5... Jan 21"

3. On complete, show summary:
   "5 days synced. 3 had changes."
```

### Manual Re-sync Entire Month

```
User clicks [↻ Re-sync Month]

1. Confirmation:
   "Re-sync all of January 2025? This will fetch
    data for 25 days and may take 1-2 minutes."

2. Show progress bar:
   [████████░░░░░░░░] 40% - Syncing Jan 10...

3. On complete, show summary:
   ┌─────────────────────────────────────────────┐
   │ ✓ January 2025 Sync Complete               │
   │                                             │
   │ 25 days processed                           │
   │ • 22 unchanged                              │
   │ • 2 updated                                 │
   │ • 1 error (Jan 20 - Toast timeout)         │
   │                                             │
   │ [View Details]                   [Done]     │
   └─────────────────────────────────────────────┘
```

### Scheduled Sync (Background)

```
Cron job runs at 6:00 AM daily

1. Get all active locations
2. For each location:
   a. Fetch yesterday's data from each integration
   b. Compare with existing (if any)
   c. Insert or update DailyMetrics
   d. Log to SyncLog
3. Trigger monthly rollup for affected months
4. Send alert if errors > threshold
```

---

## Manual Adjustments

### Edit Flow

```
User clicks [✎ Edit] on a row

1. Row becomes editable:
   │ Wed Jan 22 │ [$12,890 ] │ [$8,920 ] │ ... │

2. User changes Total Sales from $12,890 to $13,500

3. User clicks [Save]

4. Confirmation:
   ┌─────────────────────────────────────────────┐
   │ Save Manual Adjustment?                     │
   │                                             │
   │ You're changing:                            │
   │ • Total Sales: $12,890 → $13,500           │
   │                                             │
   │ Reason for adjustment (required):           │
   │ ┌─────────────────────────────────────────┐ │
   │ │ Catering order was missing from Toast   │ │
   │ └─────────────────────────────────────────┘ │
   │                                             │
   │           [Cancel]  [Save]                  │
   └─────────────────────────────────────────────┘

5. On save:
   - Store new value
   - Store original value in originalTotalSales
   - Set manualOverride = true
   - Set overrideReason, overrideBy, overrideAt
   - Recalculate monthly rollup
   - Log to SyncLog with type 'manual_adjustment'
```

### Restore Original Values

```
User clicks [↩ Restore] on a manually adjusted row

1. Confirmation:
   "Restore original synced value of $12,890?"

2. On confirm:
   - Restore value from originalTotalSales
   - Set manualOverride = false
   - Clear override fields
   - Recalculate monthly rollup
```

---

## Monthly Rollup Process

### When to Recalculate

Trigger monthly rollup when:
- Daily data is synced (new or updated)
- Manual adjustment is made
- Manual adjustment is restored
- User requests recalculation

### Rollup Logic

```typescript
async function calculateMonthlyRollup(locationId: string, month: string) {
  // Get all daily data for the month
  const dailyData = await prisma.dailyMetrics.findMany({
    where: {
      locationId,
      date: {
        gte: startOfMonth(month),
        lte: endOfMonth(month),
      },
      syncStatus: 'SUCCESS',
    },
  });

  // Sum up values
  const totals = dailyData.reduce((acc, day) => ({
    totalSales: acc.totalSales + day.totalSales,
    foodSales: acc.foodSales + day.foodSales,
    alcoholSales: acc.alcoholSales + day.alcoholSales,
    beerSales: acc.beerSales + day.beerSales,
    wineSales: acc.wineSales + day.wineSales,
    laborCosts: acc.laborCosts + day.laborCosts,
    foodCosts: acc.foodCosts + day.foodCosts,
    totalCustomers: acc.totalCustomers + day.totalCustomers,
  }), initialTotals);

  // Calculate percentages
  const laborCostsPercent = (totals.laborCosts / totals.totalSales) * 100;
  const foodCostsPercent = (totals.foodCosts / totals.totalSales) * 100;
  const primeCostPercent = laborCostsPercent + foodCostsPercent;
  const ppa = totals.totalSales / totals.totalCustomers;

  // Check for gaps
  const daysInMonth = getDaysInMonth(month);
  const hasGaps = dailyData.length < daysInMonth;

  // Upsert monthly record
  await prisma.monthlyMetrics.upsert({
    where: { locationId_month: { locationId, month } },
    update: { ...totals, laborCostsPercent, foodCostsPercent, primeCostPercent, ppa, hasGaps, calculatedAt: new Date() },
    create: { locationId, month, ...totals, laborCostsPercent, foodCostsPercent, primeCostPercent, ppa, hasGaps, calculatedAt: new Date() },
  });

  // Recalculate health score for the month
  await calculateHealthScore(locationId, month);
}
```

---

## Sync History View

### Page or Modal

```
/dashboard/settings/sync-history

Or modal from data table: [📋 View sync history]
```

### UI

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Sync History                                                    [Filter ▼] [Export] │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Time              │ Type          │ Source │ Records │ Status  │ Triggered By      │
│───────────────────┼───────────────┼────────┼─────────┼─────────┼───────────────────│
│ Jan 25, 6:00 AM   │ Daily Sales   │ Toast  │ 1       │ ● OK    │ Scheduled         │
│ Jan 25, 6:00 AM   │ Daily Costs   │ R365   │ 1       │ ● OK    │ Scheduled         │
│ Jan 24, 3:45 PM   │ Daily Sales   │ Toast  │ 5       │ ● OK    │ Ryan Kelly        │
│ Jan 24, 6:00 AM   │ Daily Sales   │ Toast  │ 1       │ ● OK    │ Scheduled         │
│ Jan 24, 6:00 AM   │ Daily Costs   │ R365   │ 1       │ ✗ Error │ Scheduled         │
│ Jan 23, 6:00 AM   │ Daily Sales   │ Toast  │ 1       │ ● OK    │ Scheduled         │
│ ...               │               │        │         │         │                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Click for Details

```
┌─────────────────────────────────────────────────────────────────┐
│ Sync Details                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Type: Daily Costs                                               │
│ Source: R365                                                    │
│ Date Range: Jan 24, 2025                                        │
│ Status: Error                                                   │
│ Triggered By: Scheduled                                         │
│ Started: Jan 24, 6:00:00 AM                                     │
│ Duration: 12.4 seconds                                          │
│                                                                 │
│ Error Details:                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ R365 API returned 503 Service Unavailable                   │ │
│ │ Retry 1 of 3 failed at 6:00:05 AM                          │ │
│ │ Retry 2 of 3 failed at 6:00:10 AM                          │ │
│ │ Retry 3 of 3 failed at 6:00:15 AM                          │ │
│ │ Giving up after 3 retries                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                    [Retry Now]  [Close]         │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Sync Endpoints

```typescript
// Trigger sync for specific date(s)
POST /api/sync/daily
{
  locationId: string,
  dates: string[],         // ['2025-01-20', '2025-01-21']
  source?: string,         // 'toast', 'r365', 'all'
  force?: boolean          // Overwrite manual adjustments?
}

// Trigger sync for entire month
POST /api/sync/monthly
{
  locationId: string,
  month: string,           // '2025-01'
  source?: string
}

// Get sync status/history
GET /api/sync/history?locationId=xxx&limit=50

// Get sync status for specific dates
GET /api/sync/status?locationId=xxx&dates=2025-01-20,2025-01-21
```

### Data Endpoints

```typescript
// Get daily data for a month
GET /api/locations/{id}/daily-metrics?month=2025-01

// Update daily data (manual adjustment)
PATCH /api/locations/{id}/daily-metrics/{date}
{
  totalSales: 13500,
  reason: "Catering order was missing"
}

// Restore original value
POST /api/locations/{id}/daily-metrics/{date}/restore

// Get monthly rollup
GET /api/locations/{id}/monthly-metrics?month=2025-01

// Force recalculate monthly rollup
POST /api/locations/{id}/monthly-metrics/{month}/recalculate
```

---

## Error Handling

### Sync Errors

| Error | Handling |
|-------|----------|
| API timeout | Retry 3 times with exponential backoff |
| Rate limited | Wait and retry after delay |
| Auth failed | Mark integration as disconnected, notify user |
| Partial data | Store what we got, mark as PARTIAL |
| Invalid data | Log error, skip record, continue |

### User Notifications

**In-app alerts:**
- "Toast sync failed for Jan 20. [Retry]"
- "3 days missing data this month. [View]"

**Email alerts (optional):**
- Daily digest of sync failures
- Weekly data quality report

---

## Related Files

- `/docs/DEV-PLAN.md` - Phase 8 covers integration services
- `/docs/UI-UX-SPECS.md` - Overall UI specifications
- `/CLAUDE.md` - Design tokens and component patterns
- `/prisma/schema.prisma` - Database schema
