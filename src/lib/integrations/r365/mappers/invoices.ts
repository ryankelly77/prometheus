/**
 * R365 Invoices/Transactions → Prometheus TransactionSummary mapper
 *
 * Maps R365 transaction data to our TransactionSummary table.
 * Note: This focuses on payment data. For food costs, see food-cost.ts.
 */

import type { R365Transaction, R365SalesSummary } from "../types";
import type { MapperContext } from "../../types";
import type { Prisma } from "@/generated/prisma";

/**
 * Type for creating TransactionSummary records
 */
export type TransactionSummaryCreate = Omit<
  Prisma.TransactionSummaryCreateInput,
  "location"
>;

/**
 * Map R365 Sales Summary to TransactionSummary
 * This is the preferred source if available
 */
export function mapSalesSummaryToTransactionSummary(
  source: R365SalesSummary,
  context: MapperContext
): TransactionSummaryCreate {
  const netSales = source.netSales ?? 0;
  const transactionCount = source.checkCount ?? 0;
  const avgCheckSize = transactionCount > 0 ? netSales / transactionCount : 0;

  // Tips percent calculation
  const tips = source.tips ?? 0;
  const tipPercent = netSales > 0 ? (tips / netSales) * 100 : 0;
  const avgTip = transactionCount > 0 ? tips / transactionCount : 0;

  return {
    date: new Date(source.date),
    grossSales: source.grossSales ?? 0,
    discounts: source.discounts ?? 0,
    comps: source.comps ?? 0,
    voids: source.voids ?? 0,
    refunds: source.refunds ?? 0,
    netSales,
    // Payment breakdown not available in summary - would need POS integration
    cashPayments: 0,
    cardPayments: netSales, // Assume all card as default
    giftCardPayments: 0,
    otherPayments: 0,
    avgCheckSize: Math.round(avgCheckSize * 100) / 100,
    avgTip: Math.round(avgTip * 100) / 100,
    tipPercent: Math.round(tipPercent * 10) / 10,
    transactionCount,
  };
}

/**
 * Map multiple R365 Sales Summary records
 */
export function mapSalesSummariesToTransactionSummaries(
  sources: R365SalesSummary[],
  context: MapperContext
): TransactionSummaryCreate[] {
  return sources.map((source) => mapSalesSummaryToTransactionSummary(source, context));
}

/**
 * Aggregate daily transaction data
 * Use when we only have individual transactions without a summary view
 */
export interface DailyTransactionAggregate {
  date: string;
  grossSales: number;
  discounts: number;
  comps: number;
  voids: number;
  refunds: number;
  netSales: number;
  transactionCount: number;
}

/**
 * Aggregate transactions by date
 */
export function aggregateTransactionsByDate(
  transactions: R365Transaction[]
): Map<string, DailyTransactionAggregate> {
  const aggregates = new Map<string, DailyTransactionAggregate>();

  for (const transaction of transactions) {
    const date = transaction.transactionDate.split("T")[0];

    const existing = aggregates.get(date) ?? {
      date,
      grossSales: 0,
      discounts: 0,
      comps: 0,
      voids: 0,
      refunds: 0,
      netSales: 0,
      transactionCount: 0,
    };

    // Categorize by transaction type
    const amount = transaction.amount ?? 0;
    const type = transaction.transactionType.toLowerCase();

    if (type.includes("sale") || type.includes("revenue")) {
      existing.grossSales += amount;
      existing.netSales += amount;
    } else if (type.includes("discount")) {
      existing.discounts += Math.abs(amount);
      existing.netSales -= Math.abs(amount);
    } else if (type.includes("comp")) {
      existing.comps += Math.abs(amount);
      existing.netSales -= Math.abs(amount);
    } else if (type.includes("void")) {
      existing.voids += Math.abs(amount);
    } else if (type.includes("refund")) {
      existing.refunds += Math.abs(amount);
      existing.netSales -= Math.abs(amount);
    }

    existing.transactionCount += 1;
    aggregates.set(date, existing);
  }

  return aggregates;
}

/**
 * Map aggregated transactions to TransactionSummary
 */
export function mapAggregatedTransactionsToSummary(
  aggregates: Map<string, DailyTransactionAggregate>,
  context: MapperContext
): TransactionSummaryCreate[] {
  const results: TransactionSummaryCreate[] = [];

  for (const [, aggregate] of aggregates) {
    const avgCheckSize =
      aggregate.transactionCount > 0
        ? aggregate.netSales / aggregate.transactionCount
        : 0;

    results.push({
      date: new Date(aggregate.date),
      grossSales: aggregate.grossSales,
      discounts: aggregate.discounts,
      comps: aggregate.comps,
      voids: aggregate.voids,
      refunds: aggregate.refunds,
      netSales: aggregate.netSales,
      cashPayments: 0,
      cardPayments: aggregate.netSales, // Default assumption
      giftCardPayments: 0,
      otherPayments: 0,
      avgCheckSize: Math.round(avgCheckSize * 100) / 100,
      avgTip: 0,
      tipPercent: 0,
      transactionCount: aggregate.transactionCount,
    });
  }

  return results;
}

/**
 * Upsert transaction summaries into the database
 */
export async function upsertTransactionSummaries(
  prisma: {
    transactionSummary: {
      upsert: (args: {
        where: { locationId_date: { locationId: string; date: Date } };
        create: Prisma.TransactionSummaryCreateInput;
        update: Prisma.TransactionSummaryUpdateInput;
      }) => Promise<unknown>;
    };
  },
  locationId: string,
  summaries: TransactionSummaryCreate[]
): Promise<{ created: number; updated: number }> {
  let updated = 0;

  for (const summary of summaries) {
    await prisma.transactionSummary.upsert({
      where: {
        locationId_date: {
          locationId,
          date: summary.date as Date,
        },
      },
      create: {
        ...summary,
        location: { connect: { id: locationId } },
      },
      update: {
        grossSales: summary.grossSales,
        discounts: summary.discounts,
        comps: summary.comps,
        voids: summary.voids,
        refunds: summary.refunds,
        netSales: summary.netSales,
        cashPayments: summary.cashPayments,
        cardPayments: summary.cardPayments,
        giftCardPayments: summary.giftCardPayments,
        otherPayments: summary.otherPayments,
        avgCheckSize: summary.avgCheckSize,
        avgTip: summary.avgTip,
        tipPercent: summary.tipPercent,
        transactionCount: summary.transactionCount,
      },
    });

    updated++;
  }

  return { created: 0, updated };
}
