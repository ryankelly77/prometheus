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
│  DailyMetrics          ← Source of truth (sales, costs)        │
│  DailyCustomerMetrics  ← Guest counts by day                   │
│  Review                ← Individual reviews (BrightLocal)      │
│  ReviewSnapshot        ← Monthly review aggregates             │
│  ReviewSourceConfig    ← Platform settings per location        │
│  DailyReviews          ← Daily review aggregates (calculated)  │
│  Guest                 ← Individual guest CRM data (OpenTable) │
│  GuestVisit            ← Individual visit records              │
│  GuestTag              ← Guest tags/labels                     │
│  MonthlyMetrics        ← Rolled up from daily (cached)         │
│  HealthScoreHistory    ← Calculated scores                     │
│  SyncLog               ← Audit trail                           │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DASHBOARD                                  │
│  - Charts pull from MonthlyMetrics (fast)                      │
│  - Sales/Costs tables pull from DailyMetrics                   │
│  - Guest CRM table pulls from Guest + GuestVisit               │
│  - Reviews table pulls from Review                             │
│  - Review charts pull from ReviewSnapshot                      │
│  - Health scores from HealthScoreHistory                       │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Schedules

| Data Type | Source | Frequency | Time | Table |
|-----------|--------|-----------|------|-------|
| Sales | Toast | Nightly | 6:00 AM | DailyMetrics |
| Labor Costs | Toast | Nightly | 6:00 AM | DailyMetrics |
| Food Costs | R365 | Nightly | 6:00 AM | DailyMetrics |
| Customer Counts | Toast | Nightly | 6:00 AM | DailyMetrics |
| Guest Frequency | OpenTable | Nightly | 6:00 AM | DailyCustomerMetrics |
| Guest CRM Data | OpenTable | Nightly | 6:00 AM | Guest, GuestVisit |
| Reviews | BrightLocal | Daily | 12:00 AM | Review, ReviewSnapshot |
| Website Visibility | SEMRush | Weekly | Sunday 12:00 AM | MonthlyMetrics |
| PR Mentions | Manual/RSS | Weekly | Monday 6:00 AM | MonthlyMetrics |

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

### DailyReviews (Aggregated - Calculated from Review table)

```prisma
model DailyReviews {
  id              String   @id @default(cuid())
  locationId      String
  date            DateTime @db.Date
  
  // Review counts by rating (calculated from Review table)
  oneStarCount    Int      @default(0)
  twoStarCount    Int      @default(0)
  threeStarCount  Int      @default(0)
  fourStarCount   Int      @default(0)
  fiveStarCount   Int      @default(0)
  
  // Aggregates
  totalReviews    Int
  averageRating   Decimal  @db.Decimal(3, 2)
  
  // Sync metadata
  calculatedAt    DateTime
  
  location        Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, date])
}
```

### Review (Individual Reviews from BrightLocal)

Individual review records from BrightLocal API. This is the source of truth; DailyReviews is calculated from this.

```prisma
model Review {
  id                  String    @id @default(cuid())
  locationId          String
  
  // BrightLocal identifiers
  brightLocalId       String?   // BrightLocal's review ID
  
  // Review content
  content             String?   @db.Text  // Full review text
  rating              Int       // 1-5 stars
  
  // Reviewer info
  reviewerName        String?
  reviewerAvatarUrl   String?
  
  // Source platform
  source              ReviewSource
  sourceUrl           String?   // Direct link to review
  
  // Dates
  reviewDate          DateTime  // When review was posted
  fetchedAt           DateTime  // When we first fetched it
  
  // Status
  status              ReviewStatus @default(ACTIVE)
  
  // Sentiment (can be calculated or from API)
  sentiment           Sentiment?
  sentimentScore      Decimal?  @db.Decimal(4, 3)  // -1.0 to 1.0
  
  // Response tracking
  hasResponse         Boolean   @default(false)
  responseDate        DateTime?
  responseContent     String?   @db.Text
  
  // Flags
  isFlagged           Boolean   @default(false)
  flagReason          String?
  flaggedBy           String?
  flaggedAt           DateTime?
  
  // Internal notes
  internalNotes       String?   @db.Text
  
  // Sync metadata
  syncedAt            DateTime
  syncStatus          SyncStatus @default(SUCCESS)
  
  // Relations
  location            Location @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([locationId, brightLocalId])
  @@index([locationId, reviewDate])
  @@index([locationId, rating])
  @@index([locationId, source])
  @@index([locationId, status])
}

enum ReviewSource {
  GOOGLE
  YELP
  FACEBOOK
  TRIPADVISOR
  OPENTABLE
  FOURSQUARE
  ZOMATO
  GRUBHUB
  DOORDASH
  UBEREATS
  OTHER
}

enum ReviewStatus {
  ACTIVE
  PENDING
  REMOVED
  FLAGGED
}

enum Sentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}
```

### ReviewSnapshot (Point-in-time Aggregates)

Monthly snapshots for historical tracking and charts. Calculated from Review table.

```prisma
model ReviewSnapshot {
  id              String   @id @default(cuid())
  locationId      String
  month           String   // 'YYYY-MM' format
  
  // Totals across all platforms
  totalReviewCount    Int
  averageRating       Decimal  @db.Decimal(3, 2)
  newReviewsCount     Int      // Reviews posted this month
  
  // By rating
  oneStarCount        Int      @default(0)
  twoStarCount        Int      @default(0)
  threeStarCount      Int      @default(0)
  fourStarCount       Int      @default(0)
  fiveStarCount       Int      @default(0)
  
  // Negative review tracking (1-3 stars)
  negativeReviewCount Int      @default(0)
  
  // By platform (JSON for flexibility)
  byPlatform          Json?    // { google: { count: 500, avg: 4.3 }, yelp: { count: 120, avg: 4.1 } }
  
  // Sentiment breakdown
  positiveCount       Int?
  neutralCount        Int?
  negativeCount       Int?
  
  // Response rate
  reviewsWithResponse Int      @default(0)
  responseRate        Decimal? @db.Decimal(5, 2)  // percentage
  
  // Calculated at
  calculatedAt        DateTime
  
  location            Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, month])
}
```

### Guest (OpenTable CRM Data)

Guest-level data from OpenTable for customer relationship management and loyalty tracking.

```prisma
model Guest {
  id                  String    @id @default(cuid())
  locationId          String
  
  // OpenTable identifiers
  openTableGuestId    String?   // OpenTable's guest ID
  
  // Guest info
  firstName           String
  lastName            String
  email               String?
  phone               String?
  
  // Current period metrics (updated on sync)
  lastVisitDate       DateTime?
  lastVisitTime       String?   // "7:30 PM"
  visitsThisPeriod    Int       @default(0)  // Visits in selected date range
  coversThisPeriod    Int       @default(0)  // Party size total this period
  spendThisPeriod     Decimal   @default(0) @db.Decimal(12, 2)
  
  // Lifetime metrics
  lifetimeVisits      Int       @default(0)
  lifetimeCovers      Int       @default(0)
  lifetimeSpend       Decimal   @default(0) @db.Decimal(12, 2)
  
  // Calculated
  averagePartySize    Decimal?  @db.Decimal(4, 2)  // lifetimeCovers / lifetimeVisits
  averageSpendPerVisit Decimal? @db.Decimal(10, 2) // lifetimeSpend / lifetimeVisits
  
  // First visit tracking
  firstVisitDate      DateTime?
  daysSinceFirstVisit Int?
  
  // Loyalty segment (calculated)
  loyaltySegment      LoyaltySegment @default(NEW)
  
  // Sync metadata
  syncedAt            DateTime
  syncStatus          SyncStatus @default(SUCCESS)
  
  // Relations
  location            Location @relation(fields: [locationId], references: [id])
  tags                GuestTag[]
  visits              GuestVisit[]
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([locationId, openTableGuestId])
  @@unique([locationId, email])
  @@index([locationId, lastVisitDate])
  @@index([locationId, loyaltySegment])
  @@index([locationId, lifetimeVisits])
}

enum LoyaltySegment {
  NEW           // First visit
  RETURNING     // 2-9 visits
  VIP           // 10+ visits
  LAPSED        // No visit in 90+ days
}
```

### GuestVisit (Individual Visit Records)

```prisma
model GuestVisit {
  id              String   @id @default(cuid())
  guestId         String
  locationId      String
  
  // Visit details
  visitDate       DateTime @db.Date
  visitTime       String?  // "7:30 PM"
  partySize       Int      @default(1)
  spend           Decimal? @db.Decimal(10, 2)
  
  // Reservation details (if applicable)
  reservationId   String?  // OpenTable reservation ID
  tableNumber     String?
  server          String?
  
  // Source
  visitType       VisitType @default(RESERVATION)
  
  // Relations
  guest           Guest    @relation(fields: [guestId], references: [id], onDelete: Cascade)
  location        Location @relation(fields: [locationId], references: [id])
  
  createdAt       DateTime @default(now())
  
  @@unique([guestId, visitDate, visitTime])
  @@index([locationId, visitDate])
  @@index([guestId, visitDate])
}

enum VisitType {
  RESERVATION
  WALK_IN
  PRIVATE_EVENT
  CATERING
}
```

### GuestTag

```prisma
model GuestTag {
  id          String   @id @default(cuid())
  locationId  String
  
  name        String   // 'VIP', 'Regular', 'Birthday', 'Anniversary', 'Food Allergy', etc.
  color       String?  // Hex color for UI display
  
  // System vs custom
  isSystem    Boolean  @default(false)  // System tags can't be deleted
  
  // Relations
  guests      Guest[]
  location    Location @relation(fields: [locationId], references: [id])
  
  createdAt   DateTime @default(now())
  
  @@unique([locationId, name])
}
```

### Default Guest Tags

```typescript
const defaultGuestTags = [
  { name: 'VIP', color: '#8b5cf6', isSystem: true },
  { name: 'Regular', color: '#3b82f6', isSystem: true },
  { name: 'Birthday', color: '#ec4899', isSystem: false },
  { name: 'Anniversary', color: '#f43f5e', isSystem: false },
  { name: 'Food Allergy', color: '#ef4444', isSystem: false },
  { name: 'Vegetarian', color: '#22c55e', isSystem: false },
  { name: 'Gluten-Free', color: '#eab308', isSystem: false },
  { name: 'High Spender', color: '#f59e0b', isSystem: true },
  { name: 'Influencer', color: '#06b6d4', isSystem: false },
  { name: 'Press/Media', color: '#6366f1', isSystem: false },
];
```

### Review (BrightLocal Individual Reviews)

Individual review records from BrightLocal API for reputation management.

```prisma
model Review {
  id                  String       @id @default(cuid())
  locationId          String
  
  // BrightLocal identifiers
  brightLocalReviewId String?      // BrightLocal's review ID
  
  // Review content
  reviewerName        String
  reviewText          String?      @db.Text
  rating              Int          // 1-5 stars
  
  // Source & timing
  source              ReviewSource
  sourceUrl           String?      // Direct link to review on platform
  postedAt            DateTime     // When review was posted on platform
  
  // Status
  status              ReviewStatus @default(ACTIVE)
  
  // Response tracking
  hasResponse         Boolean      @default(false)
  responseText        String?      @db.Text
  respondedAt         DateTime?
  respondedBy         String?      // userId
  
  // Sentiment (optional - can be calculated or from API)
  sentiment           ReviewSentiment?
  
  // Sync metadata
  syncedAt            DateTime
  syncStatus          SyncStatus   @default(SUCCESS)
  
  // Relations
  location            Location     @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
  
  @@unique([locationId, brightLocalReviewId])
  @@unique([locationId, source, reviewerName, postedAt])
  @@index([locationId, postedAt])
  @@index([locationId, source])
  @@index([locationId, rating])
  @@index([locationId, status])
}

enum ReviewSource {
  GOOGLE
  YELP
  FACEBOOK
  TRIPADVISOR
  OPENTABLE
  FOURSQUARE
  ZOMATO
  GRUBHUB
  DOORDASH
  UBEREATS
  OTHER
}

enum ReviewStatus {
  ACTIVE
  PENDING
  REMOVED
  FLAGGED
}

enum ReviewSentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}
```

### ReviewSourceConfig (Per-Location Settings)

```prisma
model ReviewSourceConfig {
  id              String       @id @default(cuid())
  locationId      String
  
  source          ReviewSource
  enabled         Boolean      @default(true)
  
  // Platform-specific IDs for fetching
  externalPlaceId String?      // Google Place ID, Yelp Business ID, etc.
  
  // Tracking
  lastSyncAt      DateTime?
  totalReviews    Int          @default(0)
  averageRating   Decimal?     @db.Decimal(3, 2)
  
  location        Location     @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, source])
}
```

### Review Source Display Config

```typescript
const reviewSourceConfig = {
  GOOGLE: {
    name: 'Google',
    color: '#4285F4',
    icon: 'google',
    bgColor: '#E8F0FE',
  },
  YELP: {
    name: 'Yelp',
    color: '#D32323',
    icon: 'yelp',
    bgColor: '#FDEAEA',
  },
  FACEBOOK: {
    name: 'Facebook',
    color: '#1877F2',
    icon: 'facebook',
    bgColor: '#E7F3FF',
  },
  TRIPADVISOR: {
    name: 'TripAdvisor',
    color: '#00AF87',
    icon: 'tripadvisor',
    bgColor: '#E6F7F3',
  },
  OPENTABLE: {
    name: 'OpenTable',
    color: '#DA3743',
    icon: 'utensils',
    bgColor: '#FCECED',
  },
  FOURSQUARE: {
    name: 'Foursquare',
    color: '#F94877',
    icon: 'foursquare',
    bgColor: '#FEE9EF',
  },
  OTHER: {
    name: 'Other',
    color: '#6B7280',
    icon: 'globe',
    bgColor: '#F3F4F6',
  },
};
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
| Review Content | BrightLocal |
| Reviewer Name | BrightLocal |
| Rating (1-5) | BrightLocal |
| Review Date | BrightLocal |
| Source Platform | BrightLocal |
| Status | BrightLocal |
| Has Response | BrightLocal |
| Sentiment | Calculated (AI)

---

## Guest Data Table (OpenTable CRM)

### Overview

Unlike other data tables which show daily aggregates, the Guest table shows individual guest records from OpenTable. This is CRM-style data for customer relationship management.

### Page Location

```
/dashboard/customers/data
```

Or as a tab on the Customers page:
```
/dashboard/customers?view=charts  (default)
/dashboard/customers?view=guests
```

### Guest Data Table UI

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Guest Data                                                                                                      │
│ Last synced: Jan 25, 2025 6:00 AM from OpenTable                                      [↻ Sync Now] [Export CSV] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 [Search guests...        ]   [Segment: All ▼]   [Tags: All ▼]   [Period: Last 30 Days ▼]                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Guest           │ Last Visit  │ Time    │ Visits │ Covers │ Spend    │ Lifetime │ LT Covers │ LT Spend  │ Tags │
│                 │             │         │ (period)│(period)│ (period) │ Visits   │           │           │      │
│─────────────────┼─────────────┼─────────┼────────┼────────┼──────────┼──────────┼───────────┼───────────┼──────│
│ Sarah Johnson   │ Jan 24      │ 7:30 PM │ 3      │ 8      │ $486     │ 47       │ 142       │ $8,234    │ VIP  │
│ Michael Chen    │ Jan 23      │ 6:00 PM │ 2      │ 4      │ $312     │ 23       │ 58        │ $4,120    │ Reg  │
│ Emily Davis     │ Jan 22      │ 8:15 PM │ 1      │ 2      │ $156     │ 1        │ 2         │ $156      │ New  │
│ Robert Wilson   │ Jan 20      │ 7:00 PM │ 2      │ 6      │ $445     │ 15       │ 41        │ $2,890    │ 🎂   │
│ Jennifer Martinez│ Jan 18     │ 6:30 PM │ 1      │ 4      │ $289     │ 8        │ 24        │ $1,456    │      │
│ David Thompson  │ Jan 15      │ 7:45 PM │ 1      │ 2      │ $178     │ 31       │ 78        │ $5,670    │ VIP  │
│ ...             │             │         │        │        │          │          │           │           │      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1-25 of 1,247 guests                                              [← Prev]  Page 1 of 50  [Next →]     │
│                                                                           [25 ▼] per page                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Column Definitions

| Column | Description | Sortable |
|--------|-------------|----------|
| Guest | First name + Last name | Yes |
| Last Visit | Most recent visit date | Yes (default desc) |
| Time | Time of last visit | No |
| Visits (period) | Number of visits in selected period | Yes |
| Covers (period) | Total party size in selected period | Yes |
| Spend (period) | Total spend in selected period | Yes |
| Lifetime Visits | All-time visit count | Yes |
| LT Covers | All-time total covers | Yes |
| LT Spend | All-time total spend | Yes |
| Tags | Guest tags (displayed as badges) | Filter only |

### Filters

**Search:**
- Search by guest name (first or last)
- Search by email
- Search by phone

**Segment Filter:**
- All Guests
- New (1 visit)
- Returning (2-9 visits)
- VIP (10+ visits)
- Lapsed (no visit in 90+ days)

**Tag Filter:**
- Multi-select dropdown
- Shows all tags with guest counts
- "VIP (23)", "Regular (156)", "Birthday (12)"

**Period Filter:**
- Last 7 Days
- Last 30 Days (default)
- Last 90 Days
- This Month
- Last Month
- This Year
- Custom Date Range

### Row Click → Guest Detail Drawer

Clicking a row opens a slide-out drawer with full guest details:

```
┌───────────────────────────────────────────────────┐
│ ← Back                           [Edit] [Archive] │
├───────────────────────────────────────────────────┤
│                                                   │
│  👤 Sarah Johnson                                 │
│  sarah.johnson@email.com                          │
│  (210) 555-0123                                   │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ VIP │ Regular │ Birthday (Mar 15) │         │  │
│  └─────────────────────────────────────────────┘  │
│  [+ Add Tag]                                      │
│                                                   │
├───────────────────────────────────────────────────┤
│  LIFETIME STATS                                   │
│  ┌────────────┬────────────┬────────────┐        │
│  │ 47 Visits  │ 142 Covers │ $8,234     │        │
│  │            │ Avg: 3.0   │ Avg: $175  │        │
│  └────────────┴────────────┴────────────┘        │
│                                                   │
│  First Visit: Mar 12, 2021 (1,415 days ago)      │
│                                                   │
├───────────────────────────────────────────────────┤
│  VISIT HISTORY                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ Jan 24, 2025 │ 7:30 PM │ 3 ppl │ $156      │  │
│  │ Jan 18, 2025 │ 6:45 PM │ 2 ppl │ $178      │  │
│  │ Jan 10, 2025 │ 7:00 PM │ 3 ppl │ $152      │  │
│  │ Dec 28, 2024 │ 8:00 PM │ 4 ppl │ $234      │  │
│  │ Dec 15, 2024 │ 7:15 PM │ 2 ppl │ $145      │  │
│  │ ... show more                               │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
├───────────────────────────────────────────────────┤
│  NOTES                                            │
│  ┌─────────────────────────────────────────────┐  │
│  │ Prefers booth seating. Allergic to shellfish│  │
│  │ Always orders the ribeye medium-rare.       │  │
│  └─────────────────────────────────────────────┘  │
│  [Edit Notes]                                     │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Guest Sync Logic

**Sync Frequency:** Daily at 6:00 AM

**Sync Process:**
1. Fetch guest list from OpenTable API
2. For each guest:
   - Match by `openTableGuestId` or `email`
   - If new, create Guest record
   - If existing, update metrics
3. Fetch recent visits
4. Update `visitsThisPeriod`, `coversThisPeriod`, `spendThisPeriod`
5. Recalculate `loyaltySegment` based on `lifetimeVisits`

**Loyalty Segment Calculation:**
```typescript
function calculateLoyaltySegment(guest: Guest): LoyaltySegment {
  const daysSinceLastVisit = differenceInDays(new Date(), guest.lastVisitDate);
  
  if (daysSinceLastVisit > 90) return 'LAPSED';
  if (guest.lifetimeVisits >= 10) return 'VIP';
  if (guest.lifetimeVisits >= 2) return 'RETURNING';
  return 'NEW';
}
```

### Guest API Endpoints

```typescript
// Get paginated guest list
GET /api/locations/{id}/guests
  ?page=1
  &pageSize=25
  &search=sarah
  &segment=VIP
  &tags=vip,birthday
  &periodStart=2025-01-01
  &periodEnd=2025-01-31
  &sortBy=lastVisitDate
  &sortOrder=desc

// Get single guest with visit history
GET /api/locations/{id}/guests/{guestId}

// Update guest (tags, notes)
PATCH /api/locations/{id}/guests/{guestId}
{
  tags: ['vip', 'birthday'],
  notes: 'Prefers booth seating'
}

// Archive guest (soft delete)
POST /api/locations/{id}/guests/{guestId}/archive

// Get guest tags for location
GET /api/locations/{id}/guest-tags

// Create custom tag
POST /api/locations/{id}/guest-tags
{
  name: 'Wine Club',
  color: '#8b5cf6'
}

// Trigger guest sync
POST /api/sync/guests
{
  locationId: string,
  force?: boolean
}
```

### Guest Data Export

Export to CSV includes:
- Full name
- Email
- Phone
- Last Visit Date
- Last Visit Time
- Visits (period)
- Covers (period)
- Spend (period)
- Lifetime Visits
- Lifetime Covers
- Lifetime Spend
- Tags (comma-separated)
- Loyalty Segment
- First Visit Date

---

## Reviews Data Table (BrightLocal)

### Overview

Individual review records from BrightLocal API. Pulls from 80+ review platforms including Google, Yelp, Facebook, TripAdvisor.

### Page Location

```
/dashboard/reviews/data
```

Or as a tab on the Reviews page:
```
/dashboard/reviews?view=charts  (default)
/dashboard/reviews?view=reviews
```

### Reviews Data Table UI

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Reviews                                                                                                         │
│ Last synced: Jan 25, 2025 12:00 AM from BrightLocal                                   [↻ Sync Now] [Export CSV] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 [Search reviews...       ]   [Rating: All ▼]   [Source: All ▼]   [Period: Last 30 Days ▼]   [Status: All ▼] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Date       │ Source   │ Rating │ Reviewer        │ Review Content                              │ Status │ Resp │
│────────────┼──────────┼────────┼─────────────────┼─────────────────────────────────────────────┼────────┼──────│
│ Jan 24     │ Google   │ ★★★★★  │ Sarah M.        │ "Amazing food and service! The ribeye was..."│ Active │  ✓   │
│ Jan 23     │ Yelp     │ ★★★★☆  │ Michael C.      │ "Great atmosphere but a bit loud. Food was..."│ Active │  ✓   │
│ Jan 22     │ Google   │ ★★☆☆☆  │ Jennifer K.     │ "Waited 45 minutes for our table despite..."│ Active │  ✗   │
│ Jan 21     │ Facebook │ ★★★★★  │ David T.        │ "Best brunch in San Antonio! The chicken..."│ Active │  ✗   │
│ Jan 20     │ TripAdv  │ ★★★☆☆  │ Robert W.       │ "Food was good but overpriced for what..."  │ Active │  ✓   │
│ Jan 19     │ Google   │ ★☆☆☆☆  │ Emily R.        │ "Terrible experience. Server was rude and..."│ Flagged│  ✓   │
│ ...        │          │        │                 │                                             │        │      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1-25 of 342 reviews                                               [← Prev]  Page 1 of 14  [Next →]     │
│                                                                           [25 ▼] per page                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Column Definitions

| Column | Description | Sortable |
|--------|-------------|----------|
| Date | When review was posted | Yes (default desc) |
| Source | Platform (Google, Yelp, etc.) | Filter only |
| Rating | Star rating (1-5) | Yes |
| Reviewer | Reviewer name | No |
| Review Content | Truncated review text (click to expand) | No |
| Status | Active, Pending, Removed, Flagged | Filter only |
| Resp | Has management response | Filter only |

### Filters

**Search:**
- Search review content (full text)
- Search reviewer name

**Rating Filter:**
- All Ratings
- 5 Stars
- 4 Stars
- 3 Stars
- 2 Stars
- 1 Star
- Negative (1-3 Stars) ← Quick filter for attention-needed

**Source Filter:**
- All Sources
- Google (with count)
- Yelp (with count)
- Facebook (with count)
- TripAdvisor (with count)
- OpenTable (with count)
- Other

**Period Filter:**
- Last 7 Days
- Last 30 Days (default)
- Last 90 Days
- This Month
- Last Month
- This Year
- Custom Date Range

**Status Filter:**
- All
- Active
- Needs Response (no response yet)
- Flagged
- Removed

### Row Click → Review Detail Drawer

Clicking a row opens a slide-out drawer with full review details:

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back                                    [Flag] [Copy Link]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ★★☆☆☆  2 Stars                                              │
│  Google · January 22, 2025                                    │
│                                                               │
│  Jennifer K.                                                  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  REVIEW                                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ "Waited 45 minutes for our table despite having a      │  │
│  │ reservation. When we finally sat down, the server      │  │
│  │ seemed overwhelmed and forgot our drink order twice.   │  │
│  │ The food was decent but not worth the wait. The        │  │
│  │ ribeye was cooked properly but the sides were cold.    │  │
│  │ Disappointing experience overall."                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  [View on Google ↗]                                          │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  MANAGEMENT RESPONSE                                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ No response yet                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│  [Suggest Response with AI]  [Mark as Responded]             │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  SENTIMENT ANALYSIS                                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Overall: Negative (-0.65)                               │  │
│  │                                                         │  │
│  │ Key Issues Detected:                                    │  │
│  │ • Wait time / Reservation issues                        │  │
│  │ • Service quality                                       │  │
│  │ • Food temperature                                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  INTERNAL NOTES                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Spoke with FOH manager - this was during the private   │  │
│  │ event on Jan 22 that caused delays.                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│  [Edit Notes]                                                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Negative Review Alert Row

Negative reviews (1-3 stars) should be visually distinct:

```
│ Jan 22     │ Google   │ ★★☆☆☆  │ Jennifer K.     │ "Waited 45 minutes for our table despite..."│ Active │  ✗   │
              ↑ Red background tint on row
              ↑ Red star icons
```

### Review Sync Logic

**Sync Frequency:** Daily at 12:00 AM

**Sync Process:**
1. Call BrightLocal API for new/updated reviews
2. For each review:
   - Match by `brightLocalId`
   - If new, create Review record
   - If existing, update status/content if changed
3. Calculate sentiment (if not provided by API)
4. Update ReviewSnapshot for affected months
5. Recalculate DailyReviews aggregates

**Sentiment Calculation:**
```typescript
async function calculateSentiment(reviewContent: string): Promise<{
  sentiment: Sentiment;
  score: number;
}> {
  // Use Claude API or similar for sentiment analysis
  // Score: -1.0 (very negative) to 1.0 (very positive)
  
  // Simple heuristic fallback based on rating:
  // 5 stars = POSITIVE (0.8)
  // 4 stars = POSITIVE (0.4)
  // 3 stars = NEUTRAL (0.0)
  // 2 stars = NEGATIVE (-0.4)
  // 1 star = NEGATIVE (-0.8)
}
```

### AI Response Suggestions (Pro Plan)

For Pro plan users, offer AI-generated response suggestions:

```
┌───────────────────────────────────────────────────────────────┐
│ Suggested Response                                            │
├───────────────────────────────────────────────────────────────┤
│ "Dear Jennifer, thank you for taking the time to share your  │
│ feedback. We sincerely apologize for the extended wait time  │
│ and the service issues you experienced during your visit on  │
│ January 22nd. This was during an unusually busy evening,     │
│ but that's no excuse for not meeting our standards. We've    │
│ addressed this with our team to ensure it doesn't happen     │
│ again. We'd love the opportunity to make it right - please   │
│ reach out to us at manager@southerleigh.com for a           │
│ complimentary appetizer on your next visit."                 │
├───────────────────────────────────────────────────────────────┤
│ [Regenerate]  [Copy]  [Edit & Post]                          │
└───────────────────────────────────────────────────────────────┘
```

### Review API Endpoints

```typescript
// Get paginated review list
GET /api/locations/{id}/reviews
  ?page=1
  &pageSize=25
  &search=ribeye
  &rating=1,2,3          // Negative only
  &source=GOOGLE,YELP
  &status=ACTIVE
  &hasResponse=false     // Needs response
  &periodStart=2025-01-01
  &periodEnd=2025-01-31
  &sortBy=reviewDate
  &sortOrder=desc

// Get single review with full details
GET /api/locations/{id}/reviews/{reviewId}

// Update review (notes, flags)
PATCH /api/locations/{id}/reviews/{reviewId}
{
  internalNotes: 'Spoke with manager...',
  isFlagged: true,
  flagReason: 'Suspected fake review'
}

// Mark review as responded
POST /api/locations/{id}/reviews/{reviewId}/mark-responded
{
  responseDate: '2025-01-23',
  responseContent: 'Thank you for your feedback...'
}

// Generate AI response suggestion (Pro plan)
POST /api/locations/{id}/reviews/{reviewId}/suggest-response

// Get review snapshots (for charts)
GET /api/locations/{id}/review-snapshots
  ?startMonth=2024-01
  &endMonth=2025-01

// Trigger review sync
POST /api/sync/reviews
{
  locationId: string,
  force?: boolean
}
```

### Review Data Export

Export to CSV includes:
- Review Date
- Source
- Rating
- Reviewer Name
- Review Content (full)
- Sentiment
- Sentiment Score
- Has Response
- Response Date
- Status
- Internal Notes

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
