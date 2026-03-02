/**
 * Quick verification of revenue center data
 */

import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== Revenue Center Metrics Summary ===\n");

  const rcMetrics = await prisma.revenueCenterMetrics.groupBy({
    by: ["revenueCenterName", "isOutdoor"],
    _sum: { netSales: true, orderCount: true },
    _count: { date: true },
  });

  if (rcMetrics.length === 0) {
    console.log("No revenue center data found yet.");
    return;
  }

  let totalSales = 0;
  let outdoorSales = 0;

  for (const rc of rcMetrics) {
    const sales = Number(rc._sum.netSales || 0);
    totalSales += sales;
    if (rc.isOutdoor) outdoorSales += sales;

    console.log(`${rc.revenueCenterName}${rc.isOutdoor ? " (OUTDOOR)" : ""}:`);
    console.log(`  Days: ${rc._count.date}`);
    console.log(`  Total Sales: $${sales.toLocaleString()}`);
    console.log(`  Total Orders: ${rc._sum.orderCount || 0}`);
    console.log("");
  }

  console.log("=== Totals ===");
  console.log(`Total Revenue: $${totalSales.toLocaleString()}`);
  console.log(`Outdoor Revenue: $${outdoorSales.toLocaleString()}`);
  console.log(`Outdoor %: ${totalSales > 0 ? ((outdoorSales / totalSales) * 100).toFixed(1) : 0}%`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
