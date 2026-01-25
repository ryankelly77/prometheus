# Health Score Weight Configuration

> Specification for the Health Score configuration page where users adjust metric weights and targets.

## Overview

Prometheus provides suggested "out of the box" weights for calculating the overall Health Score. Users can adjust these weights to match their restaurant's priorities, as long as the total equals 100%.

Each metric has constraints on how much it can be adjusted, and certain metrics can be disabled entirely if they don't apply to the restaurant (e.g., a restaurant that doesn't serve alcohol).

---

## Page Location

`/dashboard/health-score` or `/dashboard/settings/health-score`

---

## Page Structure

### Section 1: Restaurant Configuration Toggles

At the top of the page, show toggle switches for optional metrics:

| Toggle Label | Default | Affects Metric |
|-------------|---------|----------------|
| "We serve alcohol (spirits)" | ON | Alcohol Sales |
| "We serve beer" | ON | Beer Sales |
| "We serve wine" | ON | Wine Sales |
| "We track PR mentions" | ON | PR Mentions |
| "We track website visibility" | ON | Website Visibility |

**Behavior:**
- When a toggle is OFF, that metric's weight goes to 0
- The slider for that metric becomes disabled/hidden
- The weight automatically redistributes to related metrics (see Redistribution Rules)

### Section 2: Weight Configuration

Display all metrics in a grouped list. Each row contains:

```
[Metric Name]     [========|====] Slider [  5.0% ]
                   min: 3%           max: 8%
```

- **Left:** Metric name
- **Center:** Slider with visual min/max range
- **Right:** Editable number input showing current weight
- **Below slider:** Min/max indicator text

### Section 3: Running Total (Sticky Footer)

Fixed bar at the bottom showing:

```
┌─────────────────────────────────────────────────────────────────┐
│  Total: 96.5 / 100  ⚠️        [Reset to Defaults] [Save Changes] │
└─────────────────────────────────────────────────────────────────┘
```

- **Current total:** Updates live as sliders move
- **Status indicator:** ✓ Green checkmark when exactly 100, ⚠️ Red warning when not
- **Reset to Defaults:** Restores all weights AND re-enables any disabled toggles
- **Save Changes:** Disabled until total = 100

---

## Weight Constraints

```typescript
export const weightConstraints = {
  // Core Metrics (limited flexibility - these are fundamental)
  totalSales:      { default: 25, min: 22, max: 28, category: 'core' },
  primeCost:       { default: 20, min: 17, max: 23, category: 'core' },
  foodSales:       { default: 15, min: 12, max: 18, category: 'core' },
  laborCosts:      { default: 10, min: 8,  max: 12, category: 'core' },
  foodCosts:       { default: 10, min: 8,  max: 12, category: 'core' },
  
  // Customer Metrics
  ppa:             { default: 5,  min: 3,  max: 8,  category: 'customer' },
  customerLoyalty: { default: 5,  min: 3,  max: 8,  category: 'customer' },
  
  // Beverage Metrics (can be disabled)
  wineSales:       { default: 3,  min: 0,  max: 6,  category: 'beverage', canDisable: true },
  alcoholSales:    { default: 2,  min: 0,  max: 5,  category: 'beverage', canDisable: true },
  beerSales:       { default: 2,  min: 0,  max: 5,  category: 'beverage', canDisable: true },
  
  // Marketing Metrics
  reviews:         { default: 2,  min: 1,  max: 4,  category: 'marketing' },
  prMentions:      { default: 1,  min: 0,  max: 3,  category: 'marketing', canDisable: true },
  websiteVisibility: { default: 1, min: 0, max: 3,  category: 'marketing', canDisable: true },
}
```

### Summary Table

| Metric | Default | Min | Max | Can Disable? | Category |
|--------|---------|-----|-----|--------------|----------|
| Total Sales | 25% | 22% | 28% | No | Core |
| Prime Cost | 20% | 17% | 23% | No | Core |
| Food Sales | 15% | 12% | 18% | No | Core |
| Labor Costs | 10% | 8% | 12% | No | Core |
| Food Costs | 10% | 8% | 12% | No | Core |
| PPA | 5% | 3% | 8% | No | Customer |
| Customer Loyalty | 5% | 3% | 8% | No | Customer |
| Wine Sales | 3% | 0% | 6% | Yes | Beverage |
| Alcohol Sales | 2% | 0% | 5% | Yes | Beverage |
| Beer Sales | 2% | 0% | 5% | Yes | Beverage |
| Reviews | 2% | 1% | 4% | No | Marketing |
| PR Mentions | 1% | 0% | 3% | Yes | Marketing |
| Website Visibility | 1% | 0% | 3% | Yes | Marketing |
| **TOTAL** | **100%** | | | | |

---

## Redistribution Rules

When a toggle is turned OFF, the weight from that metric redistributes to related metrics proportionally.

### Scenario 1: No Alcohol At All

When all three alcohol toggles are OFF:

- **Disabled:** Wine (3%) + Alcohol (2%) + Beer (2%) = **7% to redistribute**
- **Redistribute to:**
  - Food Sales: +3%
  - PPA: +2%
  - Customer Loyalty: +2%

### Scenario 2: No Wine Only

When only wine is disabled:

- **Disabled:** Wine (3%)
- **Redistribute to:**
  - Beer Sales: +1.5%
  - Alcohol Sales: +1.5%
- **If beer or alcohol also disabled:** All goes to Food Sales

### Scenario 3: No Beer Only

When only beer is disabled:

- **Disabled:** Beer (2%)
- **Redistribute to:**
  - Wine Sales: +1%
  - Alcohol Sales: +1%
- **If wine or alcohol also disabled:** Goes to remaining beverage, or Food Sales if none

### Scenario 4: No PR Tracking

When PR mentions is disabled:

- **Disabled:** PR Mentions (1%)
- **Redistribute to:**
  - Reviews: +0.5%
  - Website Visibility: +0.5%
- **If visibility also disabled:** All goes to Reviews

### Scenario 5: No Website Visibility Tracking

When website visibility is disabled:

- **Disabled:** Website Visibility (1%)
- **Redistribute to:**
  - Reviews: +0.5%
  - PR Mentions: +0.5%
- **If PR also disabled:** All goes to Reviews

### Redistribution Logic (Pseudocode)

```typescript
function redistributeWeight(disabledMetric: string, weights: Weights, toggles: Toggles): Weights {
  const weightToRedistribute = weights[disabledMetric];
  const newWeights = { ...weights, [disabledMetric]: 0 };
  
  // Get eligible recipients based on category
  const recipients = getRedistributionTargets(disabledMetric, toggles);
  
  // Distribute equally among recipients
  const perRecipient = weightToRedistribute / recipients.length;
  
  for (const recipient of recipients) {
    newWeights[recipient] = Math.min(
      newWeights[recipient] + perRecipient,
      weightConstraints[recipient].max
    );
  }
  
  return newWeights;
}
```

---

## UI Behavior

### Slider Behavior

- Sliders snap to **0.5% increments**
- Slider track shows the valid range (min to max) visually
- Current value shown as editable input; typing updates the slider

### Validation Messages

| Condition | Message | Style |
|-----------|---------|-------|
| Slider moved past max | "Total Sales cannot exceed 28%" | Toast notification |
| Slider moved below min | "Total Sales cannot go below 22%" | Toast notification |
| Total ≠ 100 | "Adjust weights to equal 100%" | Red text below total |
| Total = 100 | "Configuration valid" | Green checkmark |

### Visual Grouping

Group metrics by category with subtle section headers:

```
CORE METRICS
├── Total Sales     [==========|==] 25%
├── Prime Cost      [========|====] 20%
├── Food Sales      [======|======] 15%
├── Labor Costs     [====|========] 10%
└── Food Costs      [====|========] 10%

CUSTOMER METRICS  
├── PPA             [==|==========] 5%
└── Customer Loyalty [==|==========] 5%

BEVERAGE METRICS
├── Wine Sales      [=|===========] 3%
├── Alcohol Sales   [|============] 2%
└── Beer Sales      [|============] 2%

MARKETING METRICS
├── Reviews         [|============] 2%
├── PR Mentions     [|============] 1%
└── Website Visibility [|============] 1%
```

### Reset to Defaults

When clicked:
1. Restore all weights to default values
2. Re-enable all disabled toggles
3. Show confirmation toast: "Weights reset to defaults"

---

## State Management

```typescript
interface HealthScoreConfigState {
  weights: Record<string, number>;
  toggles: Record<string, boolean>;
  isDirty: boolean;
}

// Derived state
const total = useMemo(() => 
  Object.values(weights).reduce((sum, w) => sum + w, 0),
  [weights]
);

const isValid = total === 100;
const canSave = isValid && isDirty;
```

---

## API Integration (Future)

### Load Configuration

```typescript
GET /api/locations/{locationId}/health-score-config

Response:
{
  weights: { totalSales: 25, primeCost: 20, ... },
  toggles: { alcohol: true, beer: true, wine: true, pr: true, visibility: true },
  updatedAt: "2025-01-25T10:30:00Z"
}
```

### Save Configuration

```typescript
PUT /api/locations/{locationId}/health-score-config

Body:
{
  weights: { totalSales: 26, primeCost: 20, ... },
  toggles: { alcohol: true, beer: true, wine: false, pr: true, visibility: true }
}

Response:
{
  success: true,
  message: "Configuration saved"
}
```

### For MVP

Just `console.log` the configuration and show a success toast. Wire up the API when the backend is ready.

---

## Mobile Considerations

- Sliders should be touch-friendly (larger hit area)
- Sticky footer should account for mobile safe areas
- Consider collapsible category sections on mobile to reduce scrolling
- Number inputs should use `type="number"` with `inputmode="decimal"` for mobile keyboards

---

## Accessibility

- All sliders must have proper ARIA labels: `aria-label="Total Sales weight"`
- Slider values announced on change: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Toggle switches use proper `role="switch"` and `aria-checked`
- Error messages linked with `aria-describedby`
- Keyboard navigation: Tab through sliders, Arrow keys to adjust

---

## Related Files

- `/src/lib/mock-data.ts` - Contains `mockHealthScore` and `mockHealthScoreBreakdown`
- `/docs/UI-UX-SPECS.md` - Overall UI specifications
- `/CLAUDE.md` - Design tokens and component patterns
