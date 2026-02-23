import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ==========================================================================
  // 1. DEMO ORGANIZATION
  // ==========================================================================
  console.log("Creating demo organization...");

  const demoOrg = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Prometheus Demo",
      slug: "demo",
      primaryColor: "#6366f1",
      accentColor: "#8b5cf6",
      darkMode: true,
      plan: "ENTERPRISE",
      planSeats: 50,
      planLocations: 10,
      allowPublicSignup: false,
    },
  });

  console.log(`  ✓ Organization: ${demoOrg.name} (${demoOrg.slug})`);

  // ==========================================================================
  // 2. RESTAURANT GROUPS
  // ==========================================================================
  console.log("\nCreating restaurant groups...");

  const fineGroup = await prisma.restaurantGroup.upsert({
    where: { id: "group-fine-dining" },
    update: {},
    create: {
      id: "group-fine-dining",
      organizationId: demoOrg.id,
      name: "Fine Dining Collection",
    },
  });

  const casualGroup = await prisma.restaurantGroup.upsert({
    where: { id: "group-casual" },
    update: {},
    create: {
      id: "group-casual",
      organizationId: demoOrg.id,
      name: "Casual Concepts",
    },
  });

  console.log(`  ✓ Group: ${fineGroup.name}`);
  console.log(`  ✓ Group: ${casualGroup.name}`);

  // ==========================================================================
  // 3. LOCATIONS
  // ==========================================================================
  console.log("\nCreating locations...");

  const locations = [
    {
      id: "loc-steakhouse-downtown",
      restaurantGroupId: fineGroup.id,
      name: "The Capital Grille - Downtown",
      address: "123 Main Street",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      latitude: 41.8781,
      longitude: -87.6298,
      timezone: "America/Chicago",
      conceptType: "Steakhouse",
      isDefault: true,
    },
    {
      id: "loc-steakhouse-north",
      restaurantGroupId: fineGroup.id,
      name: "The Capital Grille - North Shore",
      address: "456 Lake Avenue",
      city: "Wilmette",
      state: "IL",
      zipCode: "60091",
      latitude: 42.0722,
      longitude: -87.7294,
      timezone: "America/Chicago",
      conceptType: "Steakhouse",
    },
    {
      id: "loc-italian",
      restaurantGroupId: fineGroup.id,
      name: "Osteria Via Stato",
      address: "789 State Street",
      city: "Chicago",
      state: "IL",
      zipCode: "60610",
      latitude: 41.8925,
      longitude: -87.6283,
      timezone: "America/Chicago",
      conceptType: "Italian",
    },
    {
      id: "loc-bistro",
      restaurantGroupId: casualGroup.id,
      name: "The Publican",
      address: "321 Fulton Market",
      city: "Chicago",
      state: "IL",
      zipCode: "60661",
      latitude: 41.8867,
      longitude: -87.6487,
      timezone: "America/Chicago",
      conceptType: "Gastropub",
    },
    {
      id: "loc-cafe",
      restaurantGroupId: casualGroup.id,
      name: "Beatrix - River North",
      address: "519 N Clark Street",
      city: "Chicago",
      state: "IL",
      zipCode: "60654",
      latitude: 41.8915,
      longitude: -87.6311,
      timezone: "America/Chicago",
      conceptType: "All-Day Cafe",
    },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: {},
      create: loc,
    });
    console.log(`  ✓ Location: ${loc.name}`);
  }

  // ==========================================================================
  // 4. TEST USERS (profiles only - auth handled by Supabase)
  // ==========================================================================
  console.log("\nCreating test user profiles...");

  const users = [
    {
      id: "user-super-admin",
      email: "admin@prometheus.app",
      fullName: "Alex Admin",
      role: "SUPER_ADMIN" as const,
    },
    {
      id: "user-partner-admin",
      email: "partner@demo.prometheus.app",
      fullName: "Pat Partner",
      role: "PARTNER_ADMIN" as const,
    },
    {
      id: "user-group-admin",
      email: "manager@demo.prometheus.app",
      fullName: "Morgan Manager",
      role: "GROUP_ADMIN" as const,
      restaurantGroupIds: [fineGroup.id],
    },
    {
      id: "user-location-manager",
      email: "location@demo.prometheus.app",
      fullName: "Lou Location",
      role: "LOCATION_MANAGER" as const,
      locationIds: ["loc-steakhouse-downtown"],
    },
    {
      id: "user-viewer",
      email: "viewer@demo.prometheus.app",
      fullName: "Val Viewer",
      role: "VIEWER" as const,
    },
  ];

  for (const user of users) {
    const profile = await prisma.userProfile.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    });

    await prisma.userOrganization.upsert({
      where: {
        userId_organizationId: {
          userId: profile.id,
          organizationId: demoOrg.id,
        },
      },
      update: {},
      create: {
        userId: profile.id,
        organizationId: demoOrg.id,
        role: user.role,
        restaurantGroupIds: user.restaurantGroupIds || [],
        locationIds: user.locationIds || [],
      },
    });

    console.log(`  ✓ User: ${user.fullName} (${user.role})`);
  }

  // ==========================================================================
  // 5. HEALTH SCORE CONFIG
  // ==========================================================================
  console.log("\nCreating health score configs...");

  const defaultWeights = {
    totalSales: 30,
    primeCost: 25,
    foodSales: 20.4,
    laborCosts: 15,
    foodCosts: 15,
    wineSales: 5.7,
    ppa: 5,
    customerLoyalty: 5,
    alcoholSales: 3.6,
    reviews: 2,
    prMentions: 2,
    websiteVisibility: 1,
    beerSales: 0.3,
  };

  for (const loc of locations) {
    await prisma.healthScoreConfig.upsert({
      where: { locationId: loc.id },
      update: {},
      create: {
        locationId: loc.id,
        weights: defaultWeights,
        targets: {
          totalSales: 500000,
          foodSales: 300000,
          alcoholSales: 150000,
          wineSales: 75000,
          beerSales: 25000,
          laborCostPercent: 28,
          foodCostPercent: 30,
          primeCostPercent: 58,
          ppa: 85,
          customerLoyaltyPercent: 35,
          averageRating: 4.5,
          reviewCount: 50,
          prMentions: 3,
          websiteVisibilityPercent: 85,
        },
        thresholds: {
          excellent: 100,
          good: 90,
          warning: 80,
          danger: 0,
        },
      },
    });
    console.log(`  ✓ HealthScoreConfig: ${loc.name}`);
  }

  // ==========================================================================
  // 6. SAMPLE MONTHLY METRICS (last 3 months)
  // ==========================================================================
  console.log("\nCreating sample monthly metrics...");

  const months = ["2025-01", "2024-12", "2024-11"];

  for (const loc of locations.slice(0, 2)) {
    // Only first 2 locations for demo
    for (const monthStr of months) {
      const baseRevenue = 450000 + Math.random() * 100000;
      const monthDate = new Date(`${monthStr}-01`);

      await prisma.monthlyMetrics.upsert({
        where: {
          locationId_month: {
            locationId: loc.id,
            month: monthDate,
          },
        },
        update: {},
        create: {
          locationId: loc.id,
          month: monthDate,

          // Sales
          totalSales: baseRevenue,
          foodSales: baseRevenue * 0.6,
          beverageSales: baseRevenue * 0.4,
          alcoholSales: baseRevenue * 0.35,
          wineSales: baseRevenue * 0.15,
          beerSales: baseRevenue * 0.08,
          liquorSales: baseRevenue * 0.12,
          nonAlcoholicBevSales: baseRevenue * 0.05,

          // Covers
          totalCovers: Math.floor(baseRevenue / 85),
          reservationCovers: Math.floor((baseRevenue / 85) * 0.7),
          walkInCovers: Math.floor((baseRevenue / 85) * 0.3),

          // Labor
          fohLaborCost: baseRevenue * 0.12,
          bohLaborCost: baseRevenue * 0.16,
          laborCost: baseRevenue * 0.28,

          // Food cost
          foodCost: baseRevenue * 0.3,

          // Calculated
          ppa: 85,
          primeCost: 58,
          laborPercent: 28,
          foodPercent: 30,
          revPash: baseRevenue / (200 * 30 * 5), // seats * days * hours

          operatingDays: 30,
        },
      });
    }
    console.log(`  ✓ MonthlyMetrics: ${loc.name} (${months.length} months)`);
  }

  // ==========================================================================
  // 7. SAMPLE HOLIDAYS
  // ==========================================================================
  console.log("\nCreating sample holidays...");

  const holidays = [
    { date: "2025-01-01", name: "New Year's Day", type: "FEDERAL" as const, isNational: true },
    { date: "2025-02-14", name: "Valentine's Day", type: "COMMERCIAL" as const, isNational: true },
    { date: "2025-05-11", name: "Mother's Day", type: "COMMERCIAL" as const, isNational: true },
    { date: "2025-06-15", name: "Father's Day", type: "COMMERCIAL" as const, isNational: true },
    { date: "2025-07-04", name: "Independence Day", type: "FEDERAL" as const, isNational: true },
    { date: "2025-11-27", name: "Thanksgiving", type: "FEDERAL" as const, isNational: true },
    { date: "2025-12-25", name: "Christmas Day", type: "FEDERAL" as const, isNational: true },
    { date: "2025-12-31", name: "New Year's Eve", type: "COMMERCIAL" as const, isNational: true },
  ];

  for (const holiday of holidays) {
    await prisma.holiday.upsert({
      where: {
        date_name: {
          date: new Date(holiday.date),
          name: holiday.name,
        },
      },
      update: {},
      create: {
        date: new Date(holiday.date),
        name: holiday.name,
        type: holiday.type,
        isNational: holiday.isNational,
        year: 2025,
      },
    });
  }
  console.log(`  ✓ Holidays: ${holidays.length} entries`);

  console.log("\n✅ Seed completed successfully!\n");

  // Print summary
  console.log("Summary:");
  console.log(`  Organizations: 1`);
  console.log(`  Restaurant Groups: 2`);
  console.log(`  Locations: ${locations.length}`);
  console.log(`  Users: ${users.length}`);
  console.log(`  Health Score Configs: ${locations.length}`);
  console.log(`  Monthly Metrics: ${locations.slice(0, 2).length * months.length}`);
  console.log(`  Holidays: ${holidays.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
