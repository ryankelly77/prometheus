/**
 * R365 Food Cost → Prometheus DailyMetrics mapper
 *
 * R365 provides food cost data through various means:
 * 1. Invoice totals (AP transactions)
 * 2. Inventory adjustments
 * 3. COGS reports
 *
 * This mapper handles aggregating cost data to daily food cost figures.
 */

import type { R365Transaction, R365TransactionDetail } from "../types";
import type { MapperContext } from "../../types";
import type { Prisma } from "@/generated/prisma";

/**
 * Food cost category identifiers
 * These are typically found in GL account names or transaction categories
 */
const FOOD_COST_CATEGORIES = [
  "food",
  "produce",
  "meat",
  "seafood",
  "dairy",
  "bakery",
  "grocery",
  "beverage - food",
  "non-alcoholic",
  "ingredients",
  "kitchen supplies",
];

const BEVERAGE_COST_CATEGORIES = [
  "beer",
  "wine",
  "liquor",
  "spirits",
  "alcohol",
  "bar supplies",
];

/**
 * Check if a category is food-related
 */
function isFoodCostCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return FOOD_COST_CATEGORIES.some((c) => lower.includes(c));
}

/**
 * Check if a category is beverage-related
 */
function isBeverageCostCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return BEVERAGE_COST_CATEGORIES.some((c) => lower.includes(c));
}

/**
 * Daily cost aggregate
 */
interface DailyCostAggregate {
  date: string;
  foodCost: number;
  beverageCost: number;
  totalCost: number;
  invoiceCount: number;
}

/**
 * Aggregate transactions by date and cost type
 */
export function aggregateTransactionCosts(
  transactions: R365Transaction[],
  details: R365TransactionDetail[],
  glAccountMap: Map<string, { name: string; accountType: string }>
): Map<string, DailyCostAggregate> {
  const aggregates = new Map<string, DailyCostAggregate>();

  // Create detail lookup by transaction ID
  const detailsByTransaction = new Map<string, R365TransactionDetail[]>();
  for (const detail of details) {
    const existing = detailsByTransaction.get(detail.transaction_Id) ?? [];
    existing.push(detail);
    detailsByTransaction.set(detail.transaction_Id, existing);
  }

  // Process each transaction
  for (const transaction of transactions) {
    // Only process AP invoices and similar cost transactions
    if (!["APInvoice", "APCreditMemo", "Inventory"].includes(transaction.transactionType)) {
      continue;
    }

    const date = transaction.transactionDate.split("T")[0];
    const transactionDetails = detailsByTransaction.get(transaction.id) ?? [];

    let foodCost = 0;
    let beverageCost = 0;

    // Categorize by detail line items if available
    if (transactionDetails.length > 0) {
      for (const detail of transactionDetails) {
        const glAccount = detail.glAccount_Id
          ? glAccountMap.get(detail.glAccount_Id)
          : null;
        const accountName = glAccount?.name ?? "";
        const description = detail.description ?? "";
        const categoryHint = `${accountName} ${description}`;

        if (isFoodCostCategory(categoryHint)) {
          foodCost += detail.amount;
        } else if (isBeverageCostCategory(categoryHint)) {
          beverageCost += detail.amount;
        }
      }
    } else {
      // No details, try to categorize by transaction description
      const description = transaction.description ?? "";
      if (isFoodCostCategory(description)) {
        foodCost = transaction.amount;
      } else if (isBeverageCostCategory(description)) {
        beverageCost = transaction.amount;
      }
    }

    // Update aggregate
    const existing = aggregates.get(date) ?? {
      date,
      foodCost: 0,
      beverageCost: 0,
      totalCost: 0,
      invoiceCount: 0,
    };

    existing.foodCost += foodCost;
    existing.beverageCost += beverageCost;
    existing.totalCost += foodCost + beverageCost;
    existing.invoiceCount += 1;

    aggregates.set(date, existing);
  }

  return aggregates;
}

/**
 * Type for updating DailyMetrics with food cost
 */
export type DailyMetricsCostUpdate = Pick<
  Prisma.DailyMetricsUpdateInput,
  "foodCost"
>;

/**
 * Map aggregated costs to DailyMetrics updates
 */
export function mapCostsToDailyMetrics(
  aggregates: Map<string, DailyCostAggregate>,
  context: MapperContext
): Array<{ date: Date; update: DailyMetricsCostUpdate }> {
  const results: Array<{ date: Date; update: DailyMetricsCostUpdate }> = [];

  for (const [, aggregate] of aggregates) {
    results.push({
      date: new Date(aggregate.date),
      update: {
        foodCost: aggregate.foodCost,
      },
    });
  }

  return results;
}

/**
 * Simple food cost mapping from an already-aggregated daily value
 * Use this when R365 provides pre-aggregated daily food cost
 */
export interface SimpleFoodCostRecord {
  date: string;
  foodCost: number;
  beverageCost?: number;
}

export function mapSimpleFoodCost(
  records: SimpleFoodCostRecord[],
  context: MapperContext
): Array<{ date: Date; foodCost: number }> {
  return records.map((record) => ({
    date: new Date(record.date),
    foodCost: record.foodCost,
  }));
}

/**
 * Upsert food cost data into DailyMetrics
 */
export async function upsertDailyFoodCosts(
  prisma: {
    dailyMetrics: {
      upsert: (args: {
        where: { locationId_date: { locationId: string; date: Date } };
        create: Prisma.DailyMetricsCreateInput;
        update: Prisma.DailyMetricsUpdateInput;
      }) => Promise<unknown>;
    };
  },
  locationId: string,
  costs: Array<{ date: Date; foodCost: number }>
): Promise<{ updated: number }> {
  let updated = 0;

  for (const cost of costs) {
    const dayOfWeek = cost.date.getDay();

    await prisma.dailyMetrics.upsert({
      where: {
        locationId_date: {
          locationId,
          date: cost.date,
        },
      },
      create: {
        location: { connect: { id: locationId } },
        date: cost.date,
        dayOfWeek,
        foodCost: cost.foodCost,
      },
      update: {
        foodCost: cost.foodCost,
      },
    });

    updated++;
  }

  return { updated };
}
