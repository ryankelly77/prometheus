/**
 * Re-sync all months with Formula B (check.amount - deferred - refunds)
 *
 * This script re-syncs all historical data after updating the revenue formula.
 * Run with: set -a && source .env.local && npx tsx scripts/resync-all-months.ts
 */

import prisma from '../src/lib/prisma';
import { createToastClient } from '../src/lib/integrations/toast/client';
import {
  aggregateOrdersByDaypart,
  aggregateOrdersToTransactions,
  mapDaypartAggregatesToPrisma,
  mapTransactionAggregatesToPrisma,
  resetExclusionCounters,
  resetVoidedOrdersCounter,
  resetVoidAndRefundCounters,
} from '../src/lib/integrations/toast/mappers/orders';

interface MonthConfig {
  label: string;
  start: string;
  end: string;
  bdStart: string;
  bdEnd: string;
}

async function main() {
  const integration = await prisma.integration.findFirst({
    where: { type: 'TOAST', status: 'CONNECTED' },
    select: { id: true, locationId: true },
  });

  if (!integration || !integration.locationId) {
    console.log('No connected Toast integration found');
    return;
  }

  const client = createToastClient(integration.id);
  const locationId = integration.locationId;

  // Define all months to sync (Mar 2025 - Feb 2026)
  const months: MonthConfig[] = [
    { label: '2025-03', start: '2025-03-01', end: '2025-04-01', bdStart: '20250301', bdEnd: '20250331' },
    { label: '2025-04', start: '2025-04-01', end: '2025-05-01', bdStart: '20250401', bdEnd: '20250430' },
    { label: '2025-05', start: '2025-05-01', end: '2025-06-01', bdStart: '20250501', bdEnd: '20250531' },
    { label: '2025-06', start: '2025-06-01', end: '2025-07-01', bdStart: '20250601', bdEnd: '20250630' },
    { label: '2025-07', start: '2025-07-01', end: '2025-08-01', bdStart: '20250701', bdEnd: '20250731' },
    { label: '2025-08', start: '2025-08-01', end: '2025-09-01', bdStart: '20250801', bdEnd: '20250831' },
    { label: '2025-09', start: '2025-09-01', end: '2025-10-01', bdStart: '20250901', bdEnd: '20250930' },
    { label: '2025-10', start: '2025-10-01', end: '2025-11-01', bdStart: '20251001', bdEnd: '20251031' },
    { label: '2025-11', start: '2025-11-01', end: '2025-12-01', bdStart: '20251101', bdEnd: '20251130' },
    { label: '2025-12', start: '2025-12-01', end: '2026-01-01', bdStart: '20251201', bdEnd: '20251231' },
    { label: '2026-01', start: '2026-01-01', end: '2026-02-01', bdStart: '20260101', bdEnd: '20260131' },
    { label: '2026-02', start: '2026-02-01', end: '2026-03-01', bdStart: '20260201', bdEnd: '20260228' },
  ];

  console.log('='.repeat(80));
  console.log('RE-SYNCING ALL MONTHS WITH FORMULA B');
  console.log('Formula: Net Sales = check.amount - deferred - refunds');
  console.log('='.repeat(80));
  console.log('');

  const results: { month: string; netSales: number; orders: number }[] = [];

  for (const m of months) {
    console.log(`\n[${m.label}] Fetching orders...`);

    // Reset counters for each month
    resetExclusionCounters();
    resetVoidedOrdersCounter();
    resetVoidAndRefundCounters();

    // Fetch orders
    const orders = await client.fetchAllOrders({
      startDate: new Date(`${m.start}T06:00:00.000Z`),
      endDate: new Date(`${m.end}T08:00:00.000Z`),
    });

    // Filter to this month's business dates
    const filteredOrders = orders.filter((o) => {
      const bd = String(o.businessDate);
      return bd >= m.bdStart && bd <= m.bdEnd;
    });

    console.log(`[${m.label}] Processing ${filteredOrders.length} orders...`);

    // Aggregate
    const daypartAggregates = aggregateOrdersByDaypart(filteredOrders, locationId);
    const transactionAggregates = aggregateOrdersToTransactions(filteredOrders);

    // Map to Prisma
    const daypartRecords = mapDaypartAggregatesToPrisma(daypartAggregates, locationId);
    const transactionRecords = mapTransactionAggregatesToPrisma(transactionAggregates, locationId);

    // Calculate totals
    const totalNetSales = transactionRecords.reduce((sum, r) => sum + Number(r.netSales), 0);
    results.push({ month: m.label, netSales: totalNetSales, orders: filteredOrders.length });

    // Delete old records for this month's date range
    const startDate = new Date(`${m.start}T00:00:00.000Z`);
    const endDate = new Date(`${m.end}T00:00:00.000Z`);

    await prisma.daypartMetrics.deleteMany({
      where: {
        locationId,
        date: { gte: startDate, lt: endDate },
      },
    });

    await prisma.transactionSummary.deleteMany({
      where: {
        locationId,
        date: { gte: startDate, lt: endDate },
      },
    });

    // Insert new records
    if (daypartRecords.length > 0) {
      await prisma.daypartMetrics.createMany({ data: daypartRecords });
    }

    if (transactionRecords.length > 0) {
      await prisma.transactionSummary.createMany({ data: transactionRecords });
    }

    console.log(`[${m.label}] Saved ${daypartRecords.length} daypart records, ${transactionRecords.length} transaction records`);
    console.log(`[${m.label}] Net Sales: $${totalNetSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('RE-SYNC COMPLETE - FORMULA B RESULTS');
  console.log('='.repeat(80));
  console.log('');
  console.log('| Month   | Orders | Net Sales (Formula B) |');
  console.log('|---------|--------|----------------------|');
  for (const r of results) {
    console.log(`| ${r.month} | ${r.orders.toString().padStart(6)} | $${r.netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(18)} |`);
  }

  // Verify Feb 27 specifically
  console.log('\n' + '='.repeat(80));
  console.log('FEB 27 VERIFICATION');
  console.log('='.repeat(80));

  const feb27 = await prisma.transactionSummary.findFirst({
    where: {
      locationId,
      date: new Date('2026-02-27'),
    },
    select: {
      date: true,
      netSales: true,
      grossSales: true,
      refunds: true,
      deferredRevenue: true,
      serviceCharges: true,
    },
  });

  if (feb27) {
    console.log('');
    console.log(`Date:             ${feb27.date.toISOString().slice(0, 10)}`);
    console.log(`Net Sales:        $${Number(feb27.netSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Gross Sales:      $${Number(feb27.grossSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Deferred:         $${Number(feb27.deferredRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Refunds:          $${Number(feb27.refunds).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Service Charges:  $${Number(feb27.serviceCharges).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (not subtracted)`);
    console.log('');
    console.log(`Toast Target:     $25,278.45`);
    const gap = Number(feb27.netSales) - 25278.45;
    console.log(`Gap:              $${gap.toFixed(2)} (${((gap / 25278.45) * 100).toFixed(2)}%)`);
  } else {
    console.log('Feb 27 record not found!');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
