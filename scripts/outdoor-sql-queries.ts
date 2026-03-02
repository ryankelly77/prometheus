/**
 * Run SQL queries for outdoor revenue analysis
 */

import prisma from "../src/lib/prisma";

async function main() {
  // Get MCC location
  const location = await prisma.location.findFirst({
    where: { name: { contains: "Mon Chou" } },
  });

  if (!location) {
    console.log("Location not found");
    return;
  }

  // Query 1: Outdoor revenue by month
  console.log("=== Query 1: Outdoor Revenue by Month ===\n");

  const outdoorByMonth = await prisma.$queryRaw<
    { month: Date; outdoor_revenue: number; outdoor_orders: bigint; days_open: bigint }[]
  >`
    SELECT
      DATE_TRUNC('month', date) as month,
      SUM("netSales")::numeric as outdoor_revenue,
      SUM("orderCount") as outdoor_orders,
      COUNT(DISTINCT date) as days_open
    FROM "RevenueCenterMetrics"
    WHERE "locationId" = ${location.id}
    AND "isOutdoor" = true
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month
  `;

  console.log("month              | outdoor_revenue | outdoor_orders | days_open");
  console.log("-------------------|-----------------|----------------|----------");
  for (const row of outdoorByMonth) {
    const monthStr = row.month.toISOString().slice(0, 7);
    console.log(
      `${monthStr}            | $${Number(row.outdoor_revenue).toLocaleString().padStart(12)} | ${String(row.outdoor_orders).padStart(14)} | ${String(row.days_open).padStart(9)}`
    );
  }

  // Query 2: Outdoor as percentage of total by month
  console.log("\n\n=== Query 2: Outdoor % of Total by Month ===\n");

  const outdoorPctByMonth = await prisma.$queryRaw<
    { month: Date; outdoor_revenue: number; total_revenue: number; outdoor_pct: number }[]
  >`
    SELECT
      o.month,
      o.outdoor_revenue,
      t.total_revenue,
      ROUND(o.outdoor_revenue / t.total_revenue * 100, 1) as outdoor_pct
    FROM (
      SELECT DATE_TRUNC('month', date) as month, SUM("netSales")::numeric as outdoor_revenue
      FROM "RevenueCenterMetrics"
      WHERE "locationId" = ${location.id} AND "isOutdoor" = true
      GROUP BY DATE_TRUNC('month', date)
    ) o
    JOIN (
      SELECT DATE_TRUNC('month', date) as month, SUM("netSales")::numeric as total_revenue
      FROM "RevenueCenterMetrics"
      WHERE "locationId" = ${location.id}
      GROUP BY DATE_TRUNC('month', date)
    ) t ON o.month = t.month
    ORDER BY o.month
  `;

  console.log("month      | outdoor_revenue | total_revenue   | outdoor_pct");
  console.log("-----------|-----------------|-----------------|------------");
  for (const row of outdoorPctByMonth) {
    const monthStr = row.month.toISOString().slice(0, 7);
    const season = getSeason(row.month);
    console.log(
      `${monthStr}    | $${Number(row.outdoor_revenue).toLocaleString().padStart(12)} | $${Number(row.total_revenue).toLocaleString().padStart(12)} | ${Number(row.outdoor_pct).toFixed(1).padStart(9)}%  ${season}`
    );
  }

  // Summary
  console.log("\n\n=== THE HEAT STORY ===\n");

  const summer = outdoorPctByMonth.filter(r => {
    const m = r.month.getMonth();
    return m >= 5 && m <= 8; // June-Sept (0-indexed)
  });

  const springFall = outdoorPctByMonth.filter(r => {
    const m = r.month.getMonth();
    return (m >= 2 && m <= 4) || (m >= 9 && m <= 10); // Mar-May, Oct-Nov
  });

  const summerAvgPct = summer.reduce((s, r) => s + Number(r.outdoor_pct), 0) / summer.length;
  const springFallAvgPct = springFall.reduce((s, r) => s + Number(r.outdoor_pct), 0) / springFall.length;

  console.log(`Summer (Jun-Sep) avg outdoor %:     ${summerAvgPct.toFixed(1)}%`);
  console.log(`Spring/Fall avg outdoor %:          ${springFallAvgPct.toFixed(1)}%`);
  console.log(`\nDrop in summer:                     ${(springFallAvgPct - summerAvgPct).toFixed(1)} percentage points`);
  console.log(`Relative decline:                   ${(((summerAvgPct - springFallAvgPct) / springFallAvgPct) * 100).toFixed(1)}%`);
}

function getSeason(date: Date): string {
  const m = date.getMonth();
  if (m >= 5 && m <= 8) return "☀️ SUMMER";
  if (m >= 2 && m <= 4) return "🌸 SPRING";
  if (m >= 9 && m <= 10) return "🍂 FALL";
  return "❄️ WINTER";
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
