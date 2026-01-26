# Prometheus API Management

> **Version:** 1.0  
> **Last Updated:** January 2025  
> **Status:** Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [API Categories](#api-categories)
3. [Data Source Details](#data-source-details)
4. [Sync Schedules](#sync-schedules)
5. [Error Handling & Retry Logic](#error-handling--retry-logic)
6. [Admin Dashboard](#admin-dashboard)
7. [Database Schema](#database-schema)
8. [Implementation Checklist](#implementation-checklist)

---

## Overview

Prometheus aggregates data from multiple external APIs to power restaurant analytics. APIs fall into two categories:

| Category | Description | Examples |
|----------|-------------|----------|
| **User-Connected** | Customer connects their own account via OAuth | Toast, R365, OpenTable |
| **Managed** | Prometheus connects behind the scenes (Pro Plan) | BrightLocal, SEMrush, Open-Meteo |

### Design Principles

1. **Graceful Degradation** — If an API fails, the dashboard still works with stale data
2. **Aggressive Caching** — Minimize API calls, respect rate limits
3. **Centralized Logging** — All API activity logged to `ApiLog` table
4. **Admin Visibility** — Status dashboard shows health of all integrations
5. **Alerting** — Notify admins when APIs fail repeatedly

---

## API Categories

### User-Connected Integrations

These require OAuth or API key from the customer's account.

| Integration | Category | Data Pulled | Auth Method |
|-------------|----------|-------------|-------------|
| Toast POS | POS | Sales, labor, menu items, checks | OAuth 2.0 |
| Square POS | POS | Sales, inventory, customers | OAuth 2.0 |
| Restaurant365 | Accounting | Food cost, invoices, P&L, inventory | OAuth 2.0 |
| MarginEdge | Accounting | Invoice processing, food cost | API Key |
| OpenTable | Reservations | Reservations, covers, guest profiles | OAuth 2.0 |
| Resy | Reservations | Reservations, guest profiles | OAuth 2.0 |
| Tock | Reservations | Reservations, experiences, prepaid | OAuth 2.0 |
| Sprout Social | Social (BYOA) | Social metrics, engagement | OAuth 2.0 |

### Managed Integrations (Pro Plan)

Prometheus manages these centrally — customers don't need accounts.

| Integration | Category | Data Pulled | Auth Method |
|-------------|----------|-------------|-------------|
| BrightLocal | Reviews | Reviews from 80+ sites | API Key (Prometheus account) |
| BrightLocal | Local SEO | Google Maps rankings, local pack | API Key (Prometheus account) |
| SEMrush | SEO | Keyword rankings, visibility | API Key (Prometheus account) |
| Metricool | Social | Instagram, Facebook, TikTok metrics | API Key (Prometheus account) |
| Open-Meteo | Weather | Historical + forecast weather | None (free, no key) |
| Seatgeek | Events | Concerts, sports, theater | API Key (free tier) |
| Ticketmaster | Events | Concerts, sports | API Key (free tier) |
| Eventbrite | Events | Community events, conferences | OAuth 2.0 (free tier) |

---

## Data Source Details

### 1. Weather — Open-Meteo

**Purpose:** Correlate sales with weather patterns

| Attribute | Value |
|-----------|-------|
| Base URL | `https://api.open-meteo.com/v1/forecast` |
| Auth | None required |
| Rate Limit | 10,000 requests/day |
| Cost | **Free** |
| Data Retention | Historical back to 1940 |

**Data Points Captured:**
- `temperature_2m_max` — Daily high
- `temperature_2m_min` — Daily low
- `precipitation_sum` — Total precipitation (mm)
- `weathercode` — WMO weather condition code
- `windspeed_10m_max` — Max wind speed

**API Call Example:**
```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=29.4241&longitude=-98.4936&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=America/Chicago&start_date=2025-01-01&end_date=2025-01-25"
```

**Weather Code Mapping:**
```typescript
const weatherCodeMap: Record<number, string> = {
  0: 'clear',
  1: 'mostly_clear',
  2: 'partly_cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'foggy',
  51: 'light_drizzle',
  53: 'drizzle',
  55: 'heavy_drizzle',
  61: 'light_rain',
  63: 'rain',
  65: 'heavy_rain',
  71: 'light_snow',
  73: 'snow',
  75: 'heavy_snow',
  95: 'thunderstorm',
  96: 'thunderstorm_hail',
  99: 'thunderstorm_hail',
};
```

**Sync Schedule:** Daily at 5:00 AM CT
- Pull yesterday's actual weather
- Pull 7-day forecast
- Update existing forecast records with actuals

---

### 2. Events — Seatgeek

**Purpose:** Track nearby concerts, sports, theater events

| Attribute | Value |
|-----------|-------|
| Base URL | `https://api.seatgeek.com/2/events` |
| Auth | API Key (client_id) |
| Rate Limit | 1,000 requests/day |
| Cost | **Free** |
| Coverage | US & Canada |

**API Call Example:**
```bash
curl "https://api.seatgeek.com/2/events?lat=29.4241&lon=-98.4936&range=10mi&per_page=50&datetime_utc.gte=2025-01-26&client_id=YOUR_CLIENT_ID"
```

**Data Points Captured:**
- Event name, date/time
- Venue name, address, lat/lng
- Event type (concert, sports, theater)
- Performer(s)
- Popularity score (0-1)
- Estimated attendance (from venue capacity)

**Sync Schedule:** Daily at 5:30 AM CT
- Pull events for next 60 days
- Search radius: 10 miles from each location
- Dedupe against existing events

---

### 3. Events — Ticketmaster

**Purpose:** Backup/supplement to Seatgeek, better for some venues

| Attribute | Value |
|-----------|-------|
| Base URL | `https://app.ticketmaster.com/discovery/v2/events` |
| Auth | API Key |
| Rate Limit | 5,000 requests/day |
| Cost | **Free** |
| Coverage | Global |

**API Call Example:**
```bash
curl "https://app.ticketmaster.com/discovery/v2/events.json?latlong=29.4241,-98.4936&radius=10&unit=miles&startDateTime=2025-01-26T00:00:00Z&apikey=YOUR_API_KEY"
```

**Data Points Captured:**
- Event name, date/time
- Venue details
- Event classification (music, sports, arts)
- Price ranges (if available)
- On-sale status

**Sync Schedule:** Daily at 5:45 AM CT
- Pull events for next 60 days
- Merge with Seatgeek data (dedupe by venue + date + similar name)

---

### 4. Events — Eventbrite

**Purpose:** Community events, conferences, food festivals

| Attribute | Value |
|-----------|-------|
| Base URL | `https://www.eventbriteapi.com/v3/events/search/` |
| Auth | OAuth 2.0 / Private Token |
| Rate Limit | 2,000 requests/hour |
| Cost | **Free** |
| Coverage | Global |

**API Call Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" "https://www.eventbriteapi.com/v3/events/search/?location.latitude=29.4241&location.longitude=-98.4936&location.within=10mi&start_date.range_start=2025-01-26T00:00:00Z"
```

**Data Points Captured:**
- Event name, description
- Date/time, duration
- Venue or online
- Category (food & drink, business, community)
- Expected capacity

**Sync Schedule:** Daily at 6:00 AM CT
- Pull events for next 60 days
- Filter categories relevant to restaurants

---

### 5. Holidays & School Calendars

**Purpose:** Track holidays and school breaks that affect traffic

| Source | Method | Cost |
|--------|--------|------|
| US Federal Holidays | Static JSON | Free |
| Texas State Holidays | Static JSON | Free |
| Religious Holidays | Static JSON | Free |
| SAISD Calendar | Manual/Scrape | Free |
| NEISD Calendar | Manual/Scrape | Free |

**Implementation:**
```typescript
// Static holiday data - updated annually
const holidays2025 = [
  { date: '2025-01-01', name: "New Year's Day", type: 'federal' },
  { date: '2025-01-20', name: 'MLK Day', type: 'federal' },
  { date: '2025-02-14', name: "Valentine's Day", type: 'commercial' },
  { date: '2025-03-17', name: "St. Patrick's Day", type: 'commercial' },
  { date: '2025-04-20', name: 'Easter', type: 'religious' },
  { date: '2025-05-05', name: 'Cinco de Mayo', type: 'cultural' },
  { date: '2025-05-11', name: "Mother's Day", type: 'commercial' },
  { date: '2025-05-26', name: 'Memorial Day', type: 'federal' },
  { date: '2025-06-15', name: "Father's Day", type: 'commercial' },
  { date: '2025-07-04', name: 'Independence Day', type: 'federal' },
  { date: '2025-09-01', name: 'Labor Day', type: 'federal' },
  { date: '2025-10-31', name: 'Halloween', type: 'commercial' },
  { date: '2025-11-27', name: 'Thanksgiving', type: 'federal' },
  { date: '2025-12-24', name: 'Christmas Eve', type: 'religious' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'federal' },
  { date: '2025-12-31', name: "New Year's Eve", type: 'commercial' },
];

// San Antonio specific
const localEvents2025 = [
  { date: '2025-04-17', name: 'Fiesta San Antonio', type: 'festival', duration: 11 },
  { date: '2025-02-06', name: 'San Antonio Stock Show & Rodeo', type: 'festival', duration: 18 },
  { date: '2025-11-01', name: 'Día de los Muertos', type: 'cultural', duration: 2 },
];
```

**Sync Schedule:** Static data, loaded on deploy. Manual updates for school calendars.

---

### 6. Reviews — BrightLocal API

**Purpose:** Aggregate reviews from Google, Yelp, TripAdvisor, and 80+ sites

| Attribute | Value |
|-----------|-------|
| Base URL | `https://api.brightlocal.com/v4/` |
| Auth | API Key + Secret |
| Rate Limit | Varies by endpoint |
| Cost | **$0.05 per request** |

**Endpoints Used:**

| Endpoint | Purpose | Cost |
|----------|---------|------|
| `reviews/get` | Fetch reviews for a business | $0.05/request |
| `reviews/get-all` | Fetch all reviews across platforms | $0.05/request |

**Data Points Captured:**
- Review text, rating (1-5)
- Reviewer name, profile URL
- Platform (Google, Yelp, etc.)
- Review date
- Owner response (if any)

**Sync Schedule:** Daily at 12:00 AM CT
- Pull new reviews since last sync
- ~5 platforms × 4 locations = 20 requests/day = $1/day

**Monthly Cost Estimate:** ~$30/month for 4 locations

---

### 7. Local Rankings — BrightLocal API

**Purpose:** Track Google Maps rankings for local keywords

| Endpoint | Purpose | Cost |
|----------|---------|------|
| `rankings/search` | Local pack rankings | $0.01/keyword/location |

**Keywords Tracked (per location):**
- "restaurants near me"
- "best restaurants [neighborhood]"
- "fine dining san antonio"
- "[cuisine type] san antonio" (e.g., "mexican food san antonio")
- Brand name searches

**Sync Schedule:** Weekly on Sundays at 2:00 AM CT
- 20 keywords × 4 locations = 80 requests = $0.80/week

**Monthly Cost Estimate:** ~$4/month for 4 locations

---

### 8. SEO Visibility — SEMrush API

**Purpose:** Track organic keyword rankings and website visibility

| Attribute | Value |
|-----------|-------|
| Base URL | `https://api.semrush.com/` |
| Auth | API Key |
| Rate Limit | Based on API units |
| Cost | **~$0.00005 per unit** |

**Endpoints Used:**

| Endpoint | Units | Purpose |
|----------|-------|---------|
| `domain_ranks` | 10 | Domain overview |
| `domain_organic` | 10/line | Organic keywords |
| `url_organic` | 10/line | Page-level keywords |

**Data Points Captured:**
- Domain authority / visibility score
- Organic keywords count
- Top ranking keywords + positions
- Traffic estimates

**Sync Schedule:** Weekly on Sundays at 3:00 AM CT
- Domain overview: 4 locations × 10 units = 40 units
- Top 50 keywords: 4 locations × 500 units = 2,000 units
- Total: ~2,500 units/week = $0.13/week

**Monthly Cost Estimate:** ~$0.50/month for 4 locations

---

### 9. Social Media — Metricool API

**Purpose:** Track Instagram, Facebook, TikTok metrics (managed option)

| Attribute | Value |
|-----------|-------|
| Base URL | `https://api.metricool.com/` |
| Auth | API Key |
| Cost | Included with Metricool subscription |

**Data Points Captured:**
- Followers/following count
- Posts, stories, reels metrics
- Engagement rate
- Best posting times
- Competitor benchmarks

**Sync Schedule:** Daily at 4:00 AM CT

---

### 10. User-Connected: Toast POS

**Purpose:** Primary sales, labor, and menu data

| Attribute | Value |
|-----------|-------|
| Base URL | `https://ws-api.toasttab.com/` |
| Auth | OAuth 2.0 |
| Rate Limit | 100 requests/second |
| Scopes | `orders.read`, `labor.read`, `menus.read` |

**Endpoints Used:**

| Endpoint | Purpose |
|----------|---------|
| `/orders/v2/orders` | Order history with items |
| `/labor/v1/timeEntries` | Clock in/out, labor hours |
| `/labor/v1/shifts` | Scheduled shifts |
| `/menus/v2/menus` | Menu items, prices, modifiers |
| `/restaurants/v1/restaurants` | Location details |

**Sync Schedule:** 
- Orders: Every 15 minutes during business hours, daily full sync at 6:00 AM
- Labor: Daily at 6:00 AM
- Menus: Weekly on Mondays

---

### 11. User-Connected: Restaurant365

**Purpose:** Food cost, P&L, invoices, inventory

| Attribute | Value |
|-----------|-------|
| Base URL | `https://api.restaurant365.com/` |
| Auth | OAuth 2.0 |

**Endpoints Used:**

| Endpoint | Purpose |
|----------|---------|
| `/accounting/invoices` | AP invoices |
| `/inventory/counts` | Inventory counts |
| `/reports/profit-loss` | P&L statement |
| `/reports/food-cost` | Theoretical vs actual food cost |

**Sync Schedule:** Daily at 6:30 AM CT

---

### 12. User-Connected: OpenTable

**Purpose:** Reservations, covers, guest profiles

| Attribute | Value |
|-----------|-------|
| Base URL | `https://platform.opentable.com/` |
| Auth | OAuth 2.0 |

**Endpoints Used:**

| Endpoint | Purpose |
|----------|---------|
| `/reservations` | Upcoming and past reservations |
| `/availability` | Table availability |
| `/guests` | Guest profiles, visit history |

**Sync Schedule:** 
- Reservations: Every 30 minutes
- Guest profiles: Daily at 7:00 AM CT

---

## Sync Schedules

### Daily Schedule (All Times CT)

```
┌─────────┬────────────────────────────────────────────────────────┐
│  Time   │  Task                                                  │
├─────────┼────────────────────────────────────────────────────────┤
│ 12:00 AM│ BrightLocal Reviews sync                               │
│  4:00 AM│ Metricool Social sync                                  │
│  5:00 AM│ Open-Meteo Weather sync                                │
│  5:30 AM│ Seatgeek Events sync                                   │
│  5:45 AM│ Ticketmaster Events sync                               │
│  6:00 AM│ Eventbrite Events sync                                 │
│  6:00 AM│ Toast POS full sync (orders, labor)                    │
│  6:30 AM│ Restaurant365 sync                                     │
│  7:00 AM│ OpenTable guest profiles sync                          │
│  7:30 AM│ Calculate daily aggregates                             │
│  8:00 AM│ Update InsightCache                                    │
│  8:30 AM│ Generate Intelligence alerts (if thresholds crossed)   │
└─────────┴────────────────────────────────────────────────────────┘
```

### Weekly Schedule

```
┌───────────┬─────────┬──────────────────────────────────────────┐
│    Day    │  Time   │  Task                                    │
├───────────┼─────────┼──────────────────────────────────────────┤
│  Sunday   │ 2:00 AM │ BrightLocal Local Rankings               │
│  Sunday   │ 3:00 AM │ SEMrush SEO Visibility                   │
│  Monday   │ 6:00 AM │ Toast Menu sync                          │
│  Monday   │ 9:00 AM │ Weekly Intelligence Report generation    │
└───────────┴─────────┴──────────────────────────────────────────┘
```

### Real-Time / Frequent Syncs

```
┌─────────────┬────────────────────────────────────────────────────┐
│  Frequency  │  Task                                              │
├─────────────┼────────────────────────────────────────────────────┤
│ Every 15min │ Toast orders (during business hours 10am-12am)     │
│ Every 30min │ OpenTable reservations                             │
│ On-demand   │ User-triggered refresh                             │
└─────────────┴────────────────────────────────────────────────────┘
```

---

## Error Handling & Retry Logic

### Retry Strategy

All API calls use exponential backoff with jitter:

```typescript
const retryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  config = retryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors (except 429)
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt) + Math.random() * 1000,
        config.maxDelayMs
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}
```

### Error Categories

| Category | HTTP Status | Action |
|----------|-------------|--------|
| **Success** | 200-299 | Process response |
| **Rate Limited** | 429 | Retry with backoff, log warning |
| **Auth Error** | 401, 403 | Mark integration as needs reconnect |
| **Not Found** | 404 | Log warning, skip record |
| **Server Error** | 500-599 | Retry with backoff |
| **Timeout** | - | Retry with backoff |
| **Network Error** | - | Retry with backoff |

### Circuit Breaker

Prevent cascading failures when an API is consistently down:

```typescript
interface CircuitBreakerState {
  failures: number;
  lastFailure: Date | null;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreakerConfig = {
  failureThreshold: 5,      // Open circuit after 5 consecutive failures
  recoveryTimeMs: 60000,    // Wait 1 minute before trying again
  halfOpenRequests: 1,      // Allow 1 test request when half-open
};
```

### Alert Thresholds

| Condition | Alert Level | Action |
|-----------|-------------|--------|
| 3 consecutive failures | Warning | Log, continue |
| 5 consecutive failures | Error | Open circuit, notify admin |
| Auth token expired | Error | Mark integration as disconnected |
| Rate limit hit | Warning | Log, slow down |
| Daily sync missed | Error | Notify admin |

---

## Admin Dashboard

### API Status Overview

Location: `/admin/api-status`

```
┌─────────────────────────────────────────────────────────────────────────┐
│ API Status                                                              │
│ Monitor all external integrations and sync health                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ System Health                                                           │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   12 / 12   │  │    98.5%    │  │    $47.23   │  │      3      │    │
│  │   Healthy   │  │   Uptime    │  │  API Costs  │  │   Errors    │    │
│  │             │  │  (30 days)  │  │  (MTD)      │  │  (24 hrs)   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
│                                                                         │
│ Managed APIs (Prometheus)                                               │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Open-Meteo (Weather)                              Healthy     │   │
│  │   Last sync: Today 5:00 AM  •  Next: Tomorrow 5:00 AM           │   │
│  │   Requests today: 4  •  Errors: 0  •  Avg latency: 245ms        │   │
│  │                                                    [View Logs]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Seatgeek (Events)                                 Healthy     │   │
│  │   Last sync: Today 5:30 AM  •  Next: Tomorrow 5:30 AM           │   │
│  │   Requests today: 4  •  Errors: 0  •  Avg latency: 312ms        │   │
│  │   Events found: 47 upcoming                                     │   │
│  │                                                    [View Logs]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Ticketmaster (Events)                             Healthy     │   │
│  │   Last sync: Today 5:45 AM  •  Next: Tomorrow 5:45 AM           │   │
│  │   Requests today: 4  •  Errors: 0  •  Avg latency: 289ms        │   │
│  │   Events found: 52 upcoming                                     │   │
│  │                                                    [View Logs]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Eventbrite (Events)                               Healthy     │   │
│  │   Last sync: Today 6:00 AM  •  Next: Tomorrow 6:00 AM           │   │
│  │   Requests today: 4  •  Errors: 0  •  Avg latency: 198ms        │   │
│  │   Events found: 23 upcoming                                     │   │
│  │                                                    [View Logs]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● BrightLocal (Reviews)                             Healthy     │   │
│  │   Last sync: Today 12:00 AM  •  Next: Tomorrow 12:00 AM         │   │
│  │   Requests today: 20  •  Errors: 0  •  Cost today: $1.00        │   │
│  │   Reviews synced: 12 new                                        │   │
│  │                                                    [View Logs]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● BrightLocal (Local Rankings)                      Healthy     │   │
│  │   Last sync: Sunday 2:00 AM  •  Next: Sunday 2:00 AM            │   │
│  │   Requests this week: 80  •  Errors: 0  •  Cost: $0.80          │   │
│  │                                                    [View Logs]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● SEMrush (SEO)                                     Healthy     │   │
│  │   Last sync: Sunday 3:00 AM  •  Next: Sunday 3:00 AM            │   │
│  │   API units this week: 2,500  •  Errors: 0  •  Cost: $0.13      │   │
│  │                                                    [View Logs]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Metricool (Social)                                Healthy     │   │
│  │   Last sync: Today 4:00 AM  •  Next: Tomorrow 4:00 AM           │   │
│  │   Accounts synced: 4  •  Errors: 0                              │   │
│  │                                                    [View Logs]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                                                         │
│ User-Connected APIs (By Organization)                                   │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  Southerleigh Hospitality Group                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Toast POS                                         Healthy     │   │
│  │   Last sync: Today 6:15 AM  •  Connected: Oct 15, 2024          │   │
│  │   Locations: 4 synced  •  Errors (24h): 0                       │   │
│  │   Orders synced today: 847                                      │   │
│  │                               [View Logs]  [Force Sync]         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● Restaurant365                                     Healthy     │   │
│  │   Last sync: Today 6:30 AM  •  Connected: Oct 15, 2024          │   │
│  │   Locations: 4 synced  •  Errors (24h): 0                       │   │
│  │   Invoices synced: 23                                           │   │
│  │                               [View Logs]  [Force Sync]         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ● OpenTable                                         Healthy     │   │
│  │   Last sync: Today 7:00 AM  •  Connected: Oct 18, 2024          │   │
│  │   Locations: 4 synced  •  Errors (24h): 0                       │   │
│  │   Reservations synced: 156                                      │   │
│  │                               [View Logs]  [Force Sync]         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                                                         │
│ Recent Errors                                           [View All →]    │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  ⚠ Warning  │ Seatgeek  │ Rate limit approached (800/1000)  │ 2h ago   │
│  ✗ Error    │ Toast     │ 503 Service Unavailable           │ 6h ago   │
│             │           │ Retry successful after 2 attempts  │          │
│  ✗ Error    │ OpenTable │ Token refresh failed              │ 1d ago   │
│             │           │ Auto-reconnected                   │          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detailed Log View

Clicking "View Logs" shows:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ API Logs: Seatgeek                                      [← Back]        │
│                                                                         │
│ Filter: [All ▼]  Date: [Last 7 days ▼]  Location: [All ▼]  [Search...] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Today, January 26, 2025                                                 │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│ ● 5:30:12 AM  │ SUCCESS  │ Southerleigh Fine Food                       │
│               │ GET /events?lat=29.4241&lon=-98.4936&range=10mi         │
│               │ 200 OK  •  312ms  •  47 events returned                 │
│               │                                                         │
│ ● 5:30:14 AM  │ SUCCESS  │ Southerleigh Haute South                     │
│               │ GET /events?lat=29.4156&lon=-98.4897&range=10mi         │
│               │ 200 OK  •  298ms  •  45 events returned                 │
│               │                                                         │
│ ● 5:30:16 AM  │ SUCCESS  │ Brasserie Mon Chou Chou                      │
│               │ GET /events?lat=29.4245&lon=-98.4932&range=10mi         │
│               │ 200 OK  •  305ms  •  47 events returned                 │
│               │                                                         │
│ ● 5:30:18 AM  │ SUCCESS  │ Boiler House                                 │
│               │ GET /events?lat=29.4243&lon=-98.4934&range=10mi         │
│               │ 200 OK  •  287ms  •  47 events returned                 │
│               │                                                         │
│                                                                         │
│ Yesterday, January 25, 2025                                             │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│ ⚠ 5:30:45 AM  │ WARNING  │ Rate limit warning                          │
│               │ 800 of 1000 daily requests used                         │
│               │                                                         │
│ ● 5:30:12 AM  │ SUCCESS  │ Southerleigh Fine Food                       │
│               │ ...                                                     │
│                                                                         │
│ [Load More]                                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Cost Tracking

```
┌─────────────────────────────────────────────────────────────────────────┐
│ API Costs                                                               │
│ Track spending on paid APIs                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ January 2025 (Month to Date)                                            │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  API              Requests    Cost        Budget      Status            │
│  ─────────────────────────────────────────────────────────────────────  │
│  BrightLocal      520         $26.00      $50.00      ████████░░ 52%   │
│  (Reviews)                                                              │
│                                                                         │
│  BrightLocal      320         $3.20       $10.00      ████░░░░░░ 32%   │
│  (Local Rankings)                                                       │
│                                                                         │
│  SEMrush          10,400      $0.52       $5.00       █░░░░░░░░░ 10%   │
│  (units)                                                                │
│                                                                         │
│  Claude AI        37 runs     $2.59       $20.00      █░░░░░░░░░ 13%   │
│  (Intelligence)                                                         │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  TOTAL                        $32.31      $85.00      ████░░░░░░ 38%   │
│                                                                         │
│                                                                         │
│ Cost History                                                            │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  $100 ┤                                                                 │
│       │                                                                 │
│   $75 ┤                                                                 │
│       │          ╭─────╮                                                │
│   $50 ┤    ╭─────╯     ╰─────╮                      ╭────                │
│       │────╯                 ╰──────────────────────╯                   │
│   $25 ┤                                                                 │
│       │                                                                 │
│    $0 ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────     │
│       Oct  Nov  Dec  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### API Log Table

```prisma
model ApiLog {
  id            String      @id @default(cuid())
  
  // What API was called
  service       ApiService
  endpoint      String
  method        String      @default("GET")
  
  // Context
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  locationId    String?
  location      Location?   @relation(fields: [locationId], references: [id])
  
  // Request details
  requestUrl    String
  requestBody   Json?
  
  // Response details
  status        ApiLogStatus
  httpStatus    Int?
  responseBody  Json?
  errorMessage  String?
  errorCode     String?
  
  // Performance
  latencyMs     Int?
  
  // Cost tracking (for paid APIs)
  cost          Decimal?    @db.Decimal(10, 6)
  units         Int?        // For APIs that charge by units (SEMrush)
  
  // Retry tracking
  attemptNumber Int         @default(1)
  retryOf       String?     // ID of original request if this is a retry
  
  createdAt     DateTime    @default(now())
  
  @@index([service, createdAt])
  @@index([organizationId, createdAt])
  @@index([status, createdAt])
}

enum ApiService {
  // Managed
  OPEN_METEO
  SEATGEEK
  TICKETMASTER
  EVENTBRITE
  BRIGHTLOCAL_REVIEWS
  BRIGHTLOCAL_LOCAL
  SEMRUSH
  METRICOOL
  
  // User-connected
  TOAST
  SQUARE
  R365
  MARGINEDGE
  OPENTABLE
  RESY
  TOCK
  SPROUT_SOCIAL
  
  // Internal
  CLAUDE_AI
}

enum ApiLogStatus {
  SUCCESS
  ERROR
  WARNING
  RATE_LIMITED
  TIMEOUT
  AUTH_ERROR
}
```

### Integration Status Table

```prisma
model IntegrationStatus {
  id              String        @id @default(cuid())
  service         ApiService
  
  // For user-connected integrations
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId], references: [id])
  
  // Health tracking
  status          IntegrationHealth @default(HEALTHY)
  lastSuccessAt   DateTime?
  lastErrorAt     DateTime?
  lastErrorMessage String?
  
  consecutiveFailures Int       @default(0)
  circuitState    CircuitState  @default(CLOSED)
  circuitOpenedAt DateTime?
  
  // Sync tracking
  lastSyncAt      DateTime?
  nextSyncAt      DateTime?
  syncInProgress  Boolean       @default(false)
  
  // Cost tracking (MTD)
  mtdRequests     Int           @default(0)
  mtdCost         Decimal       @default(0) @db.Decimal(10, 2)
  mtdResetAt      DateTime?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@unique([service, organizationId])
  @@index([status])
}

enum IntegrationHealth {
  HEALTHY
  DEGRADED
  DOWN
  DISCONNECTED
}

enum CircuitState {
  CLOSED      // Normal operation
  OPEN        // Blocking requests
  HALF_OPEN   // Testing with limited requests
}
```

### Weather Data Table

```prisma
model WeatherData {
  id            String    @id @default(cuid())
  locationId    String
  location      Location  @relation(fields: [locationId], references: [id])
  
  date          DateTime  @db.Date
  
  // Temperatures (Fahrenheit)
  tempHigh      Float?
  tempLow       Float?
  tempAvg       Float?
  
  // Precipitation
  precipitation Float?    // inches
  snowfall      Float?    // inches
  
  // Conditions
  weatherCode   Int?      // WMO code
  condition     String?   // Human-readable
  
  // Other
  humidity      Float?
  windSpeed     Float?
  cloudCover    Float?
  
  // Tracking
  isActual      Boolean   @default(false)  // true = actual, false = forecast
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([locationId, date])
  @@index([locationId, date])
}
```

### Local Events Table

```prisma
model LocalEvent {
  id              String        @id @default(cuid())
  locationId      String
  location        Location      @relation(fields: [locationId], references: [id])
  
  // Event details
  name            String
  date            DateTime      @db.Date
  startTime       DateTime?
  endTime         DateTime?
  
  // Venue
  venueName       String?
  venueAddress    String?
  venueLat        Float?
  venueLng        Float?
  distanceMiles   Float?
  
  // Classification
  category        EventCategory
  subcategory     String?
  
  // Impact estimation
  expectedAttendance Int?
  popularityScore    Float?      // 0-1 from source API
  impactScore        Int?        // 1-10 our calculated score
  
  // Source tracking
  source          EventSource
  externalId      String?       // ID from source API
  externalUrl     String?       // Link to event page
  
  // Deduplication
  fingerprint     String?       // Hash for deduping across sources
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@unique([locationId, source, externalId])
  @@index([locationId, date])
  @@index([fingerprint])
}

enum EventCategory {
  SPORTS
  CONCERT
  THEATER
  CONFERENCE
  FESTIVAL
  HOLIDAY
  SCHOOL
  COMMUNITY
  OTHER
}

enum EventSource {
  MANUAL
  SEATGEEK
  TICKETMASTER
  EVENTBRITE
  SYSTEM        // Holidays, school calendars
}
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Create `ApiLog` table and model
- [ ] Create `IntegrationStatus` table and model
- [ ] Build `fetchWithRetry` utility with exponential backoff
- [ ] Build circuit breaker logic
- [ ] Create base API client class with logging

### Phase 2: Weather Integration

- [ ] Create `WeatherData` table and model
- [ ] Build Open-Meteo API client
- [ ] Implement daily weather sync job
- [ ] Add weather to DaypartMetrics correlation

### Phase 3: Events Integration

- [ ] Create `LocalEvent` table and model
- [ ] Build Seatgeek API client
- [ ] Build Ticketmaster API client
- [ ] Build Eventbrite API client
- [ ] Implement event deduplication logic
- [ ] Load static holiday calendar
- [ ] Implement daily events sync job

### Phase 4: Admin Dashboard

- [ ] Build `/admin/api-status` page
- [ ] Build API health overview component
- [ ] Build detailed log viewer component
- [ ] Build cost tracking component
- [ ] Implement "Force Sync" functionality
- [ ] Add error alerting (email/Slack)

### Phase 5: Integration with Analytics

- [ ] Add weather context to Intelligence prompts
- [ ] Add events context to Intelligence prompts
- [ ] Build weather impact correlation analysis
- [ ] Build event impact correlation analysis
- [ ] Add weather/events to Dashboard widgets

---

## Appendix: API Keys Required

### Free APIs (No Cost)

| API | Key Type | Where to Get |
|-----|----------|--------------|
| Open-Meteo | None required | — |
| Seatgeek | Client ID | https://seatgeek.com/account/develop |
| Ticketmaster | API Key | https://developer.ticketmaster.com/ |
| Eventbrite | Private Token | https://www.eventbrite.com/platform/ |

### Paid APIs (Prometheus Account)

| API | Key Type | Where to Get |
|-----|----------|--------------|
| BrightLocal | API Key + Secret | BrightLocal Dashboard |
| SEMrush | API Key | SEMrush Dashboard |
| Metricool | API Key | Metricool Dashboard |
| Claude AI | API Key | https://console.anthropic.com/ |

### User OAuth (Per Customer)

| API | Auth Flow | Scopes Needed |
|-----|-----------|---------------|
| Toast | OAuth 2.0 | orders.read, labor.read, menus.read |
| Square | OAuth 2.0 | ORDERS_READ, ITEMS_READ, MERCHANT_PROFILE_READ |
| Restaurant365 | OAuth 2.0 | read:accounting, read:inventory |
| OpenTable | OAuth 2.0 | reservations:read, guests:read |
| Resy | OAuth 2.0 | reservations:read |
| Tock | OAuth 2.0 | reservations:read |
| Sprout Social | OAuth 2.0 | analytics:read |

---

*Document maintained by Prometheus Engineering Team*
