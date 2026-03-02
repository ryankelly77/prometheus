/**
 * Check Revenue Center Data from Toast API
 *
 * Task: Investigate what revenue center data is available in Toast orders
 */

import prisma from "../src/lib/prisma";
import { createToastClient } from "../src/lib/integrations/toast/client";
import { getToastConfig } from "../src/lib/integrations/toast/auth";

async function main() {
  // Get MCC location
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

  console.log(`\n=== Checking Revenue Centers for ${location.name} ===\n`);

  // Create client and fetch config
  const client = createToastClient(integration.id);
  const config = await getToastConfig(integration.id);

  // Log configured revenue centers
  console.log("=== CONFIGURED REVENUE CENTERS ===");
  console.log(JSON.stringify(config?.revenueCenters, null, 2));
  console.log("\n");

  // Fetch a sample of orders from Feb 27
  const startDate = new Date("2026-02-27T00:00:00");
  const endDate = new Date("2026-02-27T23:59:59");

  console.log(`=== FETCHING ORDERS FOR ${startDate.toISOString().slice(0, 10)} ===\n`);

  const orders = await client.fetchAllOrders({ startDate, endDate });
  console.log(`Fetched ${orders.length} orders\n`);

  // Track unique revenue centers seen
  const revenueCentersFound: Record<string, { name?: string; count: number; totalRevenue: number }> = {};
  const diningOptionsFound: Record<string, { count: number }> = {};

  // Sample first 10 orders for detailed view
  console.log("=== SAMPLE ORDERS (first 10) ===\n");

  for (let i = 0; i < Math.min(10, orders.length); i++) {
    const order = orders[i];

    console.log(`Order #${i + 1}:`, {
      orderId: order.guid.slice(0, 8),
      businessDate: order.businessDate,
      // Revenue center fields
      revenueCenter: order.revenueCenter,
      revenueCenterGuid: order.revenueCenter?.guid,
      revenueCenterName: order.revenueCenter?.name,
      // Other location-related fields
      diningOption: order.diningOption?.name,
      table: order.table?.name,
      serviceArea: order.serviceArea,
      restaurantService: order.restaurantService,
    });
    console.log("");
  }

  // Aggregate all orders by revenue center
  console.log("=== AGGREGATING ALL ORDERS BY REVENUE CENTER ===\n");

  for (const order of orders) {
    if (order.deleted || order.voided) continue;

    const rcGuid = order.revenueCenter?.guid || "NO_REVENUE_CENTER";
    const rcName = order.revenueCenter?.name ||
                   (config?.revenueCenters?.[order.revenueCenter?.guid || ""] ?? "Unknown");

    if (!revenueCentersFound[rcGuid]) {
      revenueCentersFound[rcGuid] = { name: rcName, count: 0, totalRevenue: 0 };
    }
    revenueCentersFound[rcGuid].count++;

    // Sum check amounts
    for (const check of order.checks || []) {
      if (!check.deleted && !check.voided) {
        revenueCentersFound[rcGuid].totalRevenue += check.amount || 0;
      }
    }

    // Track dining options too
    const doName = order.diningOption?.name || "NO_DINING_OPTION";
    if (!diningOptionsFound[doName]) {
      diningOptionsFound[doName] = { count: 0 };
    }
    diningOptionsFound[doName].count++;
  }

  console.log("Revenue Centers Summary:");
  console.log("------------------------");
  for (const [guid, data] of Object.entries(revenueCentersFound)) {
    console.log(`  ${data.name || guid}:`);
    console.log(`    Orders: ${data.count}`);
    console.log(`    Revenue: $${data.totalRevenue.toLocaleString()}`);
    console.log(`    GUID: ${guid}`);
    console.log("");
  }

  console.log("\nDining Options Summary:");
  console.log("------------------------");
  for (const [name, data] of Object.entries(diningOptionsFound)) {
    console.log(`  ${name}: ${data.count} orders`);
  }

  console.log("\n=== REPORT ===\n");
  console.log("1. Do we currently store revenue by area?");
  console.log("   NO - We aggregate by daypart (BREAKFAST, LUNCH, DINNER, etc.)");
  console.log("   but NOT by revenue center (Bar, Patio, Main Dining, etc.)");
  console.log("");
  console.log("2. Is revenue center data available in Toast API?");
  console.log(`   ${Object.keys(revenueCentersFound).length > 1 ? "YES" : "UNCLEAR"} - See summary above`);
  console.log("");
  console.log("3. Field name in Toast API:");
  console.log("   order.revenueCenter = { guid: string, name?: string }");
  console.log("   (name may need lookup via config.revenueCenters mapping)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
