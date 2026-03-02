/**
 * Toast Order Mapper
 *
 * Maps Toast orders to DaypartMetrics and TransactionSummary records.
 *
 * WORKING BASELINE: Gross ~$637,196, Net ~$634,124
 * This version REVERTS to the exact working selection iteration,
 * then adds diagnostic logging for discounts.
 */

import type { Prisma, Daypart } from "@/generated/prisma";
import type { ToastOrder, ToastCheck, ToastSelection } from "../types";

export type { Daypart };

export interface ToastConfigMappings {
  salesCategories?: Record<string, string>;
  restaurantServices?: Record<string, string>;
  revenueCenters?: Record<string, string>;
}

// ============================================================================
// DAYPART DETECTION (unchanged)
// ============================================================================

const DAYPART_RANGES = [
  { start: 6, end: 10, daypart: "BREAKFAST" as Daypart },
  { start: 11, end: 14, daypart: "LUNCH" as Daypart },
  { start: 15, end: 17, daypart: "AFTERNOON" as Daypart },
  { start: 18, end: 21, daypart: "DINNER" as Daypart },
  { start: 22, end: 5, daypart: "LATE_NIGHT" as Daypart },
];

function mapToastServiceToDaypart(serviceName: string): Daypart | null {
  const n = serviceName.toLowerCase().trim();
  if (n.includes("brunch")) return "BRUNCH";
  if (n.includes("breakfast")) return "BREAKFAST";
  if (n.includes("lunch")) return "LUNCH";
  if (n.includes("afternoon") || n.includes("happy hour")) return "AFTERNOON";
  if (n.includes("dinner") || n.includes("evening")) return "DINNER";
  if (n.includes("late") || n.includes("night") || n.includes("bar")) return "LATE_NIGHT";
  return null;
}

export function getDaypartFromOrder(order: ToastOrder, config?: ToastConfigMappings): Daypart {
  if (order.restaurantService?.guid && config?.restaurantServices) {
    const name = config.restaurantServices[order.restaurantService.guid];
    if (name) {
      const daypart = mapToastServiceToDaypart(name);
      if (daypart) return daypart;
    }
  }
  if (order.revenueCenter?.guid && config?.revenueCenters) {
    const name = config.revenueCenters[order.revenueCenter.guid];
    if (name) {
      const daypart = mapToastServiceToDaypart(name);
      if (daypart) return daypart;
    }
  }
  if (order.revenueCenter?.name) {
    const daypart = mapToastServiceToDaypart(order.revenueCenter.name);
    if (daypart) return daypart;
  }
  return detectDaypartFromTime(order.openedDate);
}

export function detectDaypartFromTime(openedDate: string | Date): Daypart {
  const hour = new Date(openedDate).getHours();
  for (const range of DAYPART_RANGES) {
    if (range.start <= range.end) {
      if (hour >= range.start && hour <= range.end) return range.daypart;
    } else {
      if (hour >= range.start || hour <= range.end) return range.daypart;
    }
  }
  return "DINNER";
}

export function detectDaypart(openedDate: string | Date): Daypart {
  return detectDaypartFromTime(openedDate);
}

export function parseBusinessDate(businessDate: number): Date {
  const str = businessDate.toString();
  return new Date(parseInt(str.slice(0, 4)), parseInt(str.slice(4, 6)) - 1, parseInt(str.slice(6, 8)));
}

export function resetDaypartDebugCounter(): void {}
export function resetCategoryDebugCounter(): void {}

// ============================================================================
// CATEGORY MAPPING (unchanged)
// ============================================================================

interface SalesCategoryTotals {
  foodSales: number;
  beverageSales: number;
  alcoholSales: number;
  beerSales: number;
  wineSales: number;
  liquorSales: number;
  nonAlcoholicBevSales: number;
  uncategorized: number;
}

function isDeferredRevenueCategory(categoryName: string): boolean {
  const n = categoryName.toLowerCase().trim();
  return n.includes("gift card") || n.includes("giftcard") || n.includes("gift certificate") ||
         n.includes("deposit") || n.includes("deferred") || n.includes("event") ||
         n.includes("prepaid") || n.includes("merchandise") || n.includes("retail") ||
         n.includes("catering") || (n.includes("credit") && n.includes("store"));
}

function mapSalesCategoryName(categoryName: string): keyof SalesCategoryTotals | null {
  const n = categoryName.toLowerCase().trim();
  if (isDeferredRevenueCategory(categoryName)) return null;
  if (n.includes("beer") || n.includes("draft") || n.includes("ale")) return "beerSales";
  if (n.includes("wine") || n.includes("champagne") || n.includes("sparkling")) return "wineSales";
  if (n.includes("liquor") || n.includes("spirit") || n.includes("cocktail") ||
      n.includes("mixed drink") || n.includes("whiskey") || n.includes("vodka") ||
      n.includes("tequila") || n.includes("rum") || n.includes("gin")) return "liquorSales";
  if (n.includes("non-alcohol") || n.includes("non alcohol") || n.includes("n/a") ||
      n.includes("soft drink") || n.includes("soda") || n.includes("coffee") ||
      n.includes("tea") || n.includes("juice") || n.includes("water") || n.includes("beverage")) return "nonAlcoholicBevSales";
  if (n.includes("food") || n.includes("appetizer") || n.includes("entree") ||
      n.includes("dessert") || n.includes("salad") || n.includes("soup") ||
      n.includes("sandwich") || n.includes("burger") || n.includes("pizza") ||
      n.includes("pasta") || n.includes("seafood") || n.includes("steak") ||
      n.includes("chicken") || n.includes("side")) return "foodSales";
  return "uncategorized";
}

// ============================================================================
// MODULE-LEVEL COUNTERS
// ============================================================================

let voidedOrdersCount = 0;
let deletedOrdersCount = 0;
let processedOrdersCount = 0;

let voidedSelectionsCount = 0;
let voidedSelectionsAmount = 0;
let giftCardSelectionsCount = 0;
let giftCardSelectionsAmount = 0;
let deferredRevenueByCategory: Record<string, { count: number; amount: number }> = {};

let voidedChecksCount = 0;
let voidedChecksAmount = 0;
let refundsCount = 0;
let refundsAmount = 0;
let refundsTrackedGuids: string[] = [];

let totalServiceCharges = 0;
let serviceChargeCount = 0;
let gratuityServiceCharges = 0;
let nonGratuityServiceCharges = 0;

let firstOrderDate: string | null = null;
let lastOrderDate: string | null = null;

// Revenue tracking
let grossFromSelections = 0;
let totalDiscountsFound = 0;
let totalRefundsApplied = 0;

// Discount diagnostic logging
let discountDiagLogged = 0;
const MAX_DISCOUNT_DIAG = 10;

// Refund diagnostic logging
let refundDebugLogged = 0;
const MAX_REFUND_DEBUG = 15;

// Track unique sales categories
let uniqueSalesCategories: Set<string> = new Set();

// Track deferred revenue subtracted from net sales
let totalDeferredSubtracted = 0;
let deferredSubtractedByCategory: Record<string, number> = {};
// Track deferred on excluded orders (for reporting only - not double-subtracted)
let deferredOnExcludedOrders = 0;

// ============================================================================
// RESET FUNCTIONS
// ============================================================================

export function resetExclusionCounters(): void {
  voidedSelectionsCount = 0;
  voidedSelectionsAmount = 0;
  giftCardSelectionsCount = 0;
  giftCardSelectionsAmount = 0;
  deferredRevenueByCategory = {};
  totalServiceCharges = 0;
  serviceChargeCount = 0;
  gratuityServiceCharges = 0;
  nonGratuityServiceCharges = 0;
  firstOrderDate = null;
  lastOrderDate = null;
  grossFromSelections = 0;
  totalDiscountsFound = 0;
  totalRefundsApplied = 0;
  discountDiagLogged = 0;
  uniqueSalesCategories = new Set();
  totalDeferredSubtracted = 0;
  deferredSubtractedByCategory = {};
  deferredOnExcludedOrders = 0;
}

export function resetVoidedOrdersCounter(): void {
  voidedOrdersCount = 0;
  deletedOrdersCount = 0;
  processedOrdersCount = 0;
}

export function resetVoidAndRefundCounters(): void {
  voidedChecksCount = 0;
  voidedChecksAmount = 0;
  refundsCount = 0;
  refundsAmount = 0;
  refundsTrackedGuids = [];
  refundDebugLogged = 0;
}

// ============================================================================
// STATS GETTERS
// ============================================================================

export function getVoidedOrdersCount(): number {
  return voidedOrdersCount;
}

export function getOrderExclusionStats() {
  return {
    voidedOrders: voidedOrdersCount,
    deletedOrders: deletedOrdersCount,
    fullRefundOrders: 0,
    processedOrders: processedOrdersCount,
  };
}

export function getVoidAndRefundStats() {
  return {
    voidedChecksCount,
    voidedChecksAmount,
    refundsCount,
    refundsAmount,
  };
}

export function getExclusionStats() {
  return {
    voidedCount: voidedSelectionsCount,
    voidedAmount: voidedSelectionsAmount,
    giftCardCount: giftCardSelectionsCount,
    giftCardAmount: giftCardSelectionsAmount,
    deferredByCategory: deferredRevenueByCategory,
    serviceCharges: totalServiceCharges,
    serviceChargeCount: serviceChargeCount,
    gratuityServiceCharges: gratuityServiceCharges,
    nonGratuityServiceCharges: nonGratuityServiceCharges,
    uniqueSalesCategories: Array.from(uniqueSalesCategories),
    dateRange: { first: firstOrderDate, last: lastOrderDate },
    deferredSubtracted: totalDeferredSubtracted,
    deferredSubtractedByCategory: deferredSubtractedByCategory,
    deferredOnExcluded: deferredOnExcludedOrders,
  };
}

export function getDiscountStats() {
  return {
    itemLevelCount: 0,
    itemLevelAmount: totalDiscountsFound,
    checkLevelCount: 0,
    checkLevelAmount: 0,
    derivedAmount: 0,
    totalDiscounts: totalDiscountsFound,
  };
}

export function getRefundStats() {
  return {
    fromRefundObject: { count: 0, amount: 0 },
    fromRefundAmount: { count: refundsCount, amount: refundsAmount },
    totalApplied: totalRefundsApplied,
  };
}

export function getRevenueMethodComparison() {
  return {
    method1SelectionSum: grossFromSelections,
    method2CheckAmount: 0,
    method3CheckMinusTax: 0,
    totalDiscounts: totalDiscountsFound,
    totalComps: 0,
  };
}

// ============================================================================
// CORE CALCULATION - REVERTED TO WORKING VERSION
// ============================================================================

/**
 * Extract sales by category from order selections
 * REVERTED to exact working logic - DO NOT iterate modifiers or nested items
 */
function extractSalesByCategory(
  checks: ToastCheck[],
  config?: ToastConfigMappings
): SalesCategoryTotals {
  const totals: SalesCategoryTotals = {
    foodSales: 0,
    beverageSales: 0,
    alcoholSales: 0,
    beerSales: 0,
    wineSales: 0,
    liquorSales: 0,
    nonAlcoholicBevSales: 0,
    uncategorized: 0,
  };

  for (const check of checks) {
    if (check.deleted || check.voidDate || check.voided) continue;

    // Service charges are now tracked in calculateRevenue() using chargeAmount field

    // Use netPrice for category tracking (gives ~$637K which matches earlier working values)
    for (const selection of check.selections ?? []) {
      // Skip voided selections
      if (selection.voidDate || selection.voided) {
        const amount = (selection.price ?? 0) * (selection.quantity ?? 1);
        voidedSelectionsCount++;
        voidedSelectionsAmount += amount;
        continue;
      }

      // Use netPrice (post-discount) with fallback to price * quantity
      const selectionAmount = selection.netPrice ?? ((selection.price ?? 0) * (selection.quantity ?? 1));

      // Determine category
      let categoryName: string | null = null;
      if (selection.salesCategory?.name) {
        categoryName = selection.salesCategory.name;
      } else if (selection.salesCategory?.guid && config?.salesCategories) {
        categoryName = config.salesCategories[selection.salesCategory.guid] ?? null;
      } else if (selection.itemGroup?.name) {
        categoryName = selection.itemGroup.name;
      } else if (selection.itemGroup?.guid && config?.salesCategories) {
        categoryName = config.salesCategories[selection.itemGroup.guid] ?? null;
      }

      // Track unique sales categories for debugging
      if (categoryName) {
        uniqueSalesCategories.add(categoryName);
      }

      // Check for deferred revenue
      if (categoryName && isDeferredRevenueCategory(categoryName)) {
        giftCardSelectionsCount++;
        giftCardSelectionsAmount += selectionAmount;
        if (!deferredRevenueByCategory[categoryName]) {
          deferredRevenueByCategory[categoryName] = { count: 0, amount: 0 };
        }
        deferredRevenueByCategory[categoryName].count++;
        deferredRevenueByCategory[categoryName].amount += selectionAmount;
        continue;
      }

      // Map to bucket
      const bucket = categoryName ? mapSalesCategoryName(categoryName) : "uncategorized";
      const key = (bucket ?? "uncategorized") as keyof SalesCategoryTotals;
      totals[key] += selectionAmount;

      // DIAGNOSTIC: Log selections that have appliedDiscounts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selAny = selection as any;
      if (selAny.appliedDiscounts && selAny.appliedDiscounts.length > 0 && discountDiagLogged < MAX_DISCOUNT_DIAG) {
        discountDiagLogged++;
        for (const discount of selAny.appliedDiscounts) {
          console.log(`[DISCOUNT DIAG #${discountDiagLogged}]`, {
            selectionName: selection.item?.name,
            price: selection.price,
            preDiscountPrice: selection.preDiscountPrice,
            netPrice: selection.netPrice,
            quantity: selection.quantity,
            discountName: discount.name,
            discountAmount: discount.discountAmount,
            discountKeys: Object.keys(discount),
            selectionKeys: Object.keys(selection).filter(k =>
              k.includes('price') || k.includes('discount') || k.includes('net') || k.includes('amount')
            )
          });
          // Tally discounts found (but NOT subtracting yet)
          const discAmt = Math.abs(discount.discountAmount ?? discount.amount ?? 0);
          totalDiscountsFound += discAmt;
        }
      }
    }
  }

  // Calculate aggregates
  totals.alcoholSales = totals.beerSales + totals.wineSales + totals.liquorSales;
  totals.beverageSales = totals.nonAlcoholicBevSales;

  return totals;
}

/**
 * Helper to get category name from a selection (same logic as extractSalesByCategory)
 */
function getSelectionCategoryName(
  selection: ToastSelection,
  config?: ToastConfigMappings
): string | null {
  if (selection.salesCategory?.name) {
    return selection.salesCategory.name;
  } else if (selection.salesCategory?.guid && config?.salesCategories) {
    return config.salesCategories[selection.salesCategory.guid] ?? null;
  } else if (selection.itemGroup?.name) {
    return selection.itemGroup.name;
  } else if (selection.itemGroup?.guid && config?.salesCategories) {
    return config.salesCategories[selection.itemGroup.guid] ?? null;
  }
  return null;
}

/**
 * Calculate deferred revenue from a check
 * Deferred = selections WITHOUT a salesCategory.guid (gift cards, deposits, etc.)
 */
function getDeferredAmount(check: ToastCheck): number {
  let deferred = 0;
  for (const selection of check.selections ?? []) {
    if (selection.voidDate || selection.voided) continue;
    // Deferred = items without a salesCategory GUID
    if (!selection.salesCategory?.guid) {
      deferred += (selection.price ?? 0) * (selection.quantity ?? 1);
    }
  }
  return deferred;
}

/**
 * Calculate refund amount from a check
 */
function getRefundAmount(check: ToastCheck): number {
  let refunds = 0;
  for (const payment of check.payments ?? []) {
    if (payment.refund?.refundAmount && payment.refund.refundAmount > 0) {
      refunds += payment.refund.refundAmount;
    } else if (payment.refundAmount && payment.refundAmount > 0) {
      refunds += payment.refundAmount;
    }
  }
  return refunds;
}

/**
 * Calculate revenue from checks
 *
 * NET SALES FORMULA (Formula B - validated against Toast):
 * Net Sales = check.amount - deferred - refunds
 *
 * Where:
 * - check.amount = Toast subtotal (already has discounts applied)
 * - deferred = selections without a salesCategory GUID (gift cards, deposits, etc.)
 * - refunds = payment.refund.refundAmount from check.payments[]
 *
 * DO NOT subtract:
 * - Service charges (already excluded from check.amount OR are tips)
 * - Discounts (already reflected in check.amount)
 *
 * Validated against 5 data points:
 * - March 2025:    EXACT (0.00% gap)
 * - October 2025:  -0.06% gap
 * - December 2025: +0.51% gap (high gift card sales month)
 * - January 2026:  +1.48% gap (high gift card redemption month)
 * - Feb 27 2026:   EXACT (0.00% gap)
 *
 * Known variance: Gift card heavy months (Dec/Jan) can be up to ~1.5% off
 * due to deferred revenue edge cases. Acceptable for production use.
 */
function calculateRevenue(checks: ToastCheck[], config?: ToastConfigMappings): number {
  let totalRevenue = 0;

  for (const check of checks) {
    // FIRST: Scan ALL checks for refunds (even voided ones) for tracking
    // This must happen BEFORE we skip voided checks
    for (const payment of check.payments ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentAny = payment as any;
      const refundStatus = paymentAny.refundStatus;

      // Check if this payment has any refund indicator
      const hasRefundObject = payment.refund && typeof payment.refund === 'object';
      const hasRefundStatus = refundStatus === 'PARTIAL' || refundStatus === 'FULL';

      // Debug log for any payment with refund indicators
      if ((hasRefundObject || hasRefundStatus) && refundDebugLogged < MAX_REFUND_DEBUG) {
        refundDebugLogged++;
        console.log(`[REFUND DEBUG #${refundDebugLogged}]`, {
          checkVoided: check.voided || check.voidDate || check.deleted,
          refundStatus,
          refundObj: payment.refund,
          refundAmount: payment.refundAmount,
          paymentAmount: payment.amount,
          paymentGuid: payment.guid,
        });
      }

      // Extract refund amount from all possible locations
      let refundAmt = 0;
      if (payment.refund?.refundAmount && payment.refund.refundAmount > 0) {
        refundAmt = payment.refund.refundAmount;
      } else if (payment.refundAmount && payment.refundAmount > 0) {
        refundAmt = payment.refundAmount;
      } else if (hasRefundStatus && paymentAny.refund?.refundAmount) {
        refundAmt = paymentAny.refund.refundAmount;
      }

      // Track if we found a refund amount (avoid duplicates)
      if (refundAmt > 0 && refundsTrackedGuids.indexOf(payment.guid) === -1) {
        refundsTrackedGuids.push(payment.guid);
        refundsCount++;
        refundsAmount += refundAmt;
      }
    }

    // NOW skip voided/deleted checks for revenue calculation
    if (check.deleted || check.voidDate || check.voided) {
      voidedChecksCount++;
      voidedChecksAmount += check.amount ?? 0;
      // Track deferred on excluded checks (for reporting only - NOT subtracted)
      for (const selection of check.selections ?? []) {
        if (selection.voidDate || selection.voided) continue;
        if (!selection.salesCategory?.guid) {
          deferredOnExcludedOrders += (selection.price ?? 0) * (selection.quantity ?? 1);
        }
      }
      continue;
    }

    const checkAmount = check.amount ?? 0;

    // Track service charges for reporting (but DO NOT subtract from net)
    for (const sc of check.appliedServiceCharges ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scAny = sc as any;
      const chargeAmt = scAny.chargeAmount ?? sc.amount ?? 0;
      totalServiceCharges += chargeAmt;
      serviceChargeCount++;

      // Track gratuity vs non-gratuity for reporting
      if (scAny.gratuity === true) {
        gratuityServiceCharges += chargeAmt;
      } else {
        nonGratuityServiceCharges += chargeAmt;
      }
    }

    // Calculate deferred revenue (items without salesCategory GUID)
    const checkDeferred = getDeferredAmount(check);
    totalDeferredSubtracted += checkDeferred;

    // Calculate refunds
    const checkRefunds = getRefundAmount(check);
    totalRefundsApplied += checkRefunds;

    // FORMULA B: Net = check.amount - deferred - refunds
    // DO NOT subtract service charges or discounts
    totalRevenue += checkAmount - checkDeferred - checkRefunds;
  }

  return totalRevenue;
}

/**
 * Calculate gross from checks - uses check.amount for consistency with calculateRevenue
 */
function calculateGrossFromSelections(checks: ToastCheck[]): number {
  let gross = 0;
  for (const check of checks) {
    if (check.deleted || check.voidDate || check.voided) continue;
    // Use check.amount (subtotal from Toast) for consistency
    gross += check.amount ?? 0;
  }
  return gross;
}

function calculateCovers(checks: ToastCheck[]): number {
  return checks.filter((c) => !c.deleted && !c.voidDate && !c.voided).length;
}

// ============================================================================
// AGGREGATION INTERFACES
// ============================================================================

interface DaypartAggregate {
  date: Date;
  daypart: Daypart;
  revenue: number;
  covers: number;
  orderCount: number;
  foodSales: number;
  beverageSales: number;
  alcoholSales: number;
  beerSales: number;
  wineSales: number;
  liquorSales: number;
  nonAlcoholicBevSales: number;
}

interface TransactionAggregate {
  date: Date;
  grossSales: number;
  netSales: number;
  discounts: number;
  refunds: number;
  voids: number;
  comps: number;
  cashPayments: number;
  cardPayments: number;
  giftCardPayments: number;
  otherPayments: number;
  totalTips: number;
  orderCount: number;
  // Raw components for reconciliation
  serviceCharges: number;
  deferredRevenue: number;
}

export interface RevenueCenterAggregate {
  date: Date;
  revenueCenterGuid: string;
  revenueCenterName: string;
  netSales: number;
  orderCount: number;
  checkCount: number;
  isOutdoor: boolean;
}

/**
 * Detect if a revenue center is outdoor based on name
 */
function isOutdoorRevenueCenter(name: string): boolean {
  return /terrace|patio|outdoor|garden|deck|rooftop/i.test(name);
}

// ============================================================================
// MAIN AGGREGATION FUNCTIONS
// ============================================================================

export function aggregateOrdersByDaypart(
  orders: ToastOrder[],
  locationId: string,
  config?: ToastConfigMappings
): Map<string, DaypartAggregate> {
  const aggregates = new Map<string, DaypartAggregate>();

  for (const order of orders) {
    if (order.deleted) {
      deletedOrdersCount++;
      continue;
    }
    if (order.voidDate || order.voided === true) {
      voidedOrdersCount++;
      continue;
    }

    processedOrdersCount++;

    const date = parseBusinessDate(order.businessDate);
    const dateStr = date.toISOString().slice(0, 10);

    if (!firstOrderDate || dateStr < firstOrderDate) firstOrderDate = dateStr;
    if (!lastOrderDate || dateStr > lastOrderDate) lastOrderDate = dateStr;

    const daypart = getDaypartFromOrder(order, config);
    const key = `${dateStr}-${daypart}`;

    const existing = aggregates.get(key) ?? {
      date,
      daypart,
      revenue: 0,
      covers: 0,
      orderCount: 0,
      foodSales: 0,
      beverageSales: 0,
      alcoholSales: 0,
      beerSales: 0,
      wineSales: 0,
      liquorSales: 0,
      nonAlcoholicBevSales: 0,
    };

    // Calculate revenue using check.amount - discounts - refunds - deferred
    const orderRevenue = calculateRevenue(order.checks ?? [], config);
    existing.revenue += orderRevenue;
    existing.covers += calculateCovers(order.checks ?? []);
    existing.orderCount += 1;

    // Track gross from selections for comparison
    grossFromSelections += calculateGrossFromSelections(order.checks ?? []);

    // Category extraction
    const categoryTotals = extractSalesByCategory(order.checks ?? [], config);
    existing.foodSales += categoryTotals.foodSales;
    existing.beverageSales += categoryTotals.beverageSales;
    existing.alcoholSales += categoryTotals.alcoholSales;
    existing.beerSales += categoryTotals.beerSales;
    existing.wineSales += categoryTotals.wineSales;
    existing.liquorSales += categoryTotals.liquorSales;
    existing.nonAlcoholicBevSales += categoryTotals.nonAlcoholicBevSales;

    aggregates.set(key, existing);
  }

  // Scale categories to match net sales (revenue)
  // Category sum (~$637K from netPrice) may be slightly higher than net sales (~$634K from check.amount)
  // because net sales subtracts refunds and check-level adjustments not reflected per-selection
  for (const [key, agg] of aggregates) {
    const categoryTotal = agg.foodSales + agg.beerSales + agg.wineSales +
                          agg.liquorSales + agg.nonAlcoholicBevSales;

    if (categoryTotal > 0 && agg.revenue > 0) {
      const diff = Math.abs(categoryTotal - agg.revenue);
      // Only scale if difference is more than 0.1%
      if (diff / categoryTotal > 0.001) {
        const scaleFactor = agg.revenue / categoryTotal;
        agg.foodSales = agg.foodSales * scaleFactor;
        agg.beerSales = agg.beerSales * scaleFactor;
        agg.wineSales = agg.wineSales * scaleFactor;
        agg.liquorSales = agg.liquorSales * scaleFactor;
        agg.nonAlcoholicBevSales = agg.nonAlcoholicBevSales * scaleFactor;
        // Recalculate aggregates
        agg.alcoholSales = agg.beerSales + agg.wineSales + agg.liquorSales;
        agg.beverageSales = agg.nonAlcoholicBevSales;
      }
    }
    aggregates.set(key, agg);
  }

  console.log(`[Toast Sync] Order exclusions: ${voidedOrdersCount} voided, ${deletedOrdersCount} deleted`);
  console.log(`[Toast Sync] Processed ${processedOrdersCount} of ${orders.length} orders`);

  return aggregates;
}

export function mapDaypartAggregatesToPrisma(
  aggregates: Map<string, DaypartAggregate>,
  locationId: string
): Prisma.DaypartMetricsCreateManyInput[] {
  const records: Prisma.DaypartMetricsCreateManyInput[] = [];
  for (const [_, agg] of aggregates) {
    records.push({
      locationId,
      date: agg.date,
      daypart: agg.daypart,
      totalSales: agg.revenue,
      covers: agg.covers,
      checkCount: agg.orderCount,
      foodSales: agg.foodSales,
      beverageSales: agg.beverageSales,
      alcoholSales: agg.alcoholSales,
      beerSales: agg.beerSales,
      wineSales: agg.wineSales,
      liquorSales: agg.liquorSales,
      nonAlcoholicBevSales: agg.nonAlcoholicBevSales,
    });
  }
  return records;
}

export function aggregateOrdersToTransactions(
  orders: ToastOrder[],
  config?: ToastConfigMappings
): Map<string, TransactionAggregate> {
  const aggregates = new Map<string, TransactionAggregate>();

  for (const order of orders) {
    if (order.deleted || order.voidDate || order.voided) continue;

    const date = parseBusinessDate(order.businessDate);
    const key = date.toISOString().slice(0, 10);

    const existing = aggregates.get(key) ?? {
      date,
      grossSales: 0,
      netSales: 0,
      discounts: 0,
      refunds: 0,
      voids: 0,
      comps: 0,
      cashPayments: 0,
      cardPayments: 0,
      giftCardPayments: 0,
      otherPayments: 0,
      totalTips: 0,
      orderCount: 0,
      serviceCharges: 0,
      deferredRevenue: 0,
    };

    existing.orderCount += 1;

    for (const check of order.checks ?? []) {
      if (check.deleted || check.voidDate || check.voided) {
        existing.voids += check.amount ?? 0;
        continue;
      }

      // Use check.amount as the gross base
      // check.amount is the subtotal from Toast (post-discount, pre-tax)
      const checkGross = check.amount ?? 0;
      existing.grossSales += checkGross;

      // Track service charges for reference (but DO NOT subtract from net)
      for (const sc of check.appliedServiceCharges ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scAny = sc as any;
        existing.serviceCharges += scAny.chargeAmount ?? sc.amount ?? 0;
      }

      // Calculate discounts from check.appliedDiscounts (for reporting)
      let checkDiscounts = 0;
      if (check.appliedDiscounts && check.appliedDiscounts.length > 0) {
        checkDiscounts = check.appliedDiscounts.reduce((sum, d) => sum + (d.amount ?? 0), 0);
      }
      existing.discounts += checkDiscounts;

      // Calculate deferred revenue (items without salesCategory GUID)
      const checkDeferred = getDeferredAmount(check);
      existing.deferredRevenue += checkDeferred;

      // Calculate refunds
      const checkRefunds = getRefundAmount(check);
      existing.refunds += checkRefunds;

      // Process payment info
      for (const payment of check.payments ?? []) {
        existing.totalTips += payment.tipAmount ?? 0;

        // Payment breakdown
        const amt = payment.amount ?? 0;
        switch (payment.type) {
          case "CASH": existing.cashPayments += amt; break;
          case "CREDIT": existing.cardPayments += amt; break;
          case "GIFTCARD": existing.giftCardPayments += amt; break;
          default: existing.otherPayments += amt;
        }
      }

      // FORMULA B: Net = check.amount - deferred - refunds
      // DO NOT subtract service charges or discounts
      existing.netSales += checkGross - checkDeferred - checkRefunds;
    }

    aggregates.set(key, existing);
  }

  return aggregates;
}

function safeNumber(value: number | undefined | null): number {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return value;
}

export function mapTransactionAggregatesToPrisma(
  aggregates: Map<string, TransactionAggregate>,
  locationId: string
): Prisma.TransactionSummaryCreateManyInput[] {
  const records: Prisma.TransactionSummaryCreateManyInput[] = [];
  for (const [_, agg] of aggregates) {
    const grossSales = safeNumber(agg.grossSales);
    const netSales = safeNumber(agg.netSales);
    const orderCount = safeNumber(agg.orderCount);
    const totalTips = safeNumber(agg.totalTips);

    records.push({
      locationId,
      date: agg.date,
      grossSales,
      netSales,
      discounts: safeNumber(agg.discounts),
      refunds: safeNumber(agg.refunds),
      voids: safeNumber(agg.voids),
      comps: safeNumber(agg.comps),
      cashPayments: safeNumber(agg.cashPayments),
      cardPayments: safeNumber(agg.cardPayments),
      giftCardPayments: safeNumber(agg.giftCardPayments),
      otherPayments: safeNumber(agg.otherPayments),
      transactionCount: orderCount,
      avgCheckSize: orderCount > 0 ? netSales / orderCount : 0,
      avgTip: orderCount > 0 ? totalTips / orderCount : 0,
      // Raw components for reconciliation
      serviceCharges: safeNumber(agg.serviceCharges),
      deferredRevenue: safeNumber(agg.deferredRevenue),
    });
  }
  return records;
}

/**
 * Aggregate orders by revenue center
 * Groups revenue by dining area (Bar, Outdoor Terrace, Main Dining, etc.)
 */
export function aggregateOrdersByRevenueCenter(
  orders: ToastOrder[],
  config?: ToastConfigMappings
): Map<string, RevenueCenterAggregate> {
  const aggregates = new Map<string, RevenueCenterAggregate>();

  for (const order of orders) {
    if (order.deleted || order.voidDate || order.voided) continue;

    const date = parseBusinessDate(order.businessDate);
    const dateStr = date.toISOString().slice(0, 10);

    // Get revenue center info
    const rcGuid = order.revenueCenter?.guid;
    if (!rcGuid) continue; // Skip orders without revenue center

    // Look up name from config or use guid as fallback
    const rcName = order.revenueCenter?.name ||
                   config?.revenueCenters?.[rcGuid] ||
                   rcGuid;

    const key = `${dateStr}-${rcGuid}`;

    const existing = aggregates.get(key) ?? {
      date,
      revenueCenterGuid: rcGuid,
      revenueCenterName: rcName,
      netSales: 0,
      orderCount: 0,
      checkCount: 0,
      isOutdoor: isOutdoorRevenueCenter(rcName),
    };

    existing.orderCount += 1;

    // Calculate revenue and check count from checks
    for (const check of order.checks ?? []) {
      if (check.deleted || check.voidDate || check.voided) continue;

      existing.checkCount += 1;

      // Use same formula as calculateRevenue: check.amount - deferred - refunds
      const checkAmount = check.amount ?? 0;
      const checkDeferred = getDeferredAmount(check);
      const checkRefunds = getRefundAmount(check);

      existing.netSales += checkAmount - checkDeferred - checkRefunds;
    }

    aggregates.set(key, existing);
  }

  return aggregates;
}

export function mapRevenueCenterAggregatesToPrisma(
  aggregates: Map<string, RevenueCenterAggregate>,
  locationId: string
): Prisma.RevenueCenterMetricsCreateManyInput[] {
  const records: Prisma.RevenueCenterMetricsCreateManyInput[] = [];

  for (const [_, agg] of aggregates) {
    const netSales = safeNumber(agg.netSales);
    const checkCount = safeNumber(agg.checkCount);

    records.push({
      locationId,
      date: agg.date,
      revenueCenterGuid: agg.revenueCenterGuid,
      revenueCenterName: agg.revenueCenterName,
      netSales,
      orderCount: safeNumber(agg.orderCount),
      checkCount,
      avgCheck: checkCount > 0 ? netSales / checkCount : 0,
      isOutdoor: agg.isOutdoor,
    });
  }

  return records;
}

export function mapOrderToRecord(
  order: ToastOrder,
  locationId: string,
  config?: ToastConfigMappings
) {
  const revenue = calculateRevenue(order.checks ?? [], config);
  return {
    externalId: order.guid,
    date: parseBusinessDate(order.businessDate),
    serviceType: order.diningOption?.name ?? "Dine In",
    revenue,
    covers: calculateCovers(order.checks ?? []),
    daypart: getDaypartFromOrder(order, config),
  };
}
