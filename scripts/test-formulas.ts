/**
 * Multi-month formula diagnostic + service charge breakdown
 * Run with: set -a && source .env.local && npx tsx scripts/test-formulas.ts
 */

import prisma from '../src/lib/prisma';
import { createToastClient } from '../src/lib/integrations/toast/client';

interface MonthDiag {
  month: string;
  sumCheckAmount: number;
  sumServiceCharges: number;
  sumGratuityCharges: number;
  sumNonGratuityCharges: number;
  sumDeferred: number;
  sumRefunds: number;
  orderCount: number;
  formulaA: number;
  formulaB: number;
  formulaAB: number;
  formulaB_nonGrat: number; // check.amount - deferred - nonGratuityCharges - refunds
}

interface ServiceChargeType {
  count: number;
  total: number;
  isGratuity: boolean | undefined;
}

async function analyzeOrders(
  orders: any[],
  filterFn: (order: any) => boolean
): Promise<{ diag: MonthDiag; serviceChargeTypes: Record<string, ServiceChargeType> }> {
  const diag: MonthDiag = {
    month: '',
    sumCheckAmount: 0,
    sumServiceCharges: 0,
    sumGratuityCharges: 0,
    sumNonGratuityCharges: 0,
    sumDeferred: 0,
    sumRefunds: 0,
    orderCount: 0,
    formulaA: 0,
    formulaB: 0,
    formulaAB: 0,
    formulaB_nonGrat: 0,
  };

  const serviceChargeTypes: Record<string, ServiceChargeType> = {};

  for (const order of orders) {
    if (!filterFn(order)) continue;
    if (order.voided || order.deleted || order.voidDate) continue;
    diag.orderCount++;

    for (const check of order.checks ?? []) {
      if (check.voided || check.deleted || check.voidDate) continue;

      diag.sumCheckAmount += check.amount ?? 0;

      // Service charges with gratuity breakdown
      for (const sc of check.appliedServiceCharges ?? []) {
        const chargeAmt = sc.chargeAmount ?? sc.amount ?? 0;
        diag.sumServiceCharges += chargeAmt;

        if (sc.gratuity === true) {
          diag.sumGratuityCharges += chargeAmt;
        } else {
          diag.sumNonGratuityCharges += chargeAmt;
        }

        // Track by name
        const name = sc.name || 'unknown';
        if (!serviceChargeTypes[name]) {
          serviceChargeTypes[name] = { count: 0, total: 0, isGratuity: sc.gratuity };
        }
        serviceChargeTypes[name].count++;
        serviceChargeTypes[name].total += chargeAmt;
      }

      // Deferred
      for (const sel of check.selections ?? []) {
        if (sel.voided || sel.voidDate) continue;
        if (!sel.salesCategory?.guid) {
          diag.sumDeferred += (sel.price ?? 0) * (sel.quantity ?? 1);
        }
      }

      // Refunds
      for (const payment of check.payments ?? []) {
        if (payment.refund?.refundAmount > 0) {
          diag.sumRefunds += payment.refund.refundAmount;
        } else if (payment.refundAmount > 0) {
          diag.sumRefunds += payment.refundAmount;
        }
      }
    }
  }

  // Calculate formulas
  diag.formulaA = diag.sumCheckAmount - diag.sumServiceCharges - diag.sumRefunds;
  diag.formulaB = diag.sumCheckAmount - diag.sumDeferred - diag.sumRefunds;
  diag.formulaAB = diag.sumCheckAmount - diag.sumServiceCharges - diag.sumDeferred - diag.sumRefunds;
  diag.formulaB_nonGrat = diag.sumCheckAmount - diag.sumDeferred - diag.sumNonGratuityCharges - diag.sumRefunds;

  return { diag, serviceChargeTypes };
}

async function main() {
  const integration = await prisma.integration.findFirst({
    where: { type: 'TOAST', status: 'CONNECTED' },
    select: { id: true },
  });

  if (!integration) {
    console.log('No connected Toast integration found');
    return;
  }

  const client = createToastClient(integration.id);

  // Get stored data from TransactionSummary for comparison
  const storedByMonth = await prisma.transactionSummary.groupBy({
    by: ['date'],
    _sum: { netSales: true },
  });

  const storedMonthTotals: Record<string, number> = {};
  for (const row of storedByMonth) {
    const month = row.date.toISOString().slice(0, 7);
    storedMonthTotals[month] = (storedMonthTotals[month] ?? 0) + Number(row._sum.netSales ?? 0);
  }

  // Define months to analyze (Mar 2025 - Feb 2026)
  const months = [
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

  const results: MonthDiag[] = [];
  let janServiceCharges: Record<string, ServiceChargeType> = {};
  let feb27ServiceCharges: Record<string, ServiceChargeType> = {};

  for (const m of months) {
    console.log(`Fetching ${m.label}...`);

    const orders = await client.fetchAllOrders({
      startDate: new Date(`${m.start}T06:00:00.000Z`),
      endDate: new Date(`${m.end}T08:00:00.000Z`),
    });

    const { diag, serviceChargeTypes } = await analyzeOrders(orders, (o) => {
      const bd = String(o.businessDate);
      return bd >= m.bdStart && bd <= m.bdEnd;
    });

    diag.month = m.label;
    results.push(diag);

    // Save January service charges
    if (m.label === '2026-01') {
      janServiceCharges = serviceChargeTypes;
    }
  }

  // Also get Feb 27 specifically
  console.log('Fetching Feb 27 specifically...');
  const feb27Orders = await client.fetchAllOrders({
    startDate: new Date('2026-02-27T06:00:00.000Z'),
    endDate: new Date('2026-02-28T08:00:00.000Z'),
  });
  const feb27Result = await analyzeOrders(feb27Orders, (o) => String(o.businessDate) === '20260227');
  feb27ServiceCharges = feb27Result.serviceChargeTypes;

  // Print results table
  console.log('\n' + '='.repeat(140));
  console.log('MULTI-MONTH FORMULA COMPARISON');
  console.log('='.repeat(140));
  console.log('');
  console.log('| Month   | Orders | check.amt    | svcChg    | grat     | nonGrat  | deferred | refunds  | FormulaA     | FormulaB     | FormulaAB    | B+nonGrat    |');
  console.log('|---------|--------|--------------|-----------|----------|----------|----------|----------|--------------|--------------|--------------|--------------|');

  for (const r of results) {
    console.log(
      `| ${r.month} | ${r.orderCount.toString().padStart(6)} | $${r.sumCheckAmount.toFixed(0).padStart(10)} | $${r.sumServiceCharges.toFixed(0).padStart(7)} | $${r.sumGratuityCharges.toFixed(0).padStart(6)} | $${r.sumNonGratuityCharges.toFixed(0).padStart(6)} | $${r.sumDeferred.toFixed(0).padStart(6)} | $${r.sumRefunds.toFixed(0).padStart(6)} | $${r.formulaA.toFixed(0).padStart(10)} | $${r.formulaB.toFixed(0).padStart(10)} | $${r.formulaAB.toFixed(0).padStart(10)} | $${r.formulaB_nonGrat.toFixed(0).padStart(10)} |`
    );
  }

  // Service charge breakdown for January
  console.log('\n' + '='.repeat(80));
  console.log('JANUARY 2026 SERVICE CHARGES BY TYPE');
  console.log('='.repeat(80));
  console.log('');
  console.log('| Service Charge Name                      | Count | Total      | Is Gratuity |');
  console.log('|------------------------------------------|-------|------------|-------------|');
  for (const [name, data] of Object.entries(janServiceCharges).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`| ${name.padEnd(40)} | ${data.count.toString().padStart(5)} | $${data.total.toFixed(2).padStart(9)} | ${String(data.isGratuity).padStart(11)} |`);
  }

  // Service charge breakdown for Feb 27
  console.log('\n' + '='.repeat(80));
  console.log('FEB 27 SERVICE CHARGES BY TYPE');
  console.log('='.repeat(80));
  console.log('');
  console.log('| Service Charge Name                      | Count | Total      | Is Gratuity |');
  console.log('|------------------------------------------|-------|------------|-------------|');
  for (const [name, data] of Object.entries(feb27ServiceCharges).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`| ${name.padEnd(40)} | ${data.count.toString().padStart(5)} | $${data.total.toFixed(2).padStart(9)} | ${String(data.isGratuity).padStart(11)} |`);
  }

  // Summary analysis
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS');
  console.log('='.repeat(80));

  const jan = results.find(r => r.month === '2026-01')!;
  const feb = results.find(r => r.month === '2026-02')!;

  console.log('\nJanuary 2026:');
  console.log(`  Toast target: $621,744.00`);
  console.log(`  Formula A (check.amount - svcChg - refunds):           $${jan.formulaA.toFixed(2)} (gap: $${(jan.formulaA - 621744).toFixed(2)})`);
  console.log(`  Formula B (check.amount - deferred - refunds):         $${jan.formulaB.toFixed(2)} (gap: $${(jan.formulaB - 621744).toFixed(2)})`);
  console.log(`  Formula AB (check.amount - svcChg - deferred - refunds): $${jan.formulaAB.toFixed(2)} (gap: $${(jan.formulaAB - 621744).toFixed(2)})`);
  console.log(`  Formula B+nonGrat (check.amount - deferred - nonGrat - refunds): $${jan.formulaB_nonGrat.toFixed(2)} (gap: $${(jan.formulaB_nonGrat - 621744).toFixed(2)})`);

  console.log('\nFeb 27:');
  console.log(`  Toast target: $25,278.45`);
  const feb27 = feb27Result.diag;
  console.log(`  Formula A:      $${feb27.formulaA.toFixed(2)} (gap: $${(feb27.formulaA - 25278.45).toFixed(2)})`);
  console.log(`  Formula B:      $${feb27.formulaB.toFixed(2)} (gap: $${(feb27.formulaB - 25278.45).toFixed(2)})`);
  console.log(`  Formula AB:     $${feb27.formulaAB.toFixed(2)} (gap: $${(feb27.formulaAB - 25278.45).toFixed(2)})`);
  console.log(`  Formula B+nonGrat: $${feb27.formulaB_nonGrat.toFixed(2)} (gap: $${(feb27.formulaB_nonGrat - 25278.45).toFixed(2)})`);

  console.log('\nService charge composition:');
  console.log(`  January - Gratuity: $${jan.sumGratuityCharges.toFixed(2)}, Non-gratuity: $${jan.sumNonGratuityCharges.toFixed(2)}`);
  console.log(`  Feb 27  - Gratuity: $${feb27.sumGratuityCharges.toFixed(2)}, Non-gratuity: $${feb27.sumNonGratuityCharges.toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(console.error);
