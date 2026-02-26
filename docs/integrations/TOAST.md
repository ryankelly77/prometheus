# Toast POS Integration

## Overview

Toast is a cloud-based POS system designed for restaurants. This integration syncs order data, labor/time entries, and menu information to populate our warehouse tables.

## API Details

### Base URL
```
Production: https://ws-api.toasttab.com
```

### Authentication

Toast uses OAuth 2.0 client credentials flow.

**Endpoint:** `POST /authentication/v1/authentication/login`

**Request:**
```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "userAccessType": "TOAST_MACHINE_CLIENT"
}
```

**Response:**
```json
{
  "token": {
    "tokenType": "Bearer",
    "scope": "...",
    "expiresIn": 86400,
    "accessToken": "eyJ..."
  },
  "status": "SUCCESS"
}
```

**Token Usage:**
```
Authorization: Bearer {accessToken}
Toast-Restaurant-External-ID: {restaurantGuid}
```

### Required Headers

| Header | Description |
|--------|-------------|
| `Authorization` | `Bearer {accessToken}` |
| `Toast-Restaurant-External-ID` | Restaurant GUID for multi-location accounts |
| `Content-Type` | `application/json` |

## Rate Limits

### Global Limits
- **20 requests/second** per client
- **10,000 requests/15 minutes** global ceiling

### Endpoint-Specific Limits
| Endpoint | Limit | Max Date Range |
|----------|-------|----------------|
| `/ordersBulk` | 5 req/sec/location | 1 month |
| `/labor/v1/timeEntries` | 20 req/sec | - |
| `/menus/v2/menus` | 20 req/sec | - |

### Rate Limit Headers
```
X-Toast-RateLimit-Remaining: 15
X-Toast-RateLimit-Reset: 1709654400
Retry-After: 60  (only on 429 responses)
```

## API Endpoints

### 1. Orders (for Sales Data)

**Endpoint:** `GET /orders/v2/ordersBulk`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO 8601 | Start of date range |
| `endDate` | ISO 8601 | End of date range |
| `businessDate` | YYYY-MM-DD | Filter by business date |
| `pageSize` | integer | Results per page (max 100) |
| `page` | string | Pagination token |

**Response:**
```json
{
  "orders": [
    {
      "guid": "order-guid-123",
      "entityType": "Order",
      "externalId": null,
      "openedDate": "2024-01-15T11:30:00.000Z",
      "closedDate": "2024-01-15T12:15:00.000Z",
      "businessDate": 20240115,
      "server": {
        "guid": "server-guid",
        "entityType": "RestaurantUser",
        "firstName": "John",
        "lastName": "Smith"
      },
      "checks": [
        {
          "guid": "check-guid",
          "entityType": "Check",
          "displayNumber": "42",
          "amount": 85.50,
          "totalAmount": 95.25,
          "taxAmount": 6.75,
          "selections": [
            {
              "guid": "selection-guid",
              "entityType": "MenuItemSelection",
              "item": {
                "guid": "item-guid",
                "entityType": "MenuItem",
                "name": "Ribeye Steak"
              },
              "quantity": 1,
              "unitOfMeasure": "NONE",
              "price": 45.00,
              "preDiscountPrice": 45.00,
              "modifiers": []
            }
          ],
          "payments": [
            {
              "guid": "payment-guid",
              "entityType": "Payment",
              "paidDate": "2024-01-15T12:15:00.000Z",
              "type": "CREDIT",
              "amount": 95.25,
              "tipAmount": 15.00
            }
          ]
        }
      ],
      "diningOption": {
        "guid": "dining-option-guid",
        "entityType": "DiningOption",
        "name": "Dine In"
      },
      "table": {
        "guid": "table-guid",
        "entityType": "RestaurantTable",
        "name": "Table 12"
      }
    }
  ],
  "nextPageToken": "abc123..."
}
```

### 2. Labor / Time Entries

**Endpoint:** `GET /labor/v1/timeEntries`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `modifiedStartDate` | ISO 8601 | Modified after this date |
| `modifiedEndDate` | ISO 8601 | Modified before this date |
| `businessDate` | YYYY-MM-DD | Filter by business date |
| `pageToken` | string | Pagination token |

**Response:**
```json
{
  "timeEntries": [
    {
      "guid": "time-entry-guid",
      "employeeGuid": "employee-guid-123",
      "jobGuid": "job-guid-456",
      "jobCode": "SERVER",
      "jobTitle": "Server",
      "inDate": "2024-01-15T10:00:00.000Z",
      "outDate": "2024-01-15T18:30:00.000Z",
      "businessDate": 20240115,
      "regularHours": 8.0,
      "overtimeHours": 0.5,
      "hourlyWage": 15.00,
      "totalWages": 127.50,
      "deleted": false
    }
  ],
  "nextPageToken": "xyz789..."
}
```

### 3. Employees

**Endpoint:** `GET /labor/v1/employees`

**Response:**
```json
{
  "employees": [
    {
      "guid": "employee-guid-123",
      "entityType": "Employee",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane.doe@restaurant.com",
      "jobs": [
        {
          "guid": "job-guid-456",
          "code": "SERVER",
          "title": "Server",
          "wage": 15.00,
          "wageType": "HOURLY"
        }
      ]
    }
  ]
}
```

### 4. Menus

**Endpoint:** `GET /menus/v2/menus`

**Response:**
```json
{
  "menus": [
    {
      "guid": "menu-guid",
      "name": "Dinner Menu",
      "groups": [
        {
          "guid": "group-guid",
          "name": "Appetizers",
          "items": [
            {
              "guid": "item-guid",
              "name": "Calamari",
              "price": 14.00,
              "description": "Crispy fried calamari with marinara",
              "plu": "APP001",
              "sku": "CAL-001",
              "visibility": "POS_AND_ONLINE",
              "modifierGroups": []
            }
          ]
        }
      ]
    }
  ]
}
```

### 5. Restaurant Info

**Endpoint:** `GET /restaurants/v1/restaurants/{restaurantGuid}`

**Response:**
```json
{
  "guid": "restaurant-guid",
  "managementGroupGuid": "mgmt-group-guid",
  "location": {
    "address1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "general": {
    "name": "Downtown Bistro",
    "timeZone": "America/New_York"
  }
}
```

## Data Mapping

### Orders → DaypartMetrics / TransactionSummary

| Toast Field | Prometheus Field |
|-------------|------------------|
| `order.openedDate` | Used for daypart detection |
| `order.businessDate` | `date` |
| `check.totalAmount` | Summed for `revenue` |
| `check.selections[].quantity` | Summed for `covers` |
| `order.diningOption.name` | `serviceType` |

### Daypart Detection

Based on `order.openedDate` local time:
| Time Range | Daypart |
|------------|---------|
| 06:00 - 10:59 | Breakfast |
| 11:00 - 14:59 | Lunch |
| 15:00 - 17:59 | Afternoon |
| 18:00 - 21:59 | Dinner |
| 22:00 - 05:59 | Late Night |

### Time Entries → LaborDetail

| Toast Field | Prometheus Field |
|-------------|------------------|
| `timeEntry.jobTitle` | `positionName` |
| `timeEntry.jobCode` | Used for `positionCategory` |
| `timeEntry.regularHours + overtimeHours` | `hoursWorked` |
| `timeEntry.totalWages` | `laborCost` |
| `timeEntry.businessDate` | `date` |

### Position Category Detection

**BOH (Back of House):**
- Chef, Cook, Line Cook, Prep Cook, Dishwasher, Kitchen, Sous Chef, Pastry, Baker, Expeditor

**FOH (Front of House):**
- Server, Host, Hostess, Bartender, Barback, Busser, Runner, Cashier, Manager

### Menus → MenuItem / MenuCategory

| Toast Field | Prometheus Field |
|-------------|------------------|
| `menu.groups[].name` | `MenuCategory.name` |
| `item.name` | `MenuItem.name` |
| `item.price` | `MenuItem.currentPrice` |
| `item.description` | `MenuItem.description` |
| `item.visibility` | `MenuItem.isActive` |

## Sync Strategy

### Initial Historical Sync
1. Fetch last 12 months of orders (1 month batches due to API limit)
2. Aggregate into DaypartMetrics and TransactionSummary
3. Fetch labor time entries for same period
4. Import current menus

### Incremental Sync (Daily)
1. Fetch orders for previous day
2. Update DaypartMetrics and TransactionSummary
3. Fetch modified time entries
4. Sync menu changes

### Batch Processing
```typescript
// Orders: Max 1 month per request
const batches = splitIntoMonthlyBatches(startDate, endDate);

for (const batch of batches) {
  await fetchOrdersWithPagination(batch.start, batch.end);
  await delay(200); // Rate limit: 5 req/sec
}
```

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Refresh token |
| 403 | Forbidden | Check scopes/permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Rate Limited | Wait for `Retry-After` seconds |
| 500+ | Server Error | Retry with backoff |

### Retry Strategy
```typescript
const retryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};
```

## Required Scopes

| Scope | Purpose |
|-------|---------|
| `orders.read` | Read order data |
| `labor.read` | Read time entries |
| `employees.read` | Read employee info |
| `menus.read` | Read menu data |
| `restaurants.read` | Read restaurant info |

## Environment Variables

```env
TOAST_API_URL=https://ws-api.toasttab.com
TOAST_CLIENT_ID=fVi0HgxbkKlHucJUY5ZIGN4SkF4efvuZ
TOAST_CLIENT_SECRET=your_client_secret
```

## Testing

### Mock Mode
Set `TOAST_USE_MOCK=true` to use mock responses for local development.

### Webhook Testing
Toast supports webhooks for real-time updates. Configure webhook URL in Toast partner portal for:
- `order.created`
- `order.updated`
- `timeEntry.created`
- `timeEntry.updated`
