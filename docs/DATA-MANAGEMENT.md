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
│  VisibilitySnapshot    ← Monthly website visibility (SEMrush)  │
│  KeywordRanking        ← Individual keyword tracking           │
│  MapsVisibilitySnapshot← Monthly maps visibility (BrightLocal) │
│  LocalSearchGridResult ← Grid check results                    │
│  KeywordLocalRanking   ← Local keyword positions               │
│  NAPAudit              ← NAP consistency audits                │
│  GBPAuditSnapshot      ← GBP optimization audits               │
│  MapsVisibilityConfig  ← BrightLocal settings per location     │
│  AIVisibilitySnapshot  ← Monthly AI visibility (Pro plan)      │
│  PromptTracking        ← AI prompt results (Pro plan)          │
│  VisibilityConfig      ← SEMrush settings per location         │
│  SocialMediaConfig     ← Social provider settings              │
│  SocialProfile         ← Connected social accounts             │
│  SocialSnapshot        ← Monthly social metrics                │
│  SocialPost            ← Individual post performance           │
│  SocialHashtag         ← Hashtag tracking                      │
│  SocialCompetitor      ← Competitor social tracking            │
│  MediaMention          ← Individual press coverage             │
│  MediaMentionSnapshot  ← Monthly PR aggregates                 │
│  Award                 ← Awards and accolades                  │
│  PRConfig              ← PR settings per location              │
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
│  - Visibility charts pull from VisibilitySnapshot              │
│  - Keyword table pulls from KeywordRanking                     │
│  - Maps grid/charts pull from MapsVisibilitySnapshot           │
│  - Local rankings table pulls from KeywordLocalRanking         │
│  - NAP/GBP health pulls from NAPAudit, GBPAuditSnapshot        │
│  - AI Visibility (Pro) pulls from AIVisibilitySnapshot         │
│  - Prompt table (Pro) pulls from PromptTracking                │
│  - Social charts pull from SocialSnapshot                      │
│  - Posts table pulls from SocialPost                           │
│  - PR charts pull from MediaMentionSnapshot                    │
│  - Mentions table pulls from MediaMention                      │
│  - Awards section pulls from Award                             │
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
| Website Visibility | SEMrush | Weekly | Sunday 6:00 AM | VisibilitySnapshot, KeywordRanking |
| Maps Visibility | BrightLocal | Weekly | Sunday 6:00 AM | MapsVisibilitySnapshot, KeywordLocalRanking |
| Local Search Grid | BrightLocal | Weekly | Sunday 6:00 AM | LocalSearchGridResult |
| NAP Audit | BrightLocal | Monthly | 1st of month | NAPAudit |
| GBP Audit | BrightLocal | Monthly | 1st of month | GBPAuditSnapshot |
| AI Visibility (Pro) | SEMrush | Weekly | Sunday 6:00 AM | AIVisibilitySnapshot, PromptTracking |
| Social Media | Sprout/Metricool/etc. | Daily | 7:00 AM | SocialSnapshot, SocialPost |
| PR Mentions | Manual/CSV | On-demand | N/A | MediaMention, MediaMentionSnapshot |
| PR Mentions (Future) | Cision/Meltwater | Daily | 8:00 AM | MediaMention, MediaMentionSnapshot |
| Awards | Manual | On-demand | N/A | Award |

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

### VisibilityConfig (SEMrush Settings per Location)

```prisma
model VisibilityConfig {
  id              String   @id @default(cuid())
  locationId      String   @unique
  
  // SEMrush project settings
  semrushProjectId    String?      // SEMrush project ID
  domain              String?      // Primary domain to track
  targetKeywords      String[]     // Keywords to track positions for
  targetLocation      String?      // Geographic target (e.g., "San Antonio, TX")
  
  // AI Visibility (Pro plan only)
  aiVisibilityEnabled Boolean      @default(false)
  trackedPrompts      String[]     // Prompts to track in AI platforms
  
  // Sync settings
  lastSyncAt          DateTime?
  syncFrequency       SyncFrequency @default(WEEKLY)
  
  location            Location     @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
}

enum SyncFrequency {
  DAILY
  WEEKLY
  MONTHLY
}
```

### MapsVisibilityConfig (BrightLocal Settings per Location)

```prisma
model MapsVisibilityConfig {
  id              String   @id @default(cuid())
  locationId      String   @unique
  
  // BrightLocal settings
  brightLocalLocationId   String?      // BrightLocal location ID
  brightLocalReportId     String?      // Report ID for data retrieval
  
  // Google Business Profile
  googleBusinessProfileId String?      // GBP ID
  gbpName                 String?      // Business name as it appears on GBP
  gbpAddress              String?      // Full address
  gbpPhone                String?      // Phone number
  
  // Grid settings
  gridCenterLat           Decimal?     @db.Decimal(10, 7)  // Center latitude
  gridCenterLng           Decimal?     @db.Decimal(10, 7)  // Center longitude
  gridRadius              Int          @default(5)         // Radius in miles
  gridSize                Int          @default(5)         // Grid dimension (5x5, 7x7, etc.)
  
  // Keywords to track in local search
  localKeywords           String[]     // e.g., ["restaurants near me", "best brunch san antonio"]
  
  // Competitors (up to 4)
  competitors             Json?        // [{ name, gbpId, address }, ...]
  
  // Sync settings
  lastSyncAt              DateTime?
  lastGridSyncAt          DateTime?
  lastNAPAuditAt          DateTime?
  lastGBPAuditAt          DateTime?
  syncFrequency           SyncFrequency @default(WEEKLY)
  
  location                Location     @relation(fields: [locationId], references: [id])
  
  createdAt               DateTime     @default(now())
  updatedAt               DateTime     @updatedAt
}
```

### MapsVisibilitySnapshot (Monthly Maps Visibility)

Monthly snapshots of local/maps visibility metrics from BrightLocal.

```prisma
model MapsVisibilitySnapshot {
  id              String   @id @default(cuid())
  locationId      String
  month           String   // 'YYYY-MM' format
  
  // Overall maps visibility
  mapsVisibilityScore     Decimal  @db.Decimal(5, 2)   // 0-100 score
  mapsVisibilityChange    Decimal? @db.Decimal(5, 2)   // Change from prior month
  
  // Grid-based metrics (average across all keywords)
  averageGridRank         Decimal? @db.Decimal(4, 2)   // Avg rank across grid points
  gridCoveragePercent     Decimal? @db.Decimal(5, 2)   // % of grid where ranking in top 20
  
  // Local Pack metrics
  localPackAppearances    Int      @default(0)         // Times appearing in Local Pack
  localPackAvgPosition    Decimal? @db.Decimal(4, 2)   // Avg position when in Local Pack
  
  // Google Maps metrics
  mapsAvgPosition         Decimal? @db.Decimal(4, 2)   // Avg position in Maps results
  
  // Keyword tracking
  totalKeywordsTracked    Int      @default(0)
  keywordsInLocalPack     Int      @default(0)         // Keywords where we appear in Pack
  keywordsInTop3          Int      @default(0)         // Keywords in top 3 Maps
  keywordsInTop10         Int      @default(0)
  keywordsInTop20         Int      @default(0)
  
  // Competitor comparison
  competitorAvgRank       Json?    // { "Competitor A": 4.2, "Competitor B": 6.1 }
  rankVsCompetitors       String?  // "AHEAD", "BEHIND", "TIED"
  
  // NAP health
  napConsistencyScore     Decimal? @db.Decimal(5, 2)   // 0-100
  napIssuesCount          Int      @default(0)
  
  // GBP health
  gbpOptimizationScore    Decimal? @db.Decimal(5, 2)   // 0-100
  gbpCompletenessScore    Decimal? @db.Decimal(5, 2)   // 0-100
  
  // Targets
  mapsVisibilityTarget    Decimal? @db.Decimal(5, 2)
  
  // Sync metadata
  syncedAt                DateTime
  syncStatus              SyncStatus @default(SUCCESS)
  
  location                Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, month])
  @@index([locationId, month])
}
```

### LocalSearchGridResult (Grid Check Results)

Results from BrightLocal's Local Search Grid API showing rankings across geographic grid.

```prisma
model LocalSearchGridResult {
  id              String   @id @default(cuid())
  locationId      String
  
  // Keyword info
  keyword             String
  
  // Grid configuration at time of check
  gridCenterLat       Decimal  @db.Decimal(10, 7)
  gridCenterLng       Decimal  @db.Decimal(10, 7)
  gridRadius          Int                           // Miles
  gridSize            Int                           // 5x5, 7x7, etc.
  
  // Results
  checkedAt           DateTime
  
  // Grid data - JSON array of grid points with ranks
  // [{ lat, lng, rank, inLocalPack, competitors: [{name, rank}] }, ...]
  gridData            Json
  
  // Aggregated metrics
  averageRank         Decimal? @db.Decimal(4, 2)    // Avg across all grid points
  bestRank            Int?                          // Best position achieved
  worstRank           Int?                          // Worst position
  notRankingCount     Int      @default(0)          // Grid points where not ranking
  inLocalPackCount    Int      @default(0)          // Grid points in Local Pack
  
  // Coverage metrics
  top3Count           Int      @default(0)          // Grid points ranked 1-3
  top10Count          Int      @default(0)          // Grid points ranked 1-10
  top20Count          Int      @default(0)          // Grid points ranked 1-20
  totalGridPoints     Int                           // Total points in grid
  
  // Competitor comparison at this check
  competitorRanks     Json?    // { "Competitor A": { avg: 5.2, best: 1 }, ... }
  
  // Screenshot URL (if captured)
  screenshotUrl       String?
  
  // Sync metadata
  brightLocalCheckId  String?                       // BrightLocal's check ID
  syncStatus          SyncStatus @default(SUCCESS)
  
  location            Location @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime @default(now())
  
  @@index([locationId, keyword])
  @@index([locationId, checkedAt])
}
```

### KeywordLocalRanking (Per-Keyword Local Rankings)

Individual keyword rankings in local/maps results.

```prisma
model KeywordLocalRanking {
  id              String   @id @default(cuid())
  locationId      String
  
  // Keyword info
  keyword             String
  searchVolume        Int?         // Monthly local search volume
  
  // Current Local Pack position
  localPackPosition   Int?         // Position in Local Pack (1-3, null if not in pack)
  inLocalPack         Boolean      @default(false)
  
  // Current Google Maps position
  mapsPosition        Int?         // Position in Maps results
  
  // Current Local Finder position
  localFinderPosition Int?
  
  // Position changes
  previousLocalPackPos    Int?
  previousMapsPosition    Int?
  localPackChange         Int?     // Positive = improved
  mapsChange              Int?
  
  // Grid-based rank (average across grid)
  averageGridRank     Decimal? @db.Decimal(4, 2)
  gridCoverage        Decimal? @db.Decimal(5, 2)  // % of grid ranking top 20
  
  // Competitor positions for this keyword
  competitorPositions Json?    // { "Competitor A": { localPack: 2, maps: 4 }, ... }
  
  // Tracking
  trackedSince        DateTime
  lastChecked         DateTime
  
  // Sync metadata
  syncedAt            DateTime
  syncStatus          SyncStatus @default(SUCCESS)
  
  location            Location @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([locationId, keyword])
  @@index([locationId, localPackPosition])
  @@index([locationId, mapsPosition])
}
```

### NAPAudit (NAP Consistency Tracking)

Track Name, Address, Phone consistency across directories.

```prisma
model NAPAudit {
  id              String   @id @default(cuid())
  locationId      String
  
  // Audit date
  auditedAt           DateTime
  
  // Overall scores
  overallScore        Decimal  @db.Decimal(5, 2)   // 0-100
  nameScore           Decimal? @db.Decimal(5, 2)
  addressScore        Decimal? @db.Decimal(5, 2)
  phoneScore          Decimal? @db.Decimal(5, 2)
  
  // Directory results - JSON array
  // [{ directory, found, nameMatch, addressMatch, phoneMatch, issues[], url }, ...]
  directoryResults    Json
  
  // Counts
  totalDirectories    Int      @default(0)
  directoriesFound    Int      @default(0)
  directoriesCorrect  Int      @default(0)
  directoriesWithIssues Int    @default(0)
  
  // Common issues found
  issuesSummary       Json?    // { "wrong_phone": 3, "old_address": 2, "missing_listing": 5 }
  
  // Priority fixes
  priorityFixes       Json?    // [{ directory, issue, severity }, ...]
  
  // Sync metadata
  brightLocalAuditId  String?
  syncStatus          SyncStatus @default(SUCCESS)
  
  location            Location @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime @default(now())
  
  @@index([locationId, auditedAt])
}
```

### GBPAuditSnapshot (Google Business Profile Audit)

Track GBP optimization and compare to competitors.

```prisma
model GBPAuditSnapshot {
  id              String   @id @default(cuid())
  locationId      String
  
  // Audit date
  auditedAt           DateTime
  
  // Overall scores
  optimizationScore   Decimal  @db.Decimal(5, 2)   // 0-100 overall
  completenessScore   Decimal  @db.Decimal(5, 2)   // 0-100 profile completeness
  
  // Category scores
  basicInfoScore      Decimal? @db.Decimal(5, 2)   // Name, category, hours
  photosScore         Decimal? @db.Decimal(5, 2)   // Photo quantity/quality
  reviewsScore        Decimal? @db.Decimal(5, 2)   // Review performance
  postsScore          Decimal? @db.Decimal(5, 2)   // Posting activity
  qaScore             Decimal? @db.Decimal(5, 2)   // Q&A engagement
  attributesScore     Decimal? @db.Decimal(5, 2)   // Attributes completion
  
  // Profile details
  photoCount          Int?
  reviewCount         Int?
  averageRating       Decimal? @db.Decimal(3, 2)
  responseRate        Decimal? @db.Decimal(5, 2)
  postsLast30Days     Int?
  qaCount             Int?
  
  // Detailed audit results
  auditDetails        Json?    // { category: { score, issues[], recommendations[] }, ... }
  
  // Competitor comparison
  competitorScores    Json?    // { "Competitor A": { optimization: 85, completeness: 90 }, ... }
  rankVsCompetitors   Int?     // 1 = best, 5 = worst among tracked
  
  // Recommendations
  recommendations     Json?    // [{ priority, category, action, impact }, ...]
  
  // Sync metadata
  brightLocalAuditId  String?
  syncStatus          SyncStatus @default(SUCCESS)
  
  location            Location @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime @default(now())
  
  @@index([locationId, auditedAt])
}
```

### VisibilitySnapshot (Monthly Website Visibility)

Monthly snapshots of website visibility metrics from SEMrush.

```prisma
model VisibilitySnapshot {
  id              String   @id @default(cuid())
  locationId      String
  month           String   // 'YYYY-MM' format
  
  // Overall visibility
  visibilityScore     Decimal  @db.Decimal(5, 2)   // 0-100 score
  visibilityChange    Decimal? @db.Decimal(5, 2)   // Change from prior month
  
  // Traffic estimates
  estimatedTraffic    Int?                          // Monthly organic traffic estimate
  trafficChange       Decimal? @db.Decimal(5, 2)   // % change from prior month
  
  // Keyword metrics
  totalKeywordsTracked    Int      @default(0)
  keywordsInTop3          Int      @default(0)
  keywordsInTop10         Int      @default(0)
  keywordsInTop20         Int      @default(0)
  keywordsInTop50         Int      @default(0)
  keywordsInTop100        Int      @default(0)
  
  // Keyword movement
  keywordsImproved        Int      @default(0)
  keywordsDeclined        Int      @default(0)
  keywordsUnchanged       Int      @default(0)
  newKeywords             Int      @default(0)
  lostKeywords            Int      @default(0)
  
  // SERP features
  featuredSnippets        Int      @default(0)
  localPackAppearances    Int      @default(0)
  
  // Domain authority (if available)
  domainAuthority         Int?
  
  // Competitor comparison (JSON for flexibility)
  competitorData          Json?    // { "competitor1.com": { score: 45, traffic: 5000 }, ... }
  
  // Targets
  visibilityTarget        Decimal? @db.Decimal(5, 2)
  
  // Sync metadata
  syncedAt                DateTime
  syncStatus              SyncStatus @default(SUCCESS)
  
  location                Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, month])
  @@index([locationId, month])
}
```

### KeywordRanking (Individual Keyword Tracking)

Daily/weekly keyword position tracking from SEMrush Position Tracking.

```prisma
model KeywordRanking {
  id              String   @id @default(cuid())
  locationId      String
  
  // Keyword info
  keyword             String
  searchVolume        Int?         // Monthly search volume
  keywordDifficulty   Int?         // 0-100 difficulty score
  
  // Current position
  position            Int?         // Current SERP position (null if not ranking)
  previousPosition    Int?         // Position from last sync
  positionChange      Int?         // Positive = improved, negative = dropped
  
  // URL ranking for this keyword
  rankingUrl          String?
  
  // SERP features
  hasFeaturedSnippet  Boolean      @default(false)
  hasLocalPack        Boolean      @default(false)
  hasSitelinks        Boolean      @default(false)
  hasKnowledgePanel   Boolean      @default(false)
  
  // Traffic estimate for this keyword
  estimatedClicks     Int?
  estimatedTraffic    Decimal?     @db.Decimal(10, 2)
  
  // CPC data (for value estimation)
  cpc                 Decimal?     @db.Decimal(6, 2)
  trafficValue        Decimal?     @db.Decimal(10, 2)  // estimatedTraffic * CPC
  
  // Tracking
  trackedSince        DateTime
  lastChecked         DateTime
  
  // Sync metadata
  syncedAt            DateTime
  syncStatus          SyncStatus   @default(SUCCESS)
  
  location            Location     @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
  
  @@unique([locationId, keyword])
  @@index([locationId, position])
  @@index([locationId, keyword])
}
```

### KeywordRankingHistory (Position History)

Historical tracking for trend charts.

```prisma
model KeywordRankingHistory {
  id              String   @id @default(cuid())
  keywordRankingId String
  
  date            DateTime @db.Date
  position        Int?
  
  keywordRanking  KeywordRanking @relation(fields: [keywordRankingId], references: [id], onDelete: Cascade)
  
  @@unique([keywordRankingId, date])
  @@index([keywordRankingId, date])
}
```

### AIVisibilitySnapshot (Monthly AI Visibility - PRO PLAN)

Monthly snapshots of AI visibility metrics. Only populated for Pro plan locations.

```prisma
model AIVisibilitySnapshot {
  id              String   @id @default(cuid())
  locationId      String
  month           String   // 'YYYY-MM' format
  
  // Overall AI visibility
  aiVisibilityScore       Decimal  @db.Decimal(5, 2)   // 0-100 score
  aiVisibilityChange      Decimal? @db.Decimal(5, 2)   // Change from prior month
  
  // Brand mentions in AI answers
  totalBrandMentions      Int      @default(0)
  brandMentionChange      Int?                          // Change from prior month
  
  // Average position in AI responses
  averagePosition         Decimal? @db.Decimal(4, 2)   // When mentioned, average position
  
  // By platform breakdown
  googleAIMentions        Int      @default(0)
  googleAIAvgPosition     Decimal? @db.Decimal(4, 2)
  chatGPTMentions         Int      @default(0)
  chatGPTAvgPosition      Decimal? @db.Decimal(4, 2)
  perplexityMentions      Int      @default(0)
  perplexityAvgPosition   Decimal? @db.Decimal(4, 2)
  bingCopilotMentions     Int      @default(0)
  bingCopilotAvgPosition  Decimal? @db.Decimal(4, 2)
  
  // Prompt tracking summary
  totalPromptsTracked     Int      @default(0)
  promptsWithMention      Int      @default(0)        // Prompts where brand was mentioned
  mentionRate             Decimal? @db.Decimal(5, 2)  // % of prompts with brand mention
  
  // Competitor comparison (JSON)
  competitorData          Json?    // { "competitor1": { mentions: 15, avgPosition: 2.3 }, ... }
  
  // Targets
  aiVisibilityTarget      Decimal? @db.Decimal(5, 2)
  
  // Sync metadata
  syncedAt                DateTime
  syncStatus              SyncStatus @default(SUCCESS)
  
  location                Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, month])
  @@index([locationId, month])
}
```

### PromptTracking (Individual Prompt Results - PRO PLAN)

Track brand presence for specific prompts across AI platforms.

```prisma
model PromptTracking {
  id              String   @id @default(cuid())
  locationId      String
  
  // Prompt info
  prompt              String       // e.g., "best restaurants in San Antonio"
  category            String?      // e.g., "Local Discovery", "Menu Items", "Events"
  
  // Platform
  platform            AIPlatform
  
  // Latest result
  brandMentioned      Boolean      @default(false)
  position            Int?         // Position in AI response (1 = first mentioned)
  mentionContext      String?      @db.Text  // Snippet of how brand was mentioned
  responseDate        DateTime?    // When AI response was captured
  
  // Historical tracking
  totalChecks         Int          @default(0)
  totalMentions       Int          @default(0)
  mentionRate         Decimal?     @db.Decimal(5, 2)  // % of checks with mention
  
  // Competitors mentioned (JSON)
  competitorsMentioned Json?       // ["competitor1", "competitor2"]
  
  // Tracking settings
  isActive            Boolean      @default(true)
  checkFrequency      SyncFrequency @default(WEEKLY)
  
  // Sync metadata
  lastCheckedAt       DateTime?
  syncStatus          SyncStatus   @default(SUCCESS)
  
  location            Location     @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
  
  @@unique([locationId, prompt, platform])
  @@index([locationId, platform])
  @@index([locationId, brandMentioned])
}

enum AIPlatform {
  GOOGLE_AI
  CHATGPT
  PERPLEXITY
  BING_COPILOT
  CLAUDE
  OTHER
}
```

### PromptTrackingHistory (Prompt Check History - PRO PLAN)

Historical record of each prompt check for trend analysis.

```prisma
model PromptTrackingHistory {
  id                  String   @id @default(cuid())
  promptTrackingId    String
  
  checkedAt           DateTime
  brandMentioned      Boolean
  position            Int?
  mentionContext      String?  @db.Text
  fullResponse        String?  @db.Text  // Full AI response (optional, for analysis)
  
  promptTracking      PromptTracking @relation(fields: [promptTrackingId], references: [id], onDelete: Cascade)
  
  @@index([promptTrackingId, checkedAt])
}
```

### AI Platform Display Config

```typescript
const aiPlatformConfig = {
  GOOGLE_AI: {
    name: 'Google AI',
    color: '#4285F4',
    icon: 'google',
    bgColor: '#E8F0FE',
  },
  CHATGPT: {
    name: 'ChatGPT',
    color: '#10A37F',
    icon: 'openai',
    bgColor: '#E6F4F1',
  },
  PERPLEXITY: {
    name: 'Perplexity',
    color: '#1FB8CD',
    icon: 'search',
    bgColor: '#E5F6F8',
  },
  BING_COPILOT: {
    name: 'Bing Copilot',
    color: '#00BCF2',
    icon: 'microsoft',
    bgColor: '#E5F7FC',
  },
  CLAUDE: {
    name: 'Claude',
    color: '#D97757',
    icon: 'bot',
    bgColor: '#FCF0EC',
  },
  OTHER: {
    name: 'Other',
    color: '#6B7280',
    icon: 'globe',
    bgColor: '#F3F4F6',
  },
};
```

### SocialMediaConfig (Provider Settings per Location)

```prisma
model SocialMediaConfig {
  id              String   @id @default(cuid())
  locationId      String   @unique
  
  // Provider connection
  provider            SocialProvider?  // Which tool they use
  providerAccountId   String?          // Account ID in provider system
  
  // API credentials (encrypted)
  apiKey              String?          // Provider API key
  apiSecret           String?          // Provider API secret
  accessToken         String?          // OAuth access token
  refreshToken        String?          // OAuth refresh token
  tokenExpiresAt      DateTime?        // Token expiration
  
  // Connected profiles (stored in SocialProfile)
  
  // Sync settings
  lastSyncAt          DateTime?
  syncFrequency       SyncFrequency    @default(DAILY)
  
  // Feature flags
  trackCompetitors    Boolean          @default(false)
  trackHashtags       Boolean          @default(false)
  
  location            Location         @relation(fields: [locationId], references: [id])
  profiles            SocialProfile[]
  
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
}

enum SocialProvider {
  SPROUT_SOCIAL
  METRICOOL
  HOOTSUITE
  BUFFER
  LATER
  MANUAL           // Manual entry / CSV import
}
```

### SocialProfile (Connected Social Accounts)

Individual social media accounts connected via the provider.

```prisma
model SocialProfile {
  id              String   @id @default(cuid())
  locationId      String
  configId        String
  
  // Platform info
  platform            SocialPlatform
  platformAccountId   String           // Account ID on the platform
  handle              String           // @username
  displayName         String?          // Display name
  profileUrl          String?          // Link to profile
  profileImageUrl     String?          // Avatar
  
  // Account type
  accountType         String?          // "business", "creator", "personal"
  isVerified          Boolean          @default(false)
  
  // Current follower count (updated on each sync)
  followerCount       Int              @default(0)
  followingCount      Int?
  postCount           Int?
  
  // Tracking
  trackingSince       DateTime         @default(now())
  isActive            Boolean          @default(true)
  
  // Provider reference
  providerProfileId   String?          // ID in Sprout/Metricool/etc.
  
  config              SocialMediaConfig @relation(fields: [configId], references: [id])
  location            Location         @relation(fields: [locationId], references: [id])
  snapshots           SocialSnapshot[]
  posts               SocialPost[]
  
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  
  @@unique([locationId, platform, platformAccountId])
  @@index([locationId, platform])
}

enum SocialPlatform {
  INSTAGRAM
  FACEBOOK
  TIKTOK
  TWITTER           // X
  LINKEDIN
  YOUTUBE
  GOOGLE_BUSINESS   // GBP Posts
  PINTEREST
  OTHER
}
```

### SocialSnapshot (Monthly Social Metrics)

Monthly aggregated metrics per platform.

```prisma
model SocialSnapshot {
  id              String   @id @default(cuid())
  profileId       String
  locationId      String
  month           String   // 'YYYY-MM' format
  platform        SocialPlatform
  
  // Audience metrics
  followerCount       Int          @default(0)
  followerChange      Int?         // Net change from prior month
  followerGrowthRate  Decimal?     @db.Decimal(5, 2)  // % growth
  followingCount      Int?
  
  // Content metrics
  totalPosts          Int          @default(0)
  postsChange         Int?         // vs prior month
  
  // Engagement metrics (totals for the month)
  totalLikes          Int          @default(0)
  totalComments       Int          @default(0)
  totalShares         Int          @default(0)
  totalSaves          Int?         // Instagram
  totalViews          Int?         // Video views (Reels, TikTok)
  
  // Calculated engagement
  engagementRate      Decimal?     @db.Decimal(5, 2)  // (engagements / reach) * 100
  avgEngagementPerPost Decimal?    @db.Decimal(10, 2)
  
  // Reach & Impressions
  totalReach          Int?         // Unique accounts reached
  totalImpressions    Int?         // Total times content shown
  reachChange         Decimal?     @db.Decimal(5, 2)  // % change
  
  // Content breakdown
  feedPosts           Int          @default(0)
  stories             Int          @default(0)
  reels               Int          @default(0)
  videos              Int          @default(0)
  
  // Platform-specific metrics (JSON for flexibility)
  platformMetrics     Json?        // { profileVisits, websiteClicks, etc. }
  
  // Best performing content
  topPostId           String?      // Reference to best post
  topPostEngagement   Int?
  
  // Competitor comparison (if enabled)
  competitorData      Json?        // [{ handle, followers, engagementRate }, ...]
  
  // Targets
  followerTarget      Int?
  engagementTarget    Decimal?     @db.Decimal(5, 2)
  
  // Sync metadata
  syncedAt            DateTime
  syncStatus          SyncStatus   @default(SUCCESS)
  
  profile             SocialProfile @relation(fields: [profileId], references: [id])
  location            Location     @relation(fields: [locationId], references: [id])
  
  @@unique([profileId, month])
  @@index([locationId, month])
  @@index([locationId, platform, month])
}
```

### SocialPost (Individual Post Performance)

Track individual post performance for content analysis.

```prisma
model SocialPost {
  id              String   @id @default(cuid())
  profileId       String
  locationId      String
  platform        SocialPlatform
  
  // Post identification
  platformPostId      String           // Post ID on the platform
  postUrl             String?          // Direct link to post
  
  // Content
  postType            PostType
  caption             String?          @db.Text
  hashtags            String[]         // Extracted hashtags
  mentions            String[]         // @mentions
  
  // Media
  mediaType           MediaContentType?
  mediaUrls           String[]         // Image/video URLs
  thumbnailUrl        String?
  
  // Timing
  publishedAt         DateTime
  
  // Engagement metrics
  likes               Int              @default(0)
  comments            Int              @default(0)
  shares              Int              @default(0)
  saves               Int?             // Instagram
  views               Int?             // Video views
  
  // Reach
  reach               Int?
  impressions         Int?
  
  // Calculated
  engagementRate      Decimal?         @db.Decimal(5, 2)
  engagementTotal     Int              @default(0)  // likes + comments + shares + saves
  
  // Platform-specific metrics
  platformMetrics     Json?            // { plays, replays, exitRate, etc. }
  
  // Performance flags
  isTopPerformer      Boolean          @default(false)  // Top 10% engagement
  isBoosted           Boolean          @default(false)  // Paid promotion
  
  // Sync metadata
  lastSyncedAt        DateTime
  syncStatus          SyncStatus       @default(SUCCESS)
  
  profile             SocialProfile    @relation(fields: [profileId], references: [id])
  location            Location         @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  
  @@unique([profileId, platformPostId])
  @@index([locationId, platform])
  @@index([locationId, publishedAt])
  @@index([profileId, publishedAt])
}

enum PostType {
  FEED_POST       // Regular feed post
  STORY           // Ephemeral story
  REEL            // Instagram Reel
  VIDEO           // TikTok, YouTube, FB Video
  CAROUSEL        // Multi-image post
  LIVE            // Live video
  TEXT            // Text-only (Twitter/X)
  LINK            // Link share
  EVENT           // Facebook event
  POLL            // Poll/quiz
  OTHER
}

enum MediaContentType {
  IMAGE
  VIDEO
  CAROUSEL
  GIF
  AUDIO
  DOCUMENT
  NONE
}
```

### SocialHashtag (Hashtag Performance Tracking)

Track hashtag performance for content strategy.

```prisma
model SocialHashtag {
  id              String   @id @default(cuid())
  locationId      String
  
  hashtag             String           // Without # symbol
  platform            SocialPlatform?  // Null = all platforms
  
  // Usage metrics
  timesUsed           Int              @default(0)
  lastUsedAt          DateTime?
  
  // Performance when used
  avgEngagementRate   Decimal?         @db.Decimal(5, 2)
  avgReach            Int?
  totalEngagement     Int              @default(0)
  
  // Categorization
  category            String?          // "branded", "location", "food", "event"
  isOwned             Boolean          @default(false)  // Brand hashtag
  
  // Tracking
  isTracked           Boolean          @default(true)
  
  location            Location         @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  
  @@unique([locationId, hashtag, platform])
  @@index([locationId, avgEngagementRate])
}
```

### SocialCompetitor (Competitor Tracking)

Track competitor social performance.

```prisma
model SocialCompetitor {
  id              String   @id @default(cuid())
  locationId      String
  
  // Competitor info
  name                String           // Business name
  platform            SocialPlatform
  handle              String           // @username
  profileUrl          String?
  
  // Current metrics (updated on sync)
  followerCount       Int              @default(0)
  followingCount      Int?
  postCount           Int?
  
  // Recent performance
  avgEngagementRate   Decimal?         @db.Decimal(5, 2)
  postsLast30Days     Int?
  avgLikesPerPost     Int?
  avgCommentsPerPost  Int?
  
  // Tracking
  isActive            Boolean          @default(true)
  trackingSince       DateTime         @default(now())
  lastSyncedAt        DateTime?
  
  // Historical data (JSON for simplicity)
  monthlyHistory      Json?            // [{ month, followers, engagementRate }, ...]
  
  location            Location         @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  
  @@unique([locationId, platform, handle])
  @@index([locationId, platform])
}
```

### Social Platform Display Config

```typescript
const socialPlatformConfig = {
  INSTAGRAM: {
    name: 'Instagram',
    color: '#E4405F',
    bgColor: '#FDF2F4',
    icon: 'instagram',
    gradient: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
  },
  FACEBOOK: {
    name: 'Facebook',
    color: '#1877F2',
    bgColor: '#EBF3FE',
    icon: 'facebook',
  },
  TIKTOK: {
    name: 'TikTok',
    color: '#000000',
    bgColor: '#F5F5F5',
    icon: 'music',  // or custom TikTok icon
    accentColor: '#00F2EA',
  },
  TWITTER: {
    name: 'X',
    color: '#000000',
    bgColor: '#F5F5F5',
    icon: 'twitter',
  },
  LINKEDIN: {
    name: 'LinkedIn',
    color: '#0A66C2',
    bgColor: '#E8F1F8',
    icon: 'linkedin',
  },
  YOUTUBE: {
    name: 'YouTube',
    color: '#FF0000',
    bgColor: '#FFEBEE',
    icon: 'youtube',
  },
  GOOGLE_BUSINESS: {
    name: 'Google Business',
    color: '#4285F4',
    bgColor: '#E8F0FE',
    icon: 'map-pin',
  },
  PINTEREST: {
    name: 'Pinterest',
    color: '#E60023',
    bgColor: '#FDEAED',
    icon: 'pin',
  },
};

const socialProviderConfig = {
  SPROUT_SOCIAL: {
    name: 'Sprout Social',
    color: '#59CB59',
    icon: 'sprout',
    website: 'https://sproutsocial.com',
  },
  METRICOOL: {
    name: 'Metricool',
    color: '#00C4B4',
    icon: 'bar-chart',
    website: 'https://metricool.com',
  },
  HOOTSUITE: {
    name: 'Hootsuite',
    color: '#143059',
    icon: 'owl',
    website: 'https://hootsuite.com',
  },
  BUFFER: {
    name: 'Buffer',
    color: '#231F20',
    icon: 'layers',
    website: 'https://buffer.com',
  },
  LATER: {
    name: 'Later',
    color: '#F5A5B8',
    icon: 'clock',
    website: 'https://later.com',
  },
  MANUAL: {
    name: 'Manual Entry',
    color: '#6B7280',
    icon: 'edit',
  },
};
```

### PRConfig (Settings per Location)

```prisma
model PRConfig {
  id              String   @id @default(cuid())
  locationId      String   @unique
  
  // Agency/provider info
  agencyName          String?      // e.g., "Milestone PR"
  agencyContactEmail  String?
  agencyContactPhone  String?
  
  // Monitoring tool integration (future)
  cisionApiKey        String?
  meltwaterApiKey     String?
  
  // Import settings
  allowCsvImport      Boolean      @default(true)
  lastImportAt        DateTime?
  
  // Notification settings
  notifyOnNewMention  Boolean      @default(true)
  notifyOnHighAVE     Boolean      @default(true)
  highAVEThreshold    Decimal?     @db.Decimal(10, 2)  // Alert when AVE exceeds this
  
  location            Location     @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
}
```

### MediaMention (Individual Press Coverage)

Individual press coverage, media appearances, and mentions.

```prisma
model MediaMention {
  id              String   @id @default(cuid())
  locationId      String
  
  // Basic info
  headline            String           // Article/segment title
  outlet              String           // e.g., "KSAT-TV", "San Antonio Magazine"
  outletType          MediaType
  
  // Dates
  publishedAt         DateTime         // When aired/published
  fetchedAt           DateTime?        // When we learned about it
  
  // Reach metrics
  uvm                 Int?             // Unique Visitors Monthly for outlet
  ave                 Decimal?         @db.Decimal(10, 2)  // Advertising Value Equivalent
  
  // Engagement (if available)
  totalEngagement     Int?             // Social shares, comments, etc.
  journalistReach     Int?             // Journalist's social following
  journalistShares    Int?             // Shares by journalist
  
  // Content
  link                String?          // URL to article/video
  description         String?          @db.Text  // Summary or excerpt
  imageUrl            String?          // Screenshot or thumbnail
  
  // Journalist info
  journalistName      String?
  journalistEmail     String?
  journalistOutlet    String?          // May differ from outlet (freelancer)
  
  // Categorization
  sentiment           Sentiment?       @default(POSITIVE)
  topics              String[]         // e.g., ["chef feature", "new menu", "event"]
  campaign            String?          // Link to PR campaign if applicable
  
  // Location mentions (for multi-location coverage)
  mentionedLocations  String[]         // Location IDs mentioned in article
  isPrimary           Boolean          @default(true)  // Primary focus of article?
  
  // Status
  status              MentionStatus    @default(ACTIVE)
  isHighlight         Boolean          @default(false)  // Featured in monthly report
  
  // Internal notes
  internalNotes       String?          @db.Text
  
  // Import tracking
  importSource        ImportSource     @default(MANUAL)
  externalId          String?          // ID from Cision/Meltwater if imported
  
  // Sync metadata
  syncedAt            DateTime?
  syncStatus          SyncStatus       @default(SUCCESS)
  
  location            Location         @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  
  @@index([locationId, publishedAt])
  @@index([locationId, outletType])
  @@index([locationId, isHighlight])
}

enum MediaType {
  TV
  PRINT
  ONLINE
  PODCAST
  RADIO
  SOCIAL
  OTHER
}

enum MentionStatus {
  ACTIVE
  ARCHIVED
  FLAGGED
}

enum ImportSource {
  MANUAL
  CSV_IMPORT
  CISION
  MELTWATER
  RSS
  OTHER
}
```

### MediaMentionSnapshot (Monthly PR Aggregates)

Monthly snapshots of PR/media metrics.

```prisma
model MediaMentionSnapshot {
  id              String   @id @default(cuid())
  locationId      String
  month           String   // 'YYYY-MM' format
  
  // Mention counts
  totalMentions       Int      @default(0)
  tvMentions          Int      @default(0)
  printMentions       Int      @default(0)
  onlineMentions      Int      @default(0)
  podcastMentions     Int      @default(0)
  radioMentions       Int      @default(0)
  socialMentions      Int      @default(0)
  
  // Reach metrics
  totalUVM            BigInt?              // Sum of all outlet UVMs
  averageUVM          Int?                 // Average UVM per mention
  totalAVE            Decimal? @db.Decimal(12, 2)  // Sum of all AVEs
  
  // Engagement
  totalEngagement     Int?
  averageEngagement   Int?
  
  // Journalist metrics
  totalJournalistReach    Int?
  totalJournalistShares   Int?
  
  // Sentiment breakdown
  positiveMentions    Int      @default(0)
  neutralMentions     Int      @default(0)
  negativeMentions    Int      @default(0)
  
  // Highlights
  highlightCount      Int      @default(0)  // Mentions marked as highlights
  topOutlet           String?              // Outlet with most mentions
  topMentionId        String?              // Highest AVE mention this month
  
  // Change from prior month
  mentionsChange      Int?
  aveChange           Decimal? @db.Decimal(5, 2)  // % change
  
  // Targets
  mentionsTarget      Int?
  aveTarget           Decimal? @db.Decimal(12, 2)
  
  // Sync metadata
  syncedAt            DateTime
  syncStatus          SyncStatus @default(SUCCESS)
  
  location            Location @relation(fields: [locationId], references: [id])
  
  @@unique([locationId, month])
  @@index([locationId, month])
}
```

### Award (Awards & Accolades)

Track awards, nominations, and accolades.

```prisma
model Award {
  id              String   @id @default(cuid())
  locationId      String
  
  // Award info
  name                String           // e.g., "Best Chef Texas"
  organization        String           // e.g., "James Beard Foundation"
  category            String?          // e.g., "Regional Chef"
  
  // Status
  status              AwardStatus      @default(NOMINATED)
  
  // Dates
  nominatedAt         DateTime?
  awardedAt           DateTime?
  announcedAt         DateTime?
  year                Int              // Award year (e.g., 2025)
  
  // Details
  description         String?          @db.Text
  link                String?          // Link to announcement
  imageUrl            String?          // Award logo or photo
  
  // Recipient
  recipientType       RecipientType    @default(RESTAURANT)
  recipientName       String?          // Chef name if individual award
  
  // Display
  displayOnWebsite    Boolean          @default(true)
  displayOrder        Int              @default(0)
  isFeatured          Boolean          @default(false)
  
  // Internal
  internalNotes       String?          @db.Text
  applicationDeadline DateTime?
  
  location            Location         @relation(fields: [locationId], references: [id])
  
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  
  @@index([locationId, year])
  @@index([locationId, status])
}

enum AwardStatus {
  APPLIED
  NOMINATED
  SEMIFINALIST
  FINALIST
  WON
  NOT_SELECTED
}

enum RecipientType {
  RESTAURANT
  CHEF
  HOSPITALITY_GROUP
  SOMMELIER
  BARTENDER
  TEAM_MEMBER
  DISH
  BEVERAGE_PROGRAM
  OTHER
}
```

### Award Display Config

```typescript
const awardStatusConfig = {
  APPLIED: {
    name: 'Applied',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'file-text',
  },
  NOMINATED: {
    name: 'Nominated',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    icon: 'award',
  },
  SEMIFINALIST: {
    name: 'Semifinalist',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    icon: 'medal',
  },
  FINALIST: {
    name: 'Finalist',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    icon: 'trophy',
  },
  WON: {
    name: 'Winner',
    color: '#10B981',
    bgColor: '#ECFDF5',
    icon: 'crown',
  },
  NOT_SELECTED: {
    name: 'Not Selected',
    color: '#9CA3AF',
    bgColor: '#F9FAFB',
    icon: 'x-circle',
  },
};

const mediaTypeConfig = {
  TV: {
    name: 'Television',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    icon: 'tv',
  },
  PRINT: {
    name: 'Print',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    icon: 'newspaper',
  },
  ONLINE: {
    name: 'Online',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    icon: 'globe',
  },
  PODCAST: {
    name: 'Podcast',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    icon: 'mic',
  },
  RADIO: {
    name: 'Radio',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    icon: 'radio',
  },
  SOCIAL: {
    name: 'Social Media',
    color: '#14B8A6',
    bgColor: '#F0FDFA',
    icon: 'share-2',
  },
  OTHER: {
    name: 'Other',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'file',
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

## Visibility Page (SEMrush)

### Overview

The Visibility page shows website SEO performance and AI visibility metrics. Website visibility is available on all plans; AI visibility requires Pro plan.

### Page Location

```
/dashboard/visibility
```

### Page Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Visibility                                                    [Month: January 2025 ▼]   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─── WEBSITE VISIBILITY (SEMrush) ───────────────────────────────────────────────┐   │
│  │                                                                                  │   │
│  │  [Summary Cards] [Trend Chart] [Keyword Rankings Table]                         │   │
│  │                                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── MAPS VISIBILITY (BrightLocal) ──────────────────────────────────────────────┐   │
│  │                                                                                  │   │
│  │  [Summary Cards] [Search Grid Heatmap] [Local Rankings Table] [NAP/GBP Health] │   │
│  │                                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── AI VISIBILITY (PRO) ────────────────────────────────────────────────────────┐   │
│  │                                                                                  │   │
│  │  [Upgrade Banner OR Pro Content]                                                │   │
│  │                                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Website Visibility Section (All Plans)

### Summary Cards

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Visibility Score │  │ Est. Traffic     │  │ Keywords Tracked │  │ Top 10 Keywords  │
│      68.5        │  │     2,450        │  │       156        │  │       23         │
│   ▲ +3.2 vs LM   │  │   ▲ +12% vs LM   │  │   ▲ +8 new       │  │   ▲ +4 vs LM     │
│   Target: 75     │  │                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Visibility Score Trend Chart

12-month line chart showing:
- Visibility Score (primary line)
- Target line (dashed)
- Health score box below

### Keyword Rankings Distribution

Horizontal stacked bar or grouped bar showing keyword position distribution:

```
Position 1-3:    ████████░░░░░░░░░░░░░░░░░░  12 keywords
Position 4-10:   ████████████░░░░░░░░░░░░░░  23 keywords  
Position 11-20:  ████████████████░░░░░░░░░░  34 keywords
Position 21-50:  ██████████████████████░░░░  45 keywords
Position 51-100: ████████████████████████░░  42 keywords
```

### Keyword Movement Summary

```
┌────────────────────────────────────────────────────────────────┐
│ Keyword Movement (vs. Last Month)                              │
├────────────────────────────────────────────────────────────────┤
│  ▲ Improved: 34    ▼ Declined: 18    ● Unchanged: 104         │
│  ✚ New: 8          ✕ Lost: 2                                   │
└────────────────────────────────────────────────────────────────┘
```

### Top Keywords Table

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Top Keywords                                                     [View All] [Export CSV] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Keyword                        │ Position │ Change │ Volume │ Traffic │ URL             │
│────────────────────────────────┼──────────┼────────┼────────┼─────────┼─────────────────│
│ san antonio restaurants        │    3     │  ▲ +2  │ 12,100 │   890   │ /               │
│ best brunch san antonio        │    5     │  ▲ +1  │  4,400 │   312   │ /brunch         │
│ craft beer san antonio         │    7     │  ● 0   │  2,900 │   145   │ /beer           │
│ southerleigh restaurant        │    1     │  ● 0   │  1,200 │   720   │ /               │
│ pearl district dining          │   12     │  ▼ -3  │  1,800 │    45   │ /location       │
│ ...                            │          │        │        │         │                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1-10 of 156 keywords                          [← Prev]  Page 1 of 16  [Next →] │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Keyword Table Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| Keyword | Target keyword | Yes |
| Position | Current SERP position | Yes (default asc) |
| Change | Position change vs last sync | Yes |
| Volume | Monthly search volume | Yes |
| Traffic | Estimated monthly clicks | Yes |
| URL | Page ranking for keyword | No |

### Keyword Table Filters

- Search by keyword
- Filter by position range (Top 3, Top 10, Top 20, All)
- Filter by movement (Improved, Declined, New, Lost)
- Sort by position, change, volume, traffic

---

## Maps Visibility Section (BrightLocal)

Track local search rankings across Google Maps, Local Pack, and Local Finder using BrightLocal's Local Search Grid API.

### Summary Cards

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Maps Visibility  │  │ Local Pack       │  │ Avg Grid Rank    │  │ NAP Health       │
│     72.5         │  │   12 / 15        │  │      4.2         │  │     94%          │
│   ▲ +5.2 vs LM   │  │   keywords       │  │   ▲ +0.8 vs LM   │  │   2 issues       │
│   Target: 80     │  │   ▲ +2 vs LM     │  │   (1 = best)     │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

Card definitions:
- **Maps Visibility Score:** Overall local visibility (0-100)
- **Local Pack:** Keywords appearing in Local 3-Pack out of total tracked
- **Avg Grid Rank:** Average position across all grid points for all keywords
- **NAP Health:** NAP consistency score with issue count

### Local Search Grid Heatmap

Visual grid showing rankings across geographic area. This is the key differentiator — shows exactly WHERE you rank well vs poorly.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Local Search Grid                                    Keyword: [best brunch san antonio ▼] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│    ┌─────────────────────────────────────────────────────────────────────────┐         │
│    │                                                                         │         │
│    │    🟢    🟢    🟡    🟡    🔴       Legend:                             │         │
│    │     1     2     5     7    15       🟢 Top 3 (Green)                    │         │
│    │                                     🟡 4-10 (Yellow)                    │         │
│    │    🟢    🟢    🟢    🟡    🟡       🟠 11-20 (Orange)                   │         │
│    │     1     1     2     6     8       🔴 21+ or Not Ranking (Red)        │         │
│    │                                                                         │         │
│    │    🟢    🟢    ⭐    🟢    🟡       ⭐ Your Location                    │         │
│    │     2     1    LOC    1     4                                           │         │
│    │                                                                         │         │
│    │    🟡    🟢    🟢    🟢    🟡       Grid: 5x5 · Radius: 5 miles        │         │
│    │     5     2     1     2     6       Avg Rank: 4.2 · Best: 1            │         │
│    │                                                                         │         │
│    │    🟡    🟡    🟡    🟡    🟠       Coverage: 80% in Top 10            │         │
│    │     7     8     6     9    12                                           │         │
│    │                                                                         │         │
│    └─────────────────────────────────────────────────────────────────────────┘         │
│                                                                                         │
│    [View Full Grid] [Download Screenshot] [Compare to Competitor ▼]                    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Grid Heatmap Features

- **Keyword selector:** Switch between tracked keywords
- **Color coding:** Green (1-3), Yellow (4-10), Orange (11-20), Red (21+/not ranking)
- **Hover on cell:** Shows exact rank, competitors at that location
- **Click on cell:** Opens detailed SERP for that grid point
- **Competitor overlay:** Toggle to see competitor's grid for comparison

### Maps Visibility Trend

Line chart showing Maps Visibility Score over 12 months with target line.

### Local Rankings Table

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Local Keyword Rankings                                                      [+ Add Keyword] [Export CSV] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Search...                    ]  [Position: All ▼]  [Sort: Local Pack ▼]                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Keyword                        │ Local Pack │ Maps  │ Change │ Grid Avg │ Coverage │ vs Best Competitor │
│────────────────────────────────┼────────────┼───────┼────────┼──────────┼──────────┼────────────────────│
│ best brunch san antonio        │    🥇 1    │   1   │  ● 0   │   4.2    │   80%    │  ▲ Ahead (+2)      │
│ restaurants near pearl         │    🥈 2    │   3   │  ▲ +1  │   5.8    │   72%    │  ▲ Ahead (+1)      │
│ craft beer san antonio         │    🥉 3    │   2   │  ▼ -1  │   6.1    │   68%    │  ● Tied            │
│ fine dining san antonio        │     —      │   8   │  ▲ +3  │   9.4    │   45%    │  ▼ Behind (-2)     │
│ happy hour downtown sa         │    🥈 2    │   4   │  ● 0   │   7.2    │   58%    │  ▲ Ahead (+1)      │
│ ...                            │            │       │        │          │          │                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1-10 of 15 keywords                                       [← Prev]  Page 1 of 2  [Next →]      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Local Rankings Table Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| Keyword | Local search keyword | Yes |
| Local Pack | Position in Local 3-Pack (🥇🥈🥉 or —) | Yes |
| Maps | Position in Google Maps | Yes |
| Change | Position change vs last check | Yes |
| Grid Avg | Average rank across grid points | Yes |
| Coverage | % of grid ranking in top 10 | Yes |
| vs Best Competitor | Comparison to top competitor | Filter |

### Row Click → Keyword Detail Drawer

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back                                        [View Grid] [📸] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  "best brunch san antonio"                                   │
│  Last checked: January 24, 2025 at 6:00 AM                   │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  CURRENT RANKINGS                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Local Pack  │  │ Google Maps │  │ Local Finder│           │
│  │     🥇 1    │  │      1      │  │      2      │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  GRID PERFORMANCE                                             │
│  Average Rank: 4.2    Best: 1    Worst: 15                   │
│  Grid Points Ranking: 20 of 25 (80%)                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [Mini heatmap visualization]                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  COMPETITOR COMPARISON                                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Business          │ Pack │ Maps │ Grid Avg │ Coverage   │  │
│  │───────────────────┼──────┼──────┼──────────┼────────────│  │
│  │ ⭐ Southerleigh   │  1   │  1   │   4.2    │    80%     │  │
│  │ Botika            │  3   │  4   │   6.8    │    62%     │  │
│  │ Cured             │  2   │  2   │   5.1    │    74%     │  │
│  │ Battalion         │  —   │  7   │   9.2    │    45%     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  RANKING HISTORY (12 Weeks)                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [Line chart showing Local Pack + Maps position]         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### NAP & GBP Health Panel

Collapsible panel showing NAP consistency and GBP optimization status.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Profile Health                                            [Run Audit] [Last: Jan 20]   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─── NAP CONSISTENCY ─────────────────────────────────────────────────────────────┐   │
│  │                                                                                  │   │
│  │  Overall Score: 94%                                                             │   │
│  │  ████████████████████████████████████████████████░░░░                           │   │
│  │                                                                                  │   │
│  │  Directories Found: 42 of 50 · Correct: 39 · Issues: 3                         │   │
│  │                                                                                  │   │
│  │  Issues Found:                                                                  │   │
│  │  ⚠ Yelp: Old phone number (210-555-0000)                        [Fix →]       │   │
│  │  ⚠ Foursquare: Missing listing                                   [Claim →]     │   │
│  │  ⚠ Yellow Pages: Wrong address (123 Old St)                     [Fix →]       │   │
│  │                                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── GOOGLE BUSINESS PROFILE ─────────────────────────────────────────────────────┐   │
│  │                                                                                  │   │
│  │  Optimization Score: 87%           Completeness: 92%                            │   │
│  │  ████████████████████████████████████████░░░░░░░░                               │   │
│  │                                                                                  │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │   │
│  │  │ Basic Info │ │   Photos   │ │  Reviews   │ │   Posts    │ │    Q&A     │    │   │
│  │  │    95%     │ │    82%     │ │    90%     │ │    75%     │ │    88%     │    │   │
│  │  │     ✓      │ │     ⚠      │ │     ✓      │ │     ⚠      │ │     ✓      │    │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘    │   │
│  │                                                                                  │   │
│  │  Recommendations:                                                               │   │
│  │  📸 Add 5 more photos to match competitor average                              │   │
│  │  📝 Post more frequently (competitors avg 3/week, you: 1/week)                 │   │
│  │                                                                                  │   │
│  │  vs Competitors: Ranked #2 of 5 tracked                                        │   │
│  │                                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## AI Visibility Section (PRO PLAN)

### Non-Pro Users: Upgrade Banner

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           🤖 AI Visibility                                        │  │
│  │                                                                                   │  │
│  │  Track your brand's presence in AI-generated answers from Google AI,             │  │
│  │  ChatGPT, Perplexity, and more.                                                  │  │
│  │                                                                                   │  │
│  │  • See when and how AI mentions your restaurant                                  │  │
│  │  • Track specific prompts like "best brunch in San Antonio"                      │  │
│  │  • Compare your AI visibility to competitors                                     │  │
│  │                                                                                   │  │
│  │                        [Upgrade to Pro →]                                        │  │
│  │                                                                                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │ [Blurred/Greyed preview of AI Visibility charts with sample data]               │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Pro Users: AI Visibility Dashboard

#### Summary Cards

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ AI Visibility    │  │ Brand Mentions   │  │ Avg. Position    │  │ Prompts Tracked  │
│     42.5         │  │       28         │  │      2.3         │  │       15         │
│   ▲ +8.2 vs LM   │  │   ▲ +12 vs LM    │  │   ▲ +0.4 vs LM   │  │   ▲ +3 new       │
│   Target: 50     │  │                  │  │   (1 = best)     │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

#### AI Visibility Score Trend

12-month line chart showing AI Visibility Score over time.

#### Brand Mentions by Platform

Donut or horizontal bar chart:

```
┌────────────────────────────────────────────────────────────────┐
│ Brand Mentions by Platform                                     │
├────────────────────────────────────────────────────────────────┤
│  Google AI:     ████████████████████░░░░░░  18 mentions (64%)  │
│  ChatGPT:       ████████░░░░░░░░░░░░░░░░░░   6 mentions (21%)  │
│  Perplexity:    ███░░░░░░░░░░░░░░░░░░░░░░░   3 mentions (11%)  │
│  Bing Copilot:  █░░░░░░░░░░░░░░░░░░░░░░░░░   1 mention  (4%)   │
└────────────────────────────────────────────────────────────────┘
```

#### Prompt Tracking Table

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Tracked Prompts                                                        [+ Add Prompt] [Export CSV] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Prompt                              │ Platform   │ Mentioned │ Position │ Last Check │ Mention Rate │
│─────────────────────────────────────┼────────────┼───────────┼──────────┼────────────┼──────────────│
│ best restaurants in san antonio    │ Google AI  │    ✓      │    2     │ Jan 24     │     85%      │
│ best restaurants in san antonio    │ ChatGPT    │    ✓      │    3     │ Jan 24     │     72%      │
│ best brunch san antonio            │ Google AI  │    ✓      │    1     │ Jan 24     │     90%      │
│ best brunch san antonio            │ Perplexity │    ✗      │    -     │ Jan 24     │     45%      │
│ craft beer near pearl district     │ Google AI  │    ✓      │    1     │ Jan 24     │     95%      │
│ romantic dinner san antonio        │ ChatGPT    │    ✗      │    -     │ Jan 24     │     30%      │
│ ...                                │            │           │          │            │              │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1-10 of 15 prompts                                      [← Prev]  Page 1 of 2  [Next →]    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Prompt Table Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| Prompt | The search prompt being tracked | Yes |
| Platform | AI platform (Google AI, ChatGPT, etc.) | Filter |
| Mentioned | Was brand mentioned in latest check | Filter |
| Position | Position in AI response (1 = first) | Yes |
| Last Check | Date of last check | Yes |
| Mention Rate | % of checks where brand was mentioned | Yes |

#### Row Click → Prompt Detail Drawer

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back                                        [Edit] [Delete]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  "best restaurants in san antonio"                            │
│  Platform: Google AI                                          │
│  Category: Local Discovery                                    │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  LATEST RESULT                                                │
│  Checked: January 24, 2025 at 6:00 AM                        │
│                                                               │
│  ✓ Brand Mentioned · Position: 2                             │
│                                                               │
│  Mention Context:                                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ "...For upscale dining, Southerleigh Fine Food & Brewery│  │
│  │ in the Pearl District offers craft beers brewed on-site │  │
│  │ alongside refined Southern cuisine..."                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Competitors Also Mentioned:                                  │
│  • Botika (Position 1)                                       │
│  • Cured (Position 3)                                        │
│  • Battalion (Position 4)                                    │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  HISTORY (Last 12 Checks)                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Jan 24  ✓ Pos 2  │  Jan 17  ✓ Pos 2  │  Jan 10  ✓ Pos 3 │  │
│  │ Jan 03  ✓ Pos 3  │  Dec 27  ✗ -      │  Dec 20  ✓ Pos 4 │  │
│  │ Dec 13  ✓ Pos 3  │  Dec 06  ✓ Pos 2  │  Nov 29  ✗ -     │  │
│  │ Nov 22  ✓ Pos 2  │  Nov 15  ✓ Pos 1  │  Nov 08  ✓ Pos 2 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Mention Rate: 85% (10 of 12 checks)                         │
│  Average Position: 2.4                                        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Add Prompt Modal

```
┌───────────────────────────────────────────────────────────────┐
│ Add Tracked Prompt                                    [✕]     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Prompt:                                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ best happy hour san antonio                             │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Platforms to Track:                                          │
│  ☑ Google AI                                                 │
│  ☑ ChatGPT                                                   │
│  ☐ Perplexity                                                │
│  ☐ Bing Copilot                                              │
│                                                               │
│  Category (optional):                                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Happy Hour / Drinks                              [▼]    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Check Frequency:                                             │
│  ○ Daily   ● Weekly   ○ Monthly                              │
│                                                               │
│                              [Cancel]  [Add Prompt]           │
└───────────────────────────────────────────────────────────────┘
```

---

## Visibility Sync Logic

### Website Visibility Sync (Weekly)

**Frequency:** Weekly on Sunday 6:00 AM

**Process:**
1. Call SEMrush Position Tracking API
2. Fetch latest keyword positions for all tracked keywords
3. Calculate visibility score based on positions and search volumes
4. Update KeywordRanking records
5. Create KeywordRankingHistory entries
6. Upsert VisibilitySnapshot for current month

**Visibility Score Calculation:**
```typescript
function calculateVisibilityScore(keywords: KeywordRanking[]): number {
  // SEMrush-style visibility calculation
  // Based on CTR curves and search volume
  
  const ctrByPosition: Record<number, number> = {
    1: 0.316,  // Position 1 gets ~31.6% CTR
    2: 0.158,
    3: 0.106,
    4: 0.078,
    5: 0.063,
    6: 0.051,
    7: 0.044,
    8: 0.038,
    9: 0.034,
    10: 0.031,
    // Positions 11+ get progressively lower
  };
  
  let totalPossibleTraffic = 0;
  let estimatedTraffic = 0;
  
  for (const keyword of keywords) {
    const volume = keyword.searchVolume || 0;
    totalPossibleTraffic += volume * 0.316; // Max possible (position 1)
    
    if (keyword.position && keyword.position <= 100) {
      const ctr = ctrByPosition[keyword.position] || 0.01;
      estimatedTraffic += volume * ctr;
    }
  }
  
  // Score is percentage of maximum possible traffic
  return totalPossibleTraffic > 0 
    ? (estimatedTraffic / totalPossibleTraffic) * 100 
    : 0;
}
```

### AI Visibility Sync (Weekly - Pro Only)

**Frequency:** Weekly on Sunday 6:00 AM (after website visibility)

**Process:**
1. Skip if location is not Pro plan
2. For each tracked prompt in PromptTracking:
   - Call SEMrush AI Visibility API (or custom prompt checker)
   - Parse AI response for brand mentions
   - Record position if mentioned
   - Store mention context snippet
3. Create PromptTrackingHistory entries
4. Upsert AIVisibilitySnapshot for current month

**AI Visibility Score Calculation:**
```typescript
function calculateAIVisibilityScore(prompts: PromptTracking[]): number {
  // Score based on mention rate and position
  
  let totalScore = 0;
  let maxScore = 0;
  
  for (const prompt of prompts) {
    maxScore += 100; // Each prompt worth up to 100 points
    
    if (prompt.brandMentioned && prompt.position) {
      // Position 1 = 100 points, Position 5 = 60 points, etc.
      const positionScore = Math.max(0, 120 - (prompt.position * 20));
      totalScore += positionScore;
    }
  }
  
  return maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
}
```

---

### Maps Visibility Sync (Weekly - BrightLocal)

**Frequency:** Weekly on Sunday 6:00 AM

**Process:**
1. For each location with MapsVisibilityConfig:
   - Call BrightLocal Rankings API for each tracked keyword
   - Store Local Pack, Google Maps, Local Finder positions
   - Record competitor positions
2. For each tracked keyword:
   - Call BrightLocal Local Search Grid API
   - Store grid data (rankings at each coordinate)
   - Calculate coverage metrics
3. Update KeywordLocalRanking records
4. Create LocalSearchGridResult entries
5. Upsert MapsVisibilitySnapshot for current month

**Grid Check Process:**
```typescript
async function runGridCheck(location: MapsVisibilityConfig, keyword: string) {
  const gridConfig = {
    centerLat: location.gridCenterLat,
    centerLng: location.gridCenterLng,
    radius: location.gridRadius, // miles
    gridSize: location.gridSize, // 5x5, 7x7, etc.
  };
  
  // BrightLocal returns rankings at each grid point
  const gridResults = await brightLocal.localSearchGrid({
    keyword,
    ...gridConfig,
    competitors: location.competitors,
  });
  
  // Process results
  const gridData = gridResults.points.map(point => ({
    lat: point.lat,
    lng: point.lng,
    rank: point.rank, // null if not ranking
    inLocalPack: point.inLocalPack,
    competitors: point.competitors, // [{ name, rank }]
  }));
  
  // Calculate aggregates
  const rankedPoints = gridData.filter(p => p.rank !== null);
  const averageRank = rankedPoints.length > 0 
    ? rankedPoints.reduce((sum, p) => sum + p.rank, 0) / rankedPoints.length 
    : null;
  
  const top3Count = gridData.filter(p => p.rank && p.rank <= 3).length;
  const top10Count = gridData.filter(p => p.rank && p.rank <= 10).length;
  const top20Count = gridData.filter(p => p.rank && p.rank <= 20).length;
  
  return {
    gridData,
    averageRank,
    bestRank: Math.min(...rankedPoints.map(p => p.rank)),
    worstRank: Math.max(...rankedPoints.map(p => p.rank)),
    notRankingCount: gridData.length - rankedPoints.length,
    inLocalPackCount: gridData.filter(p => p.inLocalPack).length,
    top3Count,
    top10Count,
    top20Count,
    totalGridPoints: gridData.length,
  };
}
```

**Maps Visibility Score Calculation:**
```typescript
function calculateMapsVisibilityScore(
  keywords: KeywordLocalRanking[],
  grids: LocalSearchGridResult[]
): number {
  // Weighted score based on:
  // - Local Pack presence (40%)
  // - Maps position (30%)
  // - Grid coverage (30%)
  
  let packScore = 0;
  let mapsScore = 0;
  let gridScore = 0;
  
  for (const kw of keywords) {
    // Local Pack: 100 points for position 1, 66 for 2, 33 for 3
    if (kw.localPackPosition) {
      packScore += Math.max(0, 100 - ((kw.localPackPosition - 1) * 33));
    }
    
    // Maps: 100 points for position 1, decreasing
    if (kw.mapsPosition) {
      mapsScore += Math.max(0, 100 - ((kw.mapsPosition - 1) * 5));
    }
  }
  
  // Grid: Based on top 10 coverage
  for (const grid of grids) {
    gridScore += (grid.top10Count / grid.totalGridPoints) * 100;
  }
  
  const maxPack = keywords.length * 100;
  const maxMaps = keywords.length * 100;
  const maxGrid = grids.length * 100;
  
  const normalizedPack = maxPack > 0 ? (packScore / maxPack) * 40 : 0;
  const normalizedMaps = maxMaps > 0 ? (mapsScore / maxMaps) * 30 : 0;
  const normalizedGrid = maxGrid > 0 ? (gridScore / maxGrid) * 30 : 0;
  
  return normalizedPack + normalizedMaps + normalizedGrid;
}
```

---

### NAP Audit Sync (Monthly - BrightLocal)

**Frequency:** Monthly on 1st of month at 8:00 AM

**Process:**
1. Call BrightLocal Citation Tracker API
2. Check NAP consistency across 50+ directories
3. Flag inconsistencies (wrong phone, old address, missing listing)
4. Calculate overall NAP score
5. Create NAPAudit record

**Directories Checked:**
- Google Business Profile
- Yelp, TripAdvisor, OpenTable
- Facebook, Apple Maps, Bing Places
- Yellow Pages, Superpages, Manta
- Industry-specific: Zomato, Foursquare, Urbanspoon
- Local directories

---

### GBP Audit Sync (Monthly - BrightLocal)

**Frequency:** Monthly on 1st of month at 8:00 AM

**Process:**
1. Call BrightLocal GBP Audit API
2. Evaluate profile completeness and optimization
3. Compare to tracked competitors
4. Generate recommendations
5. Create GBPAuditSnapshot record

**Audit Categories:**
- Basic Info (name, category, hours, attributes)
- Photos (count, quality, recency)
- Reviews (count, rating, response rate)
- Posts (frequency, engagement)
- Q&A (questions answered, engagement)
- Attributes (completion rate)

---

## Visibility API Endpoints

### Website Visibility

```typescript
// Get visibility snapshot for month
GET /api/locations/{id}/visibility?month=2025-01

// Get keyword rankings
GET /api/locations/{id}/keywords
  ?page=1
  &pageSize=25
  &search=brunch
  &positionRange=1-10       // "1-3", "4-10", "11-20", "21-50", "51-100", "all"
  &movement=improved        // "improved", "declined", "new", "lost", "unchanged"
  &sortBy=position
  &sortOrder=asc

// Get single keyword with history
GET /api/locations/{id}/keywords/{keywordId}

// Add keyword to track
POST /api/locations/{id}/keywords
{
  keyword: "best tacos san antonio"
}

// Remove keyword from tracking
DELETE /api/locations/{id}/keywords/{keywordId}

// Trigger visibility sync
POST /api/sync/visibility
{
  locationId: string
}
```

### AI Visibility (Pro)

```typescript
// Get AI visibility snapshot for month
GET /api/locations/{id}/ai-visibility?month=2025-01

// Get tracked prompts
GET /api/locations/{id}/prompts
  ?page=1
  &pageSize=25
  &platform=GOOGLE_AI
  &mentioned=true
  &sortBy=mentionRate
  &sortOrder=desc

// Get single prompt with history
GET /api/locations/{id}/prompts/{promptId}

// Add prompt to track
POST /api/locations/{id}/prompts
{
  prompt: "best happy hour san antonio",
  platforms: ["GOOGLE_AI", "CHATGPT"],
  category: "Happy Hour",
  checkFrequency: "WEEKLY"
}

// Update prompt
PATCH /api/locations/{id}/prompts/{promptId}
{
  isActive: false
}

// Delete prompt
DELETE /api/locations/{id}/prompts/{promptId}

// Trigger AI visibility sync (Pro only)
POST /api/sync/ai-visibility
{
  locationId: string
}
```

### Maps Visibility (BrightLocal)

```typescript
// Get maps visibility snapshot for month
GET /api/locations/{id}/maps-visibility?month=2025-01

// Get local keyword rankings
GET /api/locations/{id}/local-keywords
  ?page=1
  &pageSize=25
  &search=brunch
  &localPack=true          // Filter to only Local Pack appearances
  &sortBy=localPackPosition
  &sortOrder=asc

// Get single local keyword details
GET /api/locations/{id}/local-keywords/{keywordId}

// Get grid results for keyword
GET /api/locations/{id}/local-keywords/{keywordId}/grid
  ?checkId=latest          // or specific LocalSearchGridResult ID

// Add local keyword to track
POST /api/locations/{id}/local-keywords
{
  keyword: string
}

// Delete local keyword
DELETE /api/locations/{id}/local-keywords/{keywordId}

// Get NAP audit history
GET /api/locations/{id}/nap-audits
  ?limit=12               // Last 12 audits

// Get single NAP audit details
GET /api/locations/{id}/nap-audits/{auditId}

// Get latest NAP audit
GET /api/locations/{id}/nap-audits/latest

// Get GBP audit history
GET /api/locations/{id}/gbp-audits
  ?limit=12

// Get single GBP audit details
GET /api/locations/{id}/gbp-audits/{auditId}

// Get latest GBP audit
GET /api/locations/{id}/gbp-audits/latest

// Trigger maps visibility sync
POST /api/sync/maps-visibility
{
  locationId: string
}

// Trigger NAP audit
POST /api/sync/nap-audit
{
  locationId: string
}

// Trigger GBP audit
POST /api/sync/gbp-audit
{
  locationId: string
}

// Update maps visibility config
PATCH /api/locations/{id}/maps-config
{
  gridCenterLat?: number,
  gridCenterLng?: number,
  gridRadius?: number,      // miles
  gridSize?: number,        // 5, 7, 9
  competitors?: Array<{ name: string, gbpId?: string, address?: string }>
}

// Get competitor comparison
GET /api/locations/{id}/maps-visibility/competitors?keyword=best+brunch
```

---

## Visibility Data Export

### Website Visibility Export (CSV)

- Keyword
- Current Position
- Previous Position
- Position Change
- Search Volume
- Estimated Traffic
- Traffic Value
- Ranking URL
- Has Featured Snippet
- Tracked Since

### AI Visibility Export (CSV - Pro)

- Prompt
- Platform
- Brand Mentioned
- Position
- Mention Context
- Mention Rate
- Last Checked
- Category

### Maps Visibility Export (CSV)

- Keyword
- Local Pack Position
- Google Maps Position
- Local Finder Position
- Position Change
- Average Grid Rank
- Grid Coverage (%)
- Best Competitor
- Competitor Position
- Last Checked

### NAP Audit Export (CSV)

- Directory
- Listing Found
- Name Match
- Address Match
- Phone Match
- Issues
- Listing URL

---

## Social Media Page

### Overview

The Social Media page shows performance across connected social platforms (Instagram, Facebook, TikTok, etc.). Data is pulled from whichever social management tool the restaurant uses (Sprout Social, Metricool, Hootsuite, etc.) via their APIs.

### Page Location

```
/dashboard/social
```

### Page Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Social Media                                                  [Month: January 2025 ▼]   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─── CONNECTED ACCOUNTS ─────────────────────────────────────────────────────────┐    │
│  │  [IG] @southerleighpearl  [FB] Southerleigh  [TT] @southerleigh  [+ Connect]   │    │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── SUMMARY CARDS ───────────────────────────────────────────────────────────────┐   │
│  │ [Total Followers] [Follower Growth] [Engagement Rate] [Total Reach]             │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── CHARTS ──────────────────────────────────────────────────────────────────────┐   │
│  │ [Follower Growth Trend]  [Engagement by Platform]  [Content Performance]        │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── TOP POSTS ───────────────────────────────────────────────────────────────────┐   │
│  │ [Grid of top performing posts with thumbnails and metrics]                      │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── POST PERFORMANCE TABLE ──────────────────────────────────────────────────────┐   │
│  │ [Full post listing with filters and sorting]                                    │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### No Provider Connected State

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Social Media                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                                   │  │
│  │                        📱 Connect Your Social Media                              │  │
│  │                                                                                   │  │
│  │  Track your restaurant's social media performance across all platforms           │  │
│  │  in one dashboard.                                                               │  │
│  │                                                                                   │  │
│  │  Connect your social management tool:                                            │  │
│  │                                                                                   │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                     │  │
│  │  │  🌱 Sprout     │  │  📊 Metricool  │  │  🦉 Hootsuite  │                     │  │
│  │  │    Social      │  │                │  │                │                     │  │
│  │  │  [Connect]     │  │   [Connect]    │  │   [Connect]    │                     │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘                     │  │
│  │                                                                                   │  │
│  │  ┌────────────────┐  ┌────────────────┐                                         │  │
│  │  │  📦 Buffer     │  │  ⏰ Later      │                                         │  │
│  │  │                │  │                │                                         │  │
│  │  │  [Connect]     │  │   [Connect]    │                                         │  │
│  │  └────────────────┘  └────────────────┘                                         │  │
│  │                                                                                   │  │
│  │  Don't use a social tool? [Enter metrics manually]                              │  │
│  │                                                                                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Connected Accounts Bar

Shows which social profiles are connected and allows quick switching.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Connected via Sprout Social                                    [⚙ Manage Connection]   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐   │
│  │ 📸 Instagram     │  │ 📘 Facebook      │  │ 🎵 TikTok        │  │               │   │
│  │ @southerleigh    │  │ Southerleigh     │  │ @southerleigh    │  │  + Connect    │   │
│  │ 12.4K followers  │  │ 8.2K followers   │  │ 5.1K followers   │  │    Account    │   │
│  │ ✓ Active         │  │ ✓ Active         │  │ ✓ Active         │  │               │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └───────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Summary Cards

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Total Followers  │  │ Follower Growth  │  │ Engagement Rate  │  │ Total Reach      │
│    25,700        │  │    +1,240        │  │     4.8%         │  │    142.5K        │
│ across 3 accounts│  │   ▲ +5.1% vs LM  │  │   ▲ +0.6% vs LM  │  │   ▲ +18% vs LM   │
│                  │  │                  │  │   Target: 5.0%   │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

Card definitions:
- **Total Followers:** Sum across all connected platforms
- **Follower Growth:** Net new followers this period
- **Engagement Rate:** (Engagements / Reach) × 100
- **Total Reach:** Unique accounts reached

---

### Platform Breakdown Cards (Below Summary)

Show per-platform snapshot:

```
┌────────────────────────────────────┐  ┌────────────────────────────────────┐
│ 📸 Instagram           @southerleigh│  │ 📘 Facebook           Southerleigh│
├────────────────────────────────────┤  ├────────────────────────────────────┤
│ Followers    12,400    ▲ +420      │  │ Followers    8,200     ▲ +180      │
│ Posts             8                │  │ Posts             5                │
│ Reels             4                │  │ Videos            2                │
│ Engagement    5.2%     ▲ +0.8%     │  │ Engagement    3.1%     ▼ -0.2%     │
│ Reach        89.2K     ▲ +22%      │  │ Reach        32.1K     ▲ +8%       │
└────────────────────────────────────┘  └────────────────────────────────────┘

┌────────────────────────────────────┐
│ 🎵 TikTok             @southerleigh│
├────────────────────────────────────┤
│ Followers    5,100     ▲ +640      │
│ Videos            6                │
│ Engagement    8.4%     ▲ +1.2%     │
│ Views       245.8K     ▲ +45%      │
└────────────────────────────────────┘
```

---

### Charts

#### Follower Growth Trend (12 Months)

Line chart with one line per platform, showing follower count over time.

```
Followers │
   15K    │                         ──── Instagram
   12K    │                    ╱────────
   10K    │              ╱────╱         ─── Facebook
    8K    │        ╱────╱──────────────
    5K    │  ╱────╱──────────          ─── TikTok
    3K    │╱──────
         │────────────────────────────────────────
         │ Feb  Mar  Apr  May  Jun  Jul  Aug ...
```

#### Engagement by Platform (Bar Chart)

Comparative bar chart showing engagement rate by platform.

```
        │
  8%    │              ████
  6%    │        ████  ████
  4%    │  ████  ████  ████
  2%    │  ████  ████  ████
        │──────────────────────
           IG     FB    TikTok
```

#### Content Type Performance (Stacked Bar or Donut)

Shows which content types drive most engagement.

```
┌────────────────────────────────────────────────────────────────┐
│ Content Type Performance                                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   Reels      ████████████████████████████████  45%            │
│   Carousels  █████████████████████  28%                       │
│   Single     ██████████████  18%                              │
│   Stories    ███████  9%                                       │
│                                                                │
│   Based on average engagement rate                            │
└────────────────────────────────────────────────────────────────┘
```

---

### Top Posts Grid

Visual grid showing top performing posts for the period.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Top Posts This Month                                          [View All Posts]         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  [Thumbnail]    │  │  [Thumbnail]    │  │  [Thumbnail]    │  │  [Thumbnail]    │   │
│  │                 │  │                 │  │                 │  │                 │   │
│  │  📸 Reel        │  │  📸 Carousel    │  │  🎵 Video       │  │  📸 Post        │   │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤   │
│  │ ❤️ 1,247        │  │ ❤️ 892         │  │ ❤️ 2,341        │  │ ❤️ 654         │   │
│  │ 💬 89  🔗 156   │  │ 💬 67  🔗 45   │  │ 💬 234  🔗 189  │  │ 💬 34  🔗 23   │   │
│  │ 8.2% eng rate   │  │ 6.4% eng rate   │  │ 12.1% eng rate  │  │ 5.8% eng rate   │   │
│  │ Jan 15          │  │ Jan 12          │  │ Jan 8           │  │ Jan 22          │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Post Performance Table

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ All Posts                                                                              [Export CSV]   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Search caption...    ]  [Platform: All ▼]  [Type: All ▼]  [Date: This Month ▼]  [Sort: Eng ▼]    │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   │ Date    │ Platform │ Type     │ Caption (truncated)          │ Likes │ Comments │ Reach │ Eng%  │
│───┼─────────┼──────────┼──────────┼──────────────────────────────┼───────┼──────────┼───────┼───────│
│ 🔥│ Jan 15  │ 📸 IG    │ Reel     │ Sunday brunch vibes 🥂...    │ 1,247 │    89    │ 15.2K │ 8.2%  │
│   │ Jan 12  │ 📸 IG    │ Carousel │ New spring menu dropping... │   892 │    67    │ 13.9K │ 6.4%  │
│ 🔥│ Jan 8   │ 🎵 TT    │ Video    │ POV: You're the oyster...   │ 2,341 │   234    │ 19.4K │ 12.1% │
│   │ Jan 22  │ 📸 IG    │ Post     │ Chef Laurent with the...    │   654 │    34    │ 11.2K │ 5.8%  │
│   │ Jan 18  │ 📘 FB    │ Post     │ Happy Hour starts at 4...   │   234 │    12    │  4.8K │ 5.1%  │
│   │ ...     │          │          │                              │       │          │       │       │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1-10 of 23 posts                                        [← Prev]  Page 1 of 3  [Next →]      │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

🔥 = Top performer (top 10% engagement)
```

### Table Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| 🔥 | Top performer indicator | Filter |
| Date | Published date | Yes (default desc) |
| Platform | Social platform with icon | Filter |
| Type | Post type (Reel, Carousel, etc.) | Filter |
| Caption | Truncated caption | Search |
| Likes | Like count | Yes |
| Comments | Comment count | Yes |
| Reach | Unique accounts reached | Yes |
| Eng% | Engagement rate | Yes |

### Row Click → Post Detail Drawer

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back                                         [View on IG →] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │                    [Post Image/Video]                   │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  📸 Instagram · Reel · January 15, 2025 at 11:30 AM          │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  CAPTION                                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Sunday brunch vibes 🥂 Nothing beats a mimosa flight    │  │
│  │ and our famous crab cake benedict. Book your table →    │  │
│  │ link in bio                                             │  │
│  │                                                         │  │
│  │ #SanAntonioBrunch #PearlDistrict #SundayFunday         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  PERFORMANCE                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Likes       │  │ Comments    │  │ Shares      │           │
│  │   1,247     │  │     89      │  │    156      │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Saves       │  │ Reach       │  │ Impressions │           │
│  │    312      │  │   15,200    │  │   18,450    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                               │
│  Engagement Rate: 8.2%  ▲ +2.4% vs avg                       │
│  🔥 Top 10% performer                                        │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  HASHTAGS USED                                                │
│  #SanAntonioBrunch (used 12x, 5.8% avg eng)                  │
│  #PearlDistrict (used 8x, 6.2% avg eng)                      │
│  #SundayFunday (used 4x, 7.1% avg eng)                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### Hashtag Performance Section (Collapsible)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Hashtag Performance                                              [+ Track Hashtag]     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  Branded Hashtags                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ #Southerleigh          Used 24x     Avg Eng: 5.8%     Posts tagged: 1,247       │  │
│  │ #SoutherleighPearl     Used 18x     Avg Eng: 6.2%     Posts tagged: 342         │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  Top Performing Hashtags (by engagement when used)                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Hashtag              │ Times Used │ Avg Engagement │ Avg Reach │ Category       │   │
│  │──────────────────────┼────────────┼────────────────┼───────────┼────────────────│   │
│  │ #SanAntonioBrunch    │     12     │     6.8%       │   12.4K   │ Local          │   │
│  │ #PearlDistrict       │      8     │     6.2%       │   11.1K   │ Location       │   │
│  │ #TexasFoodie         │      6     │     5.9%       │   14.2K   │ Food           │   │
│  │ #CraftBeer           │      5     │     5.4%       │    9.8K   │ Beverage       │   │
│  │ #BrunchGoals         │      4     │     7.1%       │   15.6K   │ Food           │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Competitor Comparison Section (Optional, Collapsible)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Competitor Tracking                                           [+ Add Competitor]       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  Instagram Comparison                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Account            │ Followers │ Growth │ Posts/Mo │ Engagement │ vs You        │   │
│  │────────────────────┼───────────┼────────┼──────────┼────────────┼───────────────│   │
│  │ ⭐ @southerleigh   │   12.4K   │ +3.5%  │     8    │    5.2%    │      —        │   │
│  │ @caborestaurant    │   15.2K   │ +2.1%  │    12    │    4.1%    │ ▲ More eng    │   │
│  │ @botikasa          │    8.9K   │ +4.2%  │     6    │    5.8%    │ ▼ Less eng    │   │
│  │ @cureddining       │   11.1K   │ +1.8%  │     9    │    4.5%    │ ▲ More eng    │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  [View detailed comparison →]                                                          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Social Media Sync Logic

### Provider Sync (Daily at 7:00 AM)

**Frequency:** Daily

**Process:**
1. For each location with SocialMediaConfig:
   - Authenticate with provider (Sprout, Metricool, etc.)
   - Refresh OAuth tokens if needed
2. For each connected SocialProfile:
   - Fetch current follower counts
   - Fetch posts published since last sync
   - Fetch engagement metrics for recent posts
   - Update existing post metrics
3. Create/update SocialPost records
4. Update SocialProfile follower counts
5. Recalculate SocialSnapshot for current month

### Snapshot Calculation (End of Day)

```typescript
async function calculateSocialSnapshot(
  profile: SocialProfile,
  month: string
): Promise<SocialSnapshot> {
  const posts = await getPostsForMonth(profile.id, month);
  
  // Aggregate metrics
  const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
  const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);
  const totalSaves = posts.reduce((sum, p) => sum + (p.saves || 0), 0);
  const totalReach = posts.reduce((sum, p) => sum + (p.reach || 0), 0);
  
  // Calculate engagement rate
  const totalEngagements = totalLikes + totalComments + totalShares + totalSaves;
  const engagementRate = totalReach > 0 
    ? (totalEngagements / totalReach) * 100 
    : 0;
  
  // Content breakdown
  const feedPosts = posts.filter(p => p.postType === 'FEED_POST').length;
  const reels = posts.filter(p => p.postType === 'REEL').length;
  const stories = posts.filter(p => p.postType === 'STORY').length;
  const videos = posts.filter(p => p.postType === 'VIDEO').length;
  
  // Find top post
  const topPost = posts.reduce((top, p) => 
    p.engagementTotal > (top?.engagementTotal || 0) ? p : top
  , null);
  
  return {
    profileId: profile.id,
    month,
    platform: profile.platform,
    followerCount: profile.followerCount,
    totalPosts: posts.length,
    totalLikes,
    totalComments,
    totalShares,
    totalSaves,
    totalReach,
    engagementRate,
    feedPosts,
    reels,
    stories,
    videos,
    topPostId: topPost?.id,
    topPostEngagement: topPost?.engagementTotal,
  };
}
```

### Provider-Specific Adapters

```typescript
interface SocialProviderAdapter {
  authenticate(config: SocialMediaConfig): Promise<AuthTokens>;
  getProfiles(config: SocialMediaConfig): Promise<SocialProfileData[]>;
  getPosts(profileId: string, since: Date): Promise<SocialPostData[]>;
  getPostMetrics(postIds: string[]): Promise<PostMetrics[]>;
  getCompetitors?(handles: string[]): Promise<CompetitorData[]>;
}

// Implementations
class SproutSocialAdapter implements SocialProviderAdapter { ... }
class MetricoolAdapter implements SocialProviderAdapter { ... }
class HootsuiteAdapter implements SocialProviderAdapter { ... }
```

---

## Social Media API Endpoints

### Connection & Config

```typescript
// Get social media config
GET /api/locations/{id}/social-config

// Connect provider (initiates OAuth flow)
POST /api/locations/{id}/social-config/connect
{
  provider: SocialProvider  // "SPROUT_SOCIAL", "METRICOOL", etc.
}
// Returns: { redirectUrl: string } for OAuth

// OAuth callback
GET /api/auth/social/{provider}/callback?code=xxx&state=xxx

// Disconnect provider
DELETE /api/locations/{id}/social-config/disconnect

// Get connected profiles
GET /api/locations/{id}/social-profiles

// Sync profiles from provider
POST /api/locations/{id}/social-profiles/sync
```

### Snapshots & Analytics

```typescript
// Get monthly snapshot (aggregated across all platforms)
GET /api/locations/{id}/social-snapshots?month=2025-01

// Get snapshot for specific platform
GET /api/locations/{id}/social-snapshots?month=2025-01&platform=INSTAGRAM

// Get historical snapshots (12 months)
GET /api/locations/{id}/social-snapshots/history
  ?platform=INSTAGRAM
  &months=12
```

### Posts

```typescript
// Get posts
GET /api/locations/{id}/social-posts
  ?page=1
  &pageSize=25
  &platform=INSTAGRAM
  &postType=REEL
  &dateFrom=2025-01-01
  &dateTo=2025-01-31
  &topPerformers=true
  &sortBy=engagementRate
  &sortOrder=desc

// Get single post
GET /api/locations/{id}/social-posts/{postId}

// Get top posts for period
GET /api/locations/{id}/social-posts/top
  ?period=month
  &limit=10
```

### Hashtags

```typescript
// Get hashtag performance
GET /api/locations/{id}/social-hashtags
  ?sortBy=avgEngagementRate
  &limit=20

// Track new hashtag
POST /api/locations/{id}/social-hashtags
{
  hashtag: string,
  category?: string,
  isOwned?: boolean
}

// Delete tracked hashtag
DELETE /api/locations/{id}/social-hashtags/{hashtagId}
```

### Competitors

```typescript
// Get competitors
GET /api/locations/{id}/social-competitors
  ?platform=INSTAGRAM

// Add competitor
POST /api/locations/{id}/social-competitors
{
  name: string,
  platform: SocialPlatform,
  handle: string
}

// Remove competitor
DELETE /api/locations/{id}/social-competitors/{competitorId}
```

### Manual Sync

```typescript
// Trigger manual sync
POST /api/sync/social
{
  locationId: string
}
```

---

## Social Media Data Export

### Social Snapshot Export (CSV)

- Month
- Platform
- Followers
- Follower Change
- Posts
- Likes
- Comments
- Shares
- Saves
- Reach
- Impressions
- Engagement Rate

### Social Posts Export (CSV)

- Post ID
- Platform
- Post Type
- Published Date
- Caption
- Hashtags
- Likes
- Comments
- Shares
- Saves
- Reach
- Impressions
- Engagement Rate
- Post URL

---

## PR & Marketing Page

### Overview

The PR & Marketing page shows press coverage, media mentions, and awards. Data can be entered manually, imported via CSV from PR agencies, or integrated with monitoring tools (Cision, Meltwater) in the future.

### Page Location

```
/dashboard/pr
```

### Page Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ PR & Marketing                                                [Month: November 2025 ▼]  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─── SUMMARY CARDS ───────────────────────────────────────────────────────────────┐   │
│  │ [Media Mentions] [Total Reach (UVM)] [Total AVE] [Engagement]                   │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── CHARTS ──────────────────────────────────────────────────────────────────────┐   │
│  │ [Mentions Over Time]  [Reach by Media Type]  [AVE Trend]                        │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── MEDIA MENTIONS TABLE ────────────────────────────────────────────────────────┐   │
│  │ [Search] [Filter: Type] [Filter: Date] [+ Add Mention] [Import CSV]             │   │
│  │ [Table with individual media coverage]                                           │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─── AWARDS & ACCOLADES ──────────────────────────────────────────────────────────┐   │
│  │ [Awards list with status badges]                                [+ Add Award]   │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## PR Summary Cards

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Media Mentions   │  │ Total Reach      │  │ Total AVE        │  │ Engagement       │
│      15          │  │    20.49M        │  │   $189,617       │  │      50          │
│   ▲ +3 vs LM     │  │   ▲ +15% vs LM   │  │   ▲ +22% vs LM   │  │   ▲ +12 vs LM    │
│                  │  │                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

Card definitions:
- **Media Mentions:** Count of press coverage items this period
- **Total Reach (UVM):** Sum of Unique Visitors Monthly across all outlets
- **Total AVE:** Advertising Value Equivalent (what equivalent ad spend would cost)
- **Engagement:** Total social engagement (shares, comments, etc.)

---

## PR Charts

### Mentions Over Time (12 Months)

Line or bar chart showing monthly media mention counts.

```
Mentions │
    20   │                    ██
    15   │          ██  ██    ██  ██
    10   │    ██    ██  ██    ██  ██    ██
     5   │    ██    ██  ██    ██  ██    ██    ██
     0   │────██────██──██────██──██────██────██─────
         │   Jan   Feb  Mar  Apr  May  Jun  Jul ...
```

### Reach by Media Type (Donut Chart)

```
┌────────────────────────────────────────────────────────────────┐
│ Reach by Media Type                                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│         ████████████                                           │
│       ██            ██          TV:      12.5M (61%)          │
│     ██      61%       ██        Online:   5.2M (25%)          │
│    ██                  ██       Print:    2.1M (10%)          │
│     ██                ██        Podcast:  0.7M (4%)           │
│       ██            ██                                         │
│         ████████████                                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### AVE Trend (12 Months)

Line chart showing monthly AVE values with cumulative YTD line.

---

## Media Mentions Table

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Media Coverage                                            [+ Add Mention] [Import CSV] [Export CSV] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Search...                    ]  [Type: All ▼]  [Date: This Month ▼]  [Sort: Date ▼]            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ★ │ Date       │ Type   │ Outlet              │ Headline                           │ UVM    │ AVE      │
│───┼────────────┼────────┼─────────────────────┼────────────────────────────────────┼────────┼──────────│
│ ★ │ Nov 4      │ 📺 TV  │ KSAT-TV             │ SA Live: Culinary journey through  │ 1.06M  │ $9,802   │
│   │            │        │                     │ France at Brasserie Mon Chou Chou  │        │          │
│───┼────────────┼────────┼─────────────────────┼────────────────────────────────────┼────────┼──────────│
│   │ Nov 4      │ 📺 TV  │ KSAT-TV             │ Take a trip to France without      │ 1.06M  │ $9,802   │
│   │            │        │                     │ leaving Texas                      │        │          │
│───┼────────────┼────────┼─────────────────────┼────────────────────────────────────┼────────┼──────────│
│   │ Nov 1      │ 📰 Print│ Arts Culture Fun   │ Brasserie Mon Chou Chou: Chef      │ 30K    │ $2,150   │
│   │            │        │                     │ Laurent Réa                        │        │          │
│───┼────────────┼────────┼─────────────────────┼────────────────────────────────────┼────────┼──────────│
│   │ Oct 28     │ 🌐 Online│ SA Monthly        │ Chef of the Month Feature          │ 148K   │ $4,500   │
│───┼────────────┼────────┼─────────────────────┼────────────────────────────────────┼────────┼──────────│
│   │ ...        │        │                     │                                    │        │          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1-10 of 15 mentions                                   [← Prev]  Page 1 of 2  [Next →]      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Table Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| ★ | Highlight indicator (featured) | Filter |
| Date | Publish/air date | Yes (default desc) |
| Type | Media type with icon | Filter |
| Outlet | Publication/station name | Yes |
| Headline | Article/segment title | Search |
| UVM | Unique Visitors Monthly | Yes |
| AVE | Advertising Value Equivalent | Yes |

### Table Filters

- Search by headline, outlet, journalist
- Filter by media type (TV, Print, Online, Podcast, Radio, Social)
- Filter by date range
- Filter by highlight status
- Sort by date, UVM, AVE

### Row Click → Mention Detail Drawer

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back                              [Edit] [★ Highlight] [🗑] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  📺 KSAT-TV                                                   │
│  November 4, 2025 · 10:00 AM CT                              │
│                                                               │
│  SA Live: Take a culinary journey through France at          │
│  Brasserie Mon Chou Chou                                     │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  METRICS                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ UVM         │  │ AVE         │  │ Engagement  │           │
│  │ 1,059,643   │  │ $9,801.70   │  │ 20          │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  DETAILS                                                      │
│                                                               │
│  Journalist: N/A (Live TV segment)                           │
│  Topics: Chef Feature, French Cuisine, Pearl District        │
│  Sentiment: Positive                                          │
│  Campaign: Passport to France                                 │
│                                                               │
│  Locations Mentioned:                                         │
│  • Brasserie Mon Chou Chou (Primary)                         │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  DESCRIPTION                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Chef Laurent Réa showcased the "Passport to France"     │  │
│  │ regional dining experience, featuring dishes from the   │  │
│  │ Loire Valley paired with wines selected by the          │  │
│  │ sommelier and maître d'.                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  [🔗 View Coverage]                                          │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  INTERNAL NOTES                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Great segment! Consider inviting hosts back for         │  │
│  │ holiday menu feature.                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Add/Edit Media Mention Modal

```
┌───────────────────────────────────────────────────────────────┐
│ Add Media Mention                                     [✕]     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Headline: *                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ SA Live: Culinary journey through France               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Outlet: *                        Media Type: *               │
│  ┌─────────────────────────┐      ┌───────────────────────┐  │
│  │ KSAT-TV                 │      │ Television        [▼] │  │
│  └─────────────────────────┘      └───────────────────────┘  │
│                                                               │
│  Published Date: *                Published Time:             │
│  ┌─────────────────────────┐      ┌───────────────────────┐  │
│  │ 2025-11-04              │      │ 10:00 AM              │  │
│  └─────────────────────────┘      └───────────────────────┘  │
│                                                               │
│  Link:                                                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ https://www.ksat.com/sa-live/...                        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ── METRICS ──────────────────────────────────────────────   │
│                                                               │
│  UVM (Unique Visitors):           AVE ($):                   │
│  ┌─────────────────────────┐      ┌───────────────────────┐  │
│  │ 1059643                 │      │ 9801.70               │  │
│  └─────────────────────────┘      └───────────────────────┘  │
│                                                               │
│  Total Engagement:                                            │
│  ┌─────────────────────────┐                                 │
│  │ 20                      │                                 │
│  └─────────────────────────┘                                 │
│                                                               │
│  ── JOURNALIST ───────────────────────────────────────────   │
│                                                               │
│  Name:                            Email:                      │
│  ┌─────────────────────────┐      ┌───────────────────────┐  │
│  │                         │      │                       │  │
│  └─────────────────────────┘      └───────────────────────┘  │
│                                                               │
│  ── CATEGORIZATION ───────────────────────────────────────   │
│                                                               │
│  Topics (comma-separated):                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Chef Feature, French Cuisine, Pearl District           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Campaign:                        Sentiment:                  │
│  ┌─────────────────────────┐      ┌───────────────────────┐  │
│  │ Passport to France      │      │ Positive          [▼] │  │
│  └─────────────────────────┘      └───────────────────────┘  │
│                                                               │
│  Description:                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Chef Laurent Réa showcased the regional dining...       │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ☑ Mark as Highlight (featured in monthly report)            │
│                                                               │
│                              [Cancel]  [Save Mention]         │
└───────────────────────────────────────────────────────────────┘
```

---

## CSV Import Modal

```
┌───────────────────────────────────────────────────────────────┐
│ Import Media Mentions                                 [✕]     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Import media mentions from a CSV file exported from your    │
│  PR agency or monitoring tool.                               │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │     📄 Drop CSV file here or click to browse           │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Expected columns:                                            │
│  • headline (required)                                        │
│  • outlet (required)                                          │
│  • published_date (required, YYYY-MM-DD)                     │
│  • media_type (TV, Print, Online, Podcast, Radio, Social)    │
│  • uvm                                                        │
│  • ave                                                        │
│  • link                                                       │
│  • journalist_name                                            │
│  • description                                                │
│                                                               │
│  [📥 Download Template]                                       │
│                                                               │
│  ── IMPORT PREVIEW ───────────────────────────────────────   │
│  (Shows after file upload)                                    │
│                                                               │
│  Found 12 mentions to import                                  │
│  • 3 TV mentions                                              │
│  • 5 Online mentions                                          │
│  • 4 Print mentions                                           │
│                                                               │
│  ⚠ 2 rows have missing required fields (will be skipped)     │
│                                                               │
│                              [Cancel]  [Import 12 Mentions]   │
└───────────────────────────────────────────────────────────────┘
```

---

## Awards & Accolades Section

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Awards & Accolades                                                        [+ Add Award] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  2025                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 🏆 FSR America Top 50 Independent Restaurant                          [WON]     │   │
│  │    FSR Magazine · Announced May 2025                                            │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │ ⭐ The MICHELIN Guide Texas                                        [NOMINATED]   │   │
│  │    MICHELIN · Announcement November 2025                                        │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │ 🏅 Best Chef Texas                                                  [APPLIED]    │   │
│  │    James Beard Foundation · Aaron Bludorn · 2026 Award Cycle                    │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │ 🏅 Outstanding Restaurateur                                         [APPLIED]    │   │
│  │    James Beard Foundation · Hospitality Group · 2026 Award Cycle               │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │ 🏅 Outstanding Hospitality                                          [APPLIED]    │   │
│  │    James Beard Foundation · Mon Chou Chou · 2026 Award Cycle                   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  2024                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 🏆 Best Brunch in San Antonio                                        [WON]      │   │
│  │    San Antonio Current · Reader's Choice · Announced March 2024                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Award Status Badges

| Status | Badge | Color |
|--------|-------|-------|
| Applied | [APPLIED] | Gray |
| Nominated | [NOMINATED] | Blue |
| Semifinalist | [SEMIFINALIST] | Purple |
| Finalist | [FINALIST] | Amber |
| Won | [WON] | Green |
| Not Selected | [NOT SELECTED] | Gray (muted) |

### Add Award Modal

```
┌───────────────────────────────────────────────────────────────┐
│ Add Award                                             [✕]     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Award Name: *                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Best Chef Texas                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Organization: *                  Year: *                     │
│  ┌─────────────────────────┐      ┌───────────────────────┐  │
│  │ James Beard Foundation  │      │ 2026              [▼] │  │
│  └─────────────────────────┘      └───────────────────────┘  │
│                                                               │
│  Category:                                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Regional Chef                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Status: *                                                    │
│  ○ Applied   ○ Nominated   ○ Semifinalist                    │
│  ○ Finalist  ○ Won         ○ Not Selected                    │
│                                                               │
│  Recipient Type:                  Recipient Name:             │
│  ┌─────────────────────────┐      ┌───────────────────────┐  │
│  │ Chef                [▼] │      │ Aaron Bludorn         │  │
│  └─────────────────────────┘      └───────────────────────┘  │
│                                                               │
│  Application Deadline:            Announcement Date:          │
│  ┌─────────────────────────┐      ┌───────────────────────┐  │
│  │ 2025-11-21              │      │                       │  │
│  └─────────────────────────┘      └───────────────────────┘  │
│                                                               │
│  Link:                                                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ https://www.jamesbeard.org/awards                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Description:                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Nomination for the 2026 James Beard Awards...           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ☑ Display on website                                        │
│  ☐ Feature prominently                                       │
│                                                               │
│                              [Cancel]  [Save Award]           │
└───────────────────────────────────────────────────────────────┘
```

---

## PR Sync Logic

### Manual Entry (Primary)

Most PR data will be manually entered by staff or imported from agency reports.

### CSV Import

**Frequency:** On-demand

**Process:**
1. User uploads CSV file
2. Validate required columns (headline, outlet, published_date)
3. Parse and preview data
4. Show warnings for missing optional fields
5. User confirms import
6. Create MediaMention records
7. Recalculate MediaMentionSnapshot for affected months

### Future: Monitoring Tool Integration

**Frequency:** Daily at 8:00 AM

**Process:**
1. Call Cision/Meltwater API for new mentions
2. Match by externalId to avoid duplicates
3. Create MediaMention records
4. Update MediaMentionSnapshot
5. Send notification if high-AVE mention found

---

## PR API Endpoints

### Media Mentions

```typescript
// Get mentions for period
GET /api/locations/{id}/mentions
  ?page=1
  &pageSize=25
  &search=ksat
  &type=TV,ONLINE
  &dateFrom=2025-11-01
  &dateTo=2025-11-30
  &highlight=true
  &sortBy=publishedAt
  &sortOrder=desc

// Get single mention
GET /api/locations/{id}/mentions/{mentionId}

// Create mention
POST /api/locations/{id}/mentions
{
  headline: string,
  outlet: string,
  outletType: MediaType,
  publishedAt: datetime,
  uvm?: number,
  ave?: number,
  link?: string,
  // ... other fields
}

// Update mention
PATCH /api/locations/{id}/mentions/{mentionId}
{
  isHighlight: true
}

// Delete mention
DELETE /api/locations/{id}/mentions/{mentionId}

// Import mentions from CSV
POST /api/locations/{id}/mentions/import
Content-Type: multipart/form-data
{
  file: CSV file
}

// Export mentions
GET /api/locations/{id}/mentions/export?format=csv&dateFrom=2025-01-01&dateTo=2025-12-31
```

### PR Snapshots

```typescript
// Get monthly snapshots
GET /api/locations/{id}/pr-snapshots
  ?year=2025

// Get single snapshot
GET /api/locations/{id}/pr-snapshots/{month}  // month = "2025-11"
```

### Awards

```typescript
// Get awards
GET /api/locations/{id}/awards
  ?year=2025
  &status=WON,NOMINATED

// Get single award
GET /api/locations/{id}/awards/{awardId}

// Create award
POST /api/locations/{id}/awards
{
  name: string,
  organization: string,
  year: number,
  status: AwardStatus,
  // ... other fields
}

// Update award
PATCH /api/locations/{id}/awards/{awardId}
{
  status: "WON",
  awardedAt: "2025-11-15"
}

// Delete award
DELETE /api/locations/{id}/awards/{awardId}
```

---

## PR Data Export

### Media Mentions Export (CSV)

- Date Published
- Outlet
- Media Type
- Headline
- UVM
- AVE
- Engagement
- Journalist Name
- Link
- Topics
- Sentiment
- Campaign
- Is Highlight

### Awards Export (CSV)

- Award Name
- Organization
- Category
- Year
- Status
- Recipient Type
- Recipient Name
- Nominated Date
- Awarded Date
- Link

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
