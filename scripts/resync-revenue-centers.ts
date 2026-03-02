/**
 * Re-sync Toast orders to populate RevenueCenterMetrics
 *
 * Run with: npx tsx scripts/resync-revenue-centers.ts
 */

import prisma from "../src/lib/prisma";
import { syncToastData } from "../src/lib/integrations/toast/sync";

async function main() {
  // Get MCC location with Toast integration
  const location = await prisma.location.findFirst({
    where: { name: { contains: "Mon Chou" } },
    include: {
      integrations: {
        where: { type: "TOAST", status: "CONNECTED" },
      },
    },
  });

  if (!location) {
    console.log("Location not found");
    return;
  }

  const integration = location.integrations[0];
  if (!integration) {
    console.log("No Toast integration found");
    return;
  }

  console.log(`\n=== Re-syncing Revenue Centers for ${location.name} ===\n`);
  console.log(`Integration ID: ${integration.id}\n`);

  // Sync March 2025 through December 2025 (10 months)
  const months = [
    { name: "December 2025", start: new Date("2025-12-01"), end: new Date("2025-12-31") },
    { name: "November 2025", start: new Date("2025-11-01"), end: new Date("2025-11-30") },
    { name: "October 2025", start: new Date("2025-10-01"), end: new Date("2025-10-31") },
    { name: "September 2025", start: new Date("2025-09-01"), end: new Date("2025-09-30") },
    { name: "August 2025", start: new Date("2025-08-01"), end: new Date("2025-08-31") },
    { name: "July 2025", start: new Date("2025-07-01"), end: new Date("2025-07-31") },
    { name: "June 2025", start: new Date("2025-06-01"), end: new Date("2025-06-30") },
    { name: "May 2025", start: new Date("2025-05-01"), end: new Date("2025-05-31") },
    { name: "April 2025", start: new Date("2025-04-01"), end: new Date("2025-04-30") },
    { name: "March 2025", start: new Date("2025-03-01"), end: new Date("2025-03-31") },
  ];

  for (const month of months) {
    console.log(`\n--- Syncing ${month.name} ---`);
    try {
      const result = await syncToastData(integration.id, {
        startDate: month.start,
        endDate: month.end,
        dataTypes: ["orders"], // Only need orders for revenue center data
      });
      console.log(`  Orders processed: ${result.ordersProcessed}`);
      if (result.errors?.length) {
        console.log(`  Errors: ${result.errors.join(", ")}`);
      }
    } catch (error) {
      console.error(`  Error syncing ${month.name}:`, error);
    }

    // Small delay between months
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Check what we have now
  console.log("\n=== Revenue Center Metrics Summary ===\n");

  const rcMetrics = await prisma.revenueCenterMetrics.groupBy({
    by: ["revenueCenterName", "isOutdoor"],
    where: { locationId: location.id },
    _sum: { netSales: true, orderCount: true },
    _count: { date: true },
  });

  for (const rc of rcMetrics) {
    console.log(`${rc.revenueCenterName}${rc.isOutdoor ? " (OUTDOOR)" : ""}:`);
    console.log(`  Days: ${rc._count.date}`);
    console.log(`  Total Sales: $${Number(rc._sum.netSales || 0).toLocaleString()}`);
    console.log(`  Total Orders: ${rc._sum.orderCount || 0}`);
    console.log("");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
