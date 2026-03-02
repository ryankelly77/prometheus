/**
 * Validate outdoor revenue by month
 * Looking for the heat story: summer months should show lower outdoor revenue
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

  console.log(`\n=== Outdoor Terrace Revenue by Month for ${location.name} ===\n`);

  // Get outdoor revenue by month
  const outdoorByMonth = await prisma.$queryRaw<
    { month: Date; outdoor_revenue: number; orders: number; days: number }[]
  >`
    SELECT
      DATE_TRUNC('month', date) as month,
      SUM("netSales")::numeric as outdoor_revenue,
      SUM("orderCount")::int as orders,
      COUNT(DISTINCT date)::int as days
    FROM "RevenueCenterMetrics"
    WHERE "locationId" = ${location.id}
    AND "isOutdoor" = true
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month
  `;

  // Get total revenue by month for comparison
  const totalByMonth = await prisma.$queryRaw<
    { month: Date; total_revenue: number }[]
  >`
    SELECT
      DATE_TRUNC('month', date) as month,
      SUM("netSales")::numeric as total_revenue
    FROM "RevenueCenterMetrics"
    WHERE "locationId" = ${location.id}
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month
  `;

  // Create a map for total revenue lookup
  const totalMap = new Map<string, number>();
  for (const t of totalByMonth) {
    const key = t.month.toISOString().slice(0, 7);
    totalMap.set(key, Number(t.total_revenue));
  }

  // Format and display results
  console.log("Month          | Outdoor $   | Orders | Days | % of Total | Avg/Day");
  console.log("---------------|-------------|--------|------|------------|--------");

  for (const row of outdoorByMonth) {
    const monthStr = row.month.toISOString().slice(0, 7);
    const monthName = new Date(row.month).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short"
    });
    const revenue = Number(row.outdoor_revenue);
    const total = totalMap.get(monthStr) || 1;
    const pctOfTotal = ((revenue / total) * 100).toFixed(1);
    const avgPerDay = row.days > 0 ? Math.round(revenue / row.days) : 0;

    console.log(
      `${monthName.padEnd(14)} | $${revenue.toLocaleString().padStart(9)} | ${String(row.orders).padStart(6)} | ${String(row.days).padStart(4)} | ${pctOfTotal.padStart(9)}% | $${avgPerDay.toLocaleString()}`
    );
  }

  // Seasonal analysis
  console.log("\n=== Seasonal Analysis ===\n");

  const summerMonths = ["06", "07", "08", "09"]; // June-Sept
  const springFallMonths = ["03", "04", "05", "10", "11"]; // Mar-May, Oct-Nov

  let summerTotal = 0, summerDays = 0;
  let springFallTotal = 0, springFallDays = 0;

  for (const row of outdoorByMonth) {
    const month = row.month.toISOString().slice(5, 7);
    const revenue = Number(row.outdoor_revenue);

    if (summerMonths.includes(month)) {
      summerTotal += revenue;
      summerDays += row.days;
    } else if (springFallMonths.includes(month)) {
      springFallTotal += revenue;
      springFallDays += row.days;
    }
  }

  const summerAvg = summerDays > 0 ? summerTotal / summerDays : 0;
  const springFallAvg = springFallDays > 0 ? springFallTotal / springFallDays : 0;
  const heatImpact = springFallAvg > 0 ? ((summerAvg - springFallAvg) / springFallAvg) * 100 : 0;

  console.log(`Summer (Jun-Sep):     $${Math.round(summerAvg).toLocaleString()}/day avg (${summerDays} days)`);
  console.log(`Spring/Fall:          $${Math.round(springFallAvg).toLocaleString()}/day avg (${springFallDays} days)`);
  console.log(`\nHeat Impact on Outdoor: ${heatImpact.toFixed(1)}%`);

  if (heatImpact < 0) {
    console.log(`\n→ CONFIRMED: Summer heat reduces outdoor revenue by ${Math.abs(heatImpact).toFixed(1)}%`);
  } else if (heatImpact > 0) {
    console.log(`\n→ Summer shows HIGHER outdoor revenue (+${heatImpact.toFixed(1)}%)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
