import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { createClient } from "@supabase/supabase-js";

// Prisma 7 requires an adapter for direct database connections
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Supabase admin client for creating auth users
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Default password for demo users (change in production!)
const DEFAULT_PASSWORD = "Demo123!@#";

interface UserSeedData {
  email: string;
  fullName: string;
  role: "SUPER_ADMIN" | "PARTNER_ADMIN" | "GROUP_ADMIN" | "LOCATION_MANAGER" | "VIEWER";
  restaurantGroupIds?: string[];
  locationIds?: string[];
}

/**
 * Create or get a Supabase auth user and return their UUID.
 */
async function getOrCreateAuthUser(email: string, fullName: string): Promise<string> {
  // First, check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    console.log(`    (existing auth user: ${existingUser.id})`);
    return existingUser.id;
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true, // Auto-confirm email
    user_metadata: { full_name: fullName },
  });

  if (error) {
    throw new Error(`Failed to create auth user ${email}: ${error.message}`);
  }

  console.log(`    (created auth user: ${data.user.id})`);
  return data.user.id;
}

async function cleanupExistingData() {
  console.log("🧹 Cleaning up existing data (preserving ryan@pearanalytics.com)...\n");

  // Get ryan's user ID to preserve
  const ryanProfile = await prisma.userProfile.findUnique({
    where: { email: "ryan@pearanalytics.com" },
  });

  // Delete in order to respect foreign keys
  await prisma.aIInsight.deleteMany({});
  await prisma.healthScoreHistory.deleteMany({});
  await prisma.healthScoreConfig.deleteMany({});
  await prisma.monthlyMetrics.deleteMany({});
  await prisma.reviewMetrics.deleteMany({});
  await prisma.customerLoyalty.deleteMany({});
  await prisma.websiteVisibility.deleteMany({});
  await prisma.pRMention.deleteMany({});
  await prisma.integration.deleteMany({});
  // Warehouse tables
  await prisma.insightCache.deleteMany({});
  await prisma.seatingArea.deleteMany({});
  await prisma.categorySales.deleteMany({});
  await prisma.transactionSummary.deleteMany({});
  await prisma.laborDetail.deleteMany({});
  await prisma.menuItemSales.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.menuCategory.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.restaurantGroup.deleteMany({});

  // Delete user org memberships except ryan's
  if (ryanProfile) {
    await prisma.userOrganization.deleteMany({
      where: { userId: { not: ryanProfile.id } },
    });
  } else {
    await prisma.userOrganization.deleteMany({});
  }

  // Delete user profiles except ryan's
  await prisma.userProfile.deleteMany({
    where: { email: { not: "ryan@pearanalytics.com" } },
  });

  // Delete organizations
  await prisma.organization.deleteMany({});

  console.log("  ✓ Cleanup complete\n");
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // Verify Supabase connection
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  // Clean up existing data first
  await cleanupExistingData();

  // ==========================================================================
  // 1. ORGANIZATION
  // ==========================================================================
  console.log("Creating organization...");

  const org = await prisma.organization.create({
    data: {
      name: "Southerleigh Hospitality Group",
      slug: "southerleigh",
      primaryColor: "#1e3a5f",
      accentColor: "#c9a962",
      darkMode: true,
      plan: "ENTERPRISE",
      planSeats: 50,
      planLocations: 10,
      allowPublicSignup: false,
    },
  });

  console.log(`  ✓ Organization: ${org.name} (${org.slug})`);

  // ==========================================================================
  // 2. RESTAURANT GROUP
  // ==========================================================================
  console.log("\nCreating restaurant group...");

  const group = await prisma.restaurantGroup.create({
    data: {
      id: "group-southerleigh-concepts",
      organizationId: org.id,
      name: "Southerleigh Concepts",
    },
  });

  console.log(`  ✓ Group: ${group.name}`);

  // ==========================================================================
  // 3. LOCATIONS
  // ==========================================================================
  console.log("\nCreating locations...");

  const locations = [
    {
      id: "loc-southerleigh-brewery",
      restaurantGroupId: group.id,
      name: "Southerleigh Fine Food & Brewery",
      address: "136 E Grayson St, Pearl District",
      city: "San Antonio",
      state: "TX",
      zipCode: "78215",
      latitude: 29.4438,
      longitude: -98.4813,
      timezone: "America/Chicago",
      conceptType: "Brewery & Restaurant",
      isDefault: true,
    },
    {
      id: "loc-southerleigh-haute-south",
      restaurantGroupId: group.id,
      name: "Southerleigh Haute South",
      address: "17619 La Cantera Pkwy, The Rim",
      city: "San Antonio",
      state: "TX",
      zipCode: "78257",
      latitude: 29.5996,
      longitude: -98.6194,
      timezone: "America/Chicago",
      conceptType: "Southern Cuisine",
    },
    {
      id: "loc-mon-chou-chou",
      restaurantGroupId: group.id,
      name: "Brasserie Mon Chou Chou",
      address: "312 Pearl Pkwy, Pearl District",
      city: "San Antonio",
      state: "TX",
      zipCode: "78215",
      latitude: 29.4427,
      longitude: -98.4786,
      timezone: "America/Chicago",
      conceptType: "French Brasserie",
    },
    {
      id: "loc-boilerhouse",
      restaurantGroupId: group.id,
      name: "BoilerHouse Texas Grill & Wine Garden",
      address: "312 Pearl Pkwy Bldg 3, Pearl District",
      city: "San Antonio",
      state: "TX",
      zipCode: "78215",
      latitude: 29.4431,
      longitude: -98.4791,
      timezone: "America/Chicago",
      conceptType: "Texas Grill",
    },
  ];

  for (const loc of locations) {
    await prisma.location.create({
      data: loc,
    });
    console.log(`  ✓ Location: ${loc.name}`);
  }

  // ==========================================================================
  // 4. TEST USERS (Supabase Auth + UserProfile)
  // ==========================================================================
  console.log("\nCreating test users (Supabase Auth + UserProfile)...");

  const users: UserSeedData[] = [
    {
      email: "ryan@pearanalytics.com",
      fullName: "Ryan Kelly",
      role: "SUPER_ADMIN",
    },
    {
      email: "partner@southerleigh.com",
      fullName: "Jeff Balfour",
      role: "PARTNER_ADMIN",
    },
    {
      email: "manager@southerleigh.com",
      fullName: "Sarah Manager",
      role: "GROUP_ADMIN",
      restaurantGroupIds: [group.id],
    },
    {
      email: "brewery@southerleigh.com",
      fullName: "Mike Brewery",
      role: "LOCATION_MANAGER",
      locationIds: ["loc-southerleigh-brewery"],
    },
  ];

  for (const user of users) {
    // Create or get Supabase auth user (returns UUID)
    const authUserId = await getOrCreateAuthUser(user.email, user.fullName);

    // Check if a profile exists with a different ID (old cuid)
    const existingProfile = await prisma.userProfile.findUnique({
      where: { email: user.email },
    });

    if (existingProfile && existingProfile.id !== authUserId) {
      // Delete old profile and its org memberships to allow recreation with correct UUID
      await prisma.userOrganization.deleteMany({
        where: { userId: existingProfile.id },
      });
      await prisma.userProfile.delete({
        where: { id: existingProfile.id },
      });
      console.log(`    (migrated old profile ${existingProfile.id} → ${authUserId})`);
    }

    // Create UserProfile with matching UUID
    const profile = await prisma.userProfile.upsert({
      where: { id: authUserId },
      update: {
        email: user.email,
        fullName: user.fullName,
      },
      create: {
        id: authUserId,
        email: user.email,
        fullName: user.fullName,
      },
    });

    // Create organization membership
    await prisma.userOrganization.upsert({
      where: {
        userId_organizationId: {
          userId: profile.id,
          organizationId: org.id,
        },
      },
      update: {
        role: user.role,
        restaurantGroupIds: user.restaurantGroupIds || [],
        locationIds: user.locationIds || [],
      },
      create: {
        userId: profile.id,
        organizationId: org.id,
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

  // Location-specific targets
  const locationTargets: Record<string, { totalSales: number; ppa: number }> = {
    "loc-southerleigh-brewery": { totalSales: 750000, ppa: 75 },
    "loc-southerleigh-haute-south": { totalSales: 650000, ppa: 80 },
    "loc-mon-chou-chou": { totalSales: 550000, ppa: 95 },
    "loc-boilerhouse": { totalSales: 600000, ppa: 85 },
  };

  for (const loc of locations) {
    const targets = locationTargets[loc.id] || { totalSales: 500000, ppa: 80 };
    await prisma.healthScoreConfig.create({
      data: {
        locationId: loc.id,
        weights: defaultWeights,
        targets: {
          totalSales: targets.totalSales,
          foodSales: targets.totalSales * 0.6,
          alcoholSales: targets.totalSales * 0.35,
          wineSales: targets.totalSales * 0.15,
          beerSales: targets.totalSales * 0.08,
          laborCostPercent: 28,
          foodCostPercent: 30,
          primeCostPercent: 58,
          ppa: targets.ppa,
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
  // 6. MONTHLY METRICS (current month and 2 prior months)
  // ==========================================================================
  console.log("\nCreating monthly metrics...");

  // Use current date to generate relative months
  const now = new Date();
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const priorMonth1Date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const priorMonth2Date = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const months = [
    { date: priorMonth2Date, label: `${priorMonth2Date.toLocaleString('default', { month: 'short' })} ${priorMonth2Date.getFullYear()}` },
    { date: priorMonth1Date, label: `${priorMonth1Date.toLocaleString('default', { month: 'short' })} ${priorMonth1Date.getFullYear()}` },
    { date: currentMonthDate, label: `${currentMonthDate.toLocaleString('default', { month: 'short' })} ${currentMonthDate.getFullYear()}` },
  ];

  // Location-specific data profiles with exact metrics
  interface LocationProfile {
    baseSales: number;
    trend: number;  // percentage change per month
    laborPercent: number;
    foodCostPercent: number;
    primeCost: number;
    foodSalesPercent: number;
    ppaTarget: number;
    beerSalesPercent: number;  // of beverage sales
    wineSalesPercent: number;  // of beverage sales
  }

  const locationProfiles: Record<string, LocationProfile> = {
    // Southerleigh Fine Food & Brewery - Flagship brewpub
    // Health Score: 94% (Good), strong beer sales
    "loc-southerleigh-brewery": {
      baseSales: 720000,
      trend: 0.032,  // +3.2%
      laborPercent: 0.29,
      foodCostPercent: 0.30,
      primeCost: 59,
      foodSalesPercent: 0.58,
      ppaTarget: 78,
      beerSalesPercent: 0.45,  // Strong beer (brewpub)
      wineSalesPercent: 0.20,
    },
    // Brasserie Mon Chou Chou - French brasserie
    // Health Score: 102% (Excellent), best performer, high wine sales
    "loc-mon-chou-chou": {
      baseSales: 580000,
      trend: 0.081,  // +8.1%
      laborPercent: 0.27,
      foodCostPercent: 0.28,
      primeCost: 55,
      foodSalesPercent: 0.55,
      ppaTarget: 95,
      beerSalesPercent: 0.15,
      wineSalesPercent: 0.55,  // High wine sales (French)
    },
    // BoilerHouse Texas Grill & Wine Garden
    // Health Score: 87% (Warning), labor costs too high
    "loc-boilerhouse": {
      baseSales: 650000,
      trend: -0.024,  // -2.4%
      laborPercent: 0.32,  // Too high!
      foodCostPercent: 0.32,  // Also high
      primeCost: 64,  // Over target
      foodSalesPercent: 0.60,
      ppaTarget: 85,
      beerSalesPercent: 0.25,
      wineSalesPercent: 0.45,  // Good wine program
    },
    // Southerleigh Haute South - Newer location
    // Health Score: 91% (Good), ramping up
    "loc-southerleigh-haute-south": {
      baseSales: 480000,
      trend: 0.018,  // +1.8%
      laborPercent: 0.30,
      foodCostPercent: 0.31,
      primeCost: 61,
      foodSalesPercent: 0.62,
      ppaTarget: 72,
      beerSalesPercent: 0.30,
      wineSalesPercent: 0.25,
    },
  };

  for (const loc of locations) {
    const profile = locationProfiles[loc.id];

    for (let i = 0; i < months.length; i++) {
      const month = months[i];
      const monthDate = month.date;

      // Calculate sales with trend (apply trend progressively)
      const trendMultiplier = 1 + (profile.trend * (i - 1)); // i=0 is 2 months ago, i=2 is current
      const totalSales = Math.round(profile.baseSales * trendMultiplier);

      const foodSales = Math.round(totalSales * profile.foodSalesPercent);
      const beverageSales = totalSales - foodSales;

      const laborCost = Math.round(totalSales * profile.laborPercent);
      const foodCost = Math.round(foodSales * profile.foodCostPercent);

      const covers = Math.floor(totalSales / profile.ppaTarget);
      const ppa = Math.round((totalSales / covers) * 100) / 100;

      // Beverage breakdown
      const alcoholSales = Math.round(beverageSales * 0.88);
      const wineSales = Math.round(beverageSales * profile.wineSalesPercent);
      const beerSales = Math.round(beverageSales * profile.beerSalesPercent);
      const liquorSales = alcoholSales - wineSales - beerSales;
      const nonAlcoholicBevSales = beverageSales - alcoholSales;

      await prisma.monthlyMetrics.create({
        data: {
          locationId: loc.id,
          month: monthDate,
          totalSales,
          foodSales,
          beverageSales,
          alcoholSales,
          wineSales,
          beerSales,
          liquorSales,
          nonAlcoholicBevSales,
          totalCovers: covers,
          reservationCovers: Math.floor(covers * 0.65),
          walkInCovers: Math.floor(covers * 0.35),
          fohLaborCost: Math.round(laborCost * 0.45),
          bohLaborCost: Math.round(laborCost * 0.55),
          laborCost,
          foodCost,
          ppa,
          primeCost: profile.primeCost,
          laborPercent: Math.round(profile.laborPercent * 100),
          foodPercent: Math.round(profile.foodCostPercent * 100),
          revPash: Math.round((totalSales / (150 * 30 * 6)) * 100) / 100,
          operatingDays: monthDate.getMonth() === 1 ? 28 : 30,
        },
      });
    }
    console.log(`  ✓ MonthlyMetrics: ${loc.name} (3 months)`);
  }

  // ==========================================================================
  // 7. HEALTH SCORE HISTORY
  // ==========================================================================
  console.log("\nCreating health score history...");

  // Health scores matching the location profiles (current month is last value)
  const healthScores: Record<string, number[]> = {
    "loc-southerleigh-brewery": [91, 93, 94],       // Good, improving → 94%
    "loc-mon-chou-chou": [96, 99, 102],             // Excellent, best performer → 102%
    "loc-boilerhouse": [90, 88, 87],                // Warning, declining → 87%
    "loc-southerleigh-haute-south": [89, 90, 91],   // Good, ramping up → 91%
  };

  function getHealthStatus(score: number): "EXCELLENT" | "GOOD" | "WARNING" | "DANGER" {
    if (score >= 100) return "EXCELLENT";
    if (score >= 90) return "GOOD";
    if (score >= 80) return "WARNING";
    return "DANGER";
  }

  for (const loc of locations) {
    const scores = healthScores[loc.id];

    for (let i = 0; i < months.length; i++) {
      const monthDate = months[i].date;
      const score = scores[i];
      const previousScore = i > 0 ? scores[i - 1] : null;

      await prisma.healthScoreHistory.create({
        data: {
          locationId: loc.id,
          month: monthDate,
          overallScore: score,
          baseScore: score,
          status: getHealthStatus(score),
          previousScore: previousScore,
          scoreDelta: previousScore ? score - previousScore : null,
          trend: previousScore ? (score > previousScore ? "UP" : score < previousScore ? "DOWN" : "FLAT") : null,
          metricScores: {
            totalSales: { score: score + Math.random() * 5 - 2.5, weight: 30, weighted: (score * 0.3) },
            primeCost: { score: score + Math.random() * 5 - 2.5, weight: 25, weighted: (score * 0.25) },
            foodSales: { score: score + Math.random() * 5 - 2.5, weight: 20.4, weighted: (score * 0.204) },
          },
          calculatedAt: monthDate,
        },
      });
    }
    console.log(`  ✓ HealthScoreHistory: ${loc.name}`);
  }

  // ==========================================================================
  // 8. AI PROMPT (required for insights)
  // ==========================================================================
  console.log("\nCreating AI prompt...");

  const aiPrompt = await prisma.aIPrompt.create({
    data: {
      organizationId: org.id,
      name: "System Generated Insight",
      slug: "system-insight",
      description: "Auto-generated insights from Prometheus analytics",
      systemPrompt: "You are a restaurant analytics assistant.",
      userPromptTemplate: "Analyze the following metrics and provide insights.",
      category: "METRIC_ANALYSIS",
      model: "claude-sonnet-4-5-20250929",
      maxTokens: 1024,
      isActive: true,
      version: 1,
    },
  });
  console.log(`  ✓ AIPrompt: ${aiPrompt.name}`);

  // ==========================================================================
  // 9. AI INSIGHTS
  // ==========================================================================
  console.log("\nCreating AI insights...");

  const insightsData: Array<{
    locationId: string;
    insights: Array<{
      title: string;
      content: string;
      urgency: "HIGH" | "MEDIUM" | "LOW" | "INFO";
      sentiment: "POSITIVE" | "NEUTRAL" | "CAUTIONARY" | "NEGATIVE";
      hoursAgo: number;
    }>;
  }> = [
    {
      locationId: "loc-southerleigh-brewery",
      insights: [
        {
          title: "Labor costs trending above target",
          content: "Labor costs exceeded target by 8% this month, primarily driven by overtime in the kitchen. Consider reviewing scheduling efficiency.",
          urgency: "HIGH",
          sentiment: "CAUTIONARY",
          hoursAgo: 2,
        },
        {
          title: "Strong weekend performance",
          content: "Weekend dinner covers up 12% vs last month. Friday and Saturday are showing consistent growth.",
          urgency: "LOW",
          sentiment: "POSITIVE",
          hoursAgo: 18,
        },
        {
          title: "Beer sales outperforming",
          content: "House-brewed beers now represent 35% of beverage sales, up from 28% last quarter. Consider expanding tap selection.",
          urgency: "INFO",
          sentiment: "POSITIVE",
          hoursAgo: 48,
        },
      ],
    },
    {
      locationId: "loc-southerleigh-haute-south",
      insights: [
        {
          title: "Review response rate declining",
          content: "Google review response rate dropped below 50%. Aim to respond to all reviews within 24 hours to maintain engagement.",
          urgency: "MEDIUM",
          sentiment: "CAUTIONARY",
          hoursAgo: 5,
        },
        {
          title: "Lunch covers underperforming",
          content: "Weekday lunch traffic down 15% compared to same period last year. Consider lunch specials or marketing push.",
          urgency: "HIGH",
          sentiment: "NEGATIVE",
          hoursAgo: 12,
        },
        {
          title: "Private events driving revenue",
          content: "Private event bookings up 25% this quarter, contributing an additional $45K in revenue.",
          urgency: "LOW",
          sentiment: "POSITIVE",
          hoursAgo: 72,
        },
      ],
    },
    {
      locationId: "loc-mon-chou-chou",
      insights: [
        {
          title: "Food cost improvement",
          content: "Food cost improved 2.1% after menu price adjustment. New pricing strategy is showing results without impacting covers.",
          urgency: "LOW",
          sentiment: "POSITIVE",
          hoursAgo: 8,
        },
        {
          title: "Wine program excellence",
          content: "Wine sales per cover increased 18% following sommelier training program. Guest wine attachment rate now at 42%.",
          urgency: "INFO",
          sentiment: "POSITIVE",
          hoursAgo: 24,
        },
        {
          title: "Brunch service opportunity",
          content: "Weekend brunch shows 94% table utilization. Consider adding Thursday brunch service to capture demand.",
          urgency: "MEDIUM",
          sentiment: "NEUTRAL",
          hoursAgo: 36,
        },
        {
          title: "High guest satisfaction",
          content: "Average Google rating increased to 4.7 stars with 89% positive sentiment in recent reviews.",
          urgency: "INFO",
          sentiment: "POSITIVE",
          hoursAgo: 96,
        },
      ],
    },
    {
      locationId: "loc-boilerhouse",
      insights: [
        {
          title: "Prime cost at target",
          content: "Prime cost holding steady at 57.8%, just under the 58% target. Strong operational discipline this month.",
          urgency: "LOW",
          sentiment: "POSITIVE",
          hoursAgo: 4,
        },
        {
          title: "Wine inventory adjustment needed",
          content: "Several high-margin wines approaching optimal drinking windows. Consider featuring in wine dinner or promotion.",
          urgency: "MEDIUM",
          sentiment: "NEUTRAL",
          hoursAgo: 16,
        },
        {
          title: "PPA growth opportunity",
          content: "Current PPA of $82 is below $85 target. Upselling training could help close the gap.",
          urgency: "MEDIUM",
          sentiment: "CAUTIONARY",
          hoursAgo: 28,
        },
        {
          title: "Patio season preparation",
          content: "Historical data shows 30% revenue increase during patio season. Ensure staffing plan accounts for March uptick.",
          urgency: "INFO",
          sentiment: "NEUTRAL",
          hoursAgo: 120,
        },
      ],
    },
  ];

  const insightNow = new Date();

  for (const locationInsights of insightsData) {
    for (const insight of locationInsights.insights) {
      const generatedAt = new Date(insightNow.getTime() - insight.hoursAgo * 60 * 60 * 1000);

      await prisma.aIInsight.create({
        data: {
          locationId: locationInsights.locationId,
          promptId: aiPrompt.id,
          periodType: "MONTHLY",
          periodStart: currentMonthDate,
          periodEnd: new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0),
          inputData: {},
          title: insight.title,
          content: insight.content,
          keyPoints: [insight.content.split(".")[0] + "."],
          urgency: insight.urgency,
          sentiment: insight.sentiment,
          triggerType: "SCHEDULED",
          model: "claude-3-opus",
          promptVersion: 1,
          generatedAt,
        },
      });
    }
    console.log(`  ✓ AIInsights: ${locationInsights.locationId} (${locationInsights.insights.length} insights)`);
  }

  // ==========================================================================
  // 10. SAMPLE HOLIDAYS
  // ==========================================================================
  console.log("\nCreating sample holidays...");

  const holidays = [
    { date: "2025-01-01", name: "New Year's Day", type: "FEDERAL" as const, isNational: true },
    { date: "2025-02-14", name: "Valentine's Day", type: "COMMERCIAL" as const, isNational: true },
    { date: "2025-03-02", name: "Texas Independence Day", type: "STATE" as const, isNational: false },
    { date: "2025-04-21", name: "San Jacinto Day", type: "STATE" as const, isNational: false },
    { date: "2025-05-05", name: "Cinco de Mayo", type: "COMMERCIAL" as const, isNational: true },
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

  // ==========================================================================
  // 11. SEATING AREAS (for future Simulator)
  // ==========================================================================
  console.log("\nCreating seating areas...");

  const seatingAreasByLocation: Record<string, Array<{ name: string; seats: number; isOutdoor: boolean; weatherDependent: boolean }>> = {
    "loc-southerleigh-brewery": [
      { name: "Main Dining", seats: 80, isOutdoor: false, weatherDependent: false },
      { name: "Bar", seats: 24, isOutdoor: false, weatherDependent: false },
      { name: "Brewery Patio", seats: 60, isOutdoor: true, weatherDependent: true },
      { name: "Private Event Space", seats: 40, isOutdoor: false, weatherDependent: false },
    ],
    "loc-mon-chou-chou": [
      { name: "Main Dining", seats: 65, isOutdoor: false, weatherDependent: false },
      { name: "Bar", seats: 18, isOutdoor: false, weatherDependent: false },
      { name: "Patio", seats: 45, isOutdoor: true, weatherDependent: true },
    ],
    "loc-boilerhouse": [
      { name: "Main Dining", seats: 70, isOutdoor: false, weatherDependent: false },
      { name: "Wine Garden", seats: 50, isOutdoor: true, weatherDependent: true },
      { name: "Bar", seats: 20, isOutdoor: false, weatherDependent: false },
      { name: "Private Room", seats: 30, isOutdoor: false, weatherDependent: false },
    ],
    "loc-southerleigh-haute-south": [
      { name: "Main Dining", seats: 90, isOutdoor: false, weatherDependent: false },
      { name: "Bar", seats: 22, isOutdoor: false, weatherDependent: false },
      { name: "Covered Patio", seats: 40, isOutdoor: true, weatherDependent: false },
    ],
  };

  let seatingAreaCount = 0;
  for (const loc of locations) {
    const areas = seatingAreasByLocation[loc.id] || [];
    for (const area of areas) {
      await prisma.seatingArea.create({
        data: {
          locationId: loc.id,
          name: area.name,
          seats: area.seats,
          isOutdoor: area.isOutdoor,
          weatherDependent: area.weatherDependent,
        },
      });
      seatingAreaCount++;
    }
  }
  console.log(`  ✓ SeatingAreas: ${seatingAreaCount} entries`);

  // ==========================================================================
  // 12. MENU CATEGORIES & ITEMS (reference tables)
  // ==========================================================================
  console.log("\nCreating menu categories and items...");

  const menuCategories = [
    { name: "Appetizers", displayOrder: 1 },
    { name: "Salads", displayOrder: 2 },
    { name: "Entrees", displayOrder: 3 },
    { name: "Steaks & Grills", displayOrder: 4 },
    { name: "Sides", displayOrder: 5 },
    { name: "Desserts", displayOrder: 6 },
    { name: "Beer", displayOrder: 7 },
    { name: "Wine", displayOrder: 8 },
    { name: "Cocktails", displayOrder: 9 },
    { name: "Non-Alcoholic", displayOrder: 10 },
  ];

  // Sample menu items per category
  const menuItemsByCategory: Record<string, Array<{ name: string; price: number }>> = {
    "Appetizers": [
      { name: "Deviled Eggs", price: 12 },
      { name: "Fried Pickles", price: 11 },
      { name: "Pimento Cheese", price: 14 },
      { name: "Gulf Oysters", price: 24 },
    ],
    "Salads": [
      { name: "House Salad", price: 10 },
      { name: "Caesar Salad", price: 14 },
      { name: "Wedge Salad", price: 13 },
    ],
    "Entrees": [
      { name: "Fried Chicken", price: 26 },
      { name: "Grilled Salmon", price: 32 },
      { name: "Pork Chop", price: 29 },
      { name: "Shrimp & Grits", price: 28 },
    ],
    "Steaks & Grills": [
      { name: "12oz Ribeye", price: 52 },
      { name: "8oz Filet", price: 48 },
      { name: "Texas Wagyu Burger", price: 22 },
    ],
    "Sides": [
      { name: "Mac & Cheese", price: 9 },
      { name: "Collard Greens", price: 8 },
      { name: "Mashed Potatoes", price: 8 },
    ],
    "Desserts": [
      { name: "Pecan Pie", price: 10 },
      { name: "Chocolate Cake", price: 12 },
      { name: "Ice Cream", price: 8 },
    ],
    "Beer": [
      { name: "House Lager", price: 7 },
      { name: "IPA", price: 8 },
      { name: "Stout", price: 9 },
    ],
    "Wine": [
      { name: "House Red (Glass)", price: 12 },
      { name: "House White (Glass)", price: 11 },
      { name: "Premium Red (Glass)", price: 18 },
    ],
    "Cocktails": [
      { name: "Margarita", price: 14 },
      { name: "Old Fashioned", price: 15 },
      { name: "Paloma", price: 13 },
    ],
    "Non-Alcoholic": [
      { name: "Iced Tea", price: 4 },
      { name: "Lemonade", price: 5 },
      { name: "Coffee", price: 4 },
    ],
  };

  let menuItemCount = 0;
  // Create categories and items for the main brewery location as sample
  const breweryLocation = "loc-southerleigh-brewery";
  for (const category of menuCategories) {
    const createdCategory = await prisma.menuCategory.create({
      data: {
        locationId: breweryLocation,
        externalId: `toast-cat-${category.displayOrder}`,
        name: category.name,
        displayOrder: category.displayOrder,
      },
    });

    const items = menuItemsByCategory[category.name] || [];
    for (const item of items) {
      await prisma.menuItem.create({
        data: {
          locationId: breweryLocation,
          categoryId: createdCategory.id,
          externalId: `toast-item-${category.displayOrder}-${items.indexOf(item)}`,
          name: item.name,
          currentPrice: item.price,
          isActive: true,
        },
      });
      menuItemCount++;
    }
  }
  console.log(`  ✓ MenuCategories: ${menuCategories.length} entries (Brewery)`);
  console.log(`  ✓ MenuItems: ${menuItemCount} entries (Brewery)`);

  // ==========================================================================
  // 13. TRANSACTION SUMMARY (7 days sample for brewery)
  // ==========================================================================
  console.log("\nCreating transaction summaries...");

  const transactionDays = 7;
  for (let i = 0; i < transactionDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Weekend vs weekday variance
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const multiplier = isWeekend ? 1.35 : 1.0;

    const grossSales = Math.round(24000 * multiplier + (Math.random() - 0.5) * 4000);
    const discounts = Math.round(grossSales * 0.03);
    const comps = Math.round(grossSales * 0.01);
    const voids = Math.round(grossSales * 0.005);
    const refunds = Math.round(grossSales * 0.002);
    const netSales = grossSales - discounts - comps - voids - refunds;

    const transactionCount = Math.round(netSales / 75);
    const cardPercent = 0.85 + Math.random() * 0.05;

    await prisma.transactionSummary.create({
      data: {
        locationId: breweryLocation,
        date,
        grossSales,
        discounts,
        comps,
        voids,
        refunds,
        netSales,
        cashPayments: Math.round(netSales * (1 - cardPercent) * 0.9),
        cardPayments: Math.round(netSales * cardPercent),
        giftCardPayments: Math.round(netSales * (1 - cardPercent) * 0.1),
        otherPayments: 0,
        avgCheckSize: Math.round((netSales / transactionCount) * 100) / 100,
        avgTip: Math.round(netSales * 0.18 / transactionCount * 100) / 100,
        tipPercent: 18 + Math.round((Math.random() - 0.5) * 4 * 10) / 10,
        transactionCount,
      },
    });
  }
  console.log(`  ✓ TransactionSummary: ${transactionDays} days (Brewery)`);

  // ==========================================================================
  // 14. LABOR DETAIL (7 days sample for brewery)
  // ==========================================================================
  console.log("\nCreating labor details...");

  const positions = [
    { name: "Server", category: "FOH" as const, baseHours: 32, rate: 12 },
    { name: "Bartender", category: "FOH" as const, baseHours: 28, rate: 14 },
    { name: "Host", category: "FOH" as const, baseHours: 20, rate: 11 },
    { name: "Line Cook", category: "BOH" as const, baseHours: 40, rate: 16 },
    { name: "Prep Cook", category: "BOH" as const, baseHours: 35, rate: 14 },
    { name: "Dishwasher", category: "BOH" as const, baseHours: 30, rate: 12 },
    { name: "Sous Chef", category: "BOH" as const, baseHours: 45, rate: 22 },
  ];

  let laborDetailCount = 0;
  for (let i = 0; i < transactionDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const laborMultiplier = isWeekend ? 1.2 : 1.0;

    for (const position of positions) {
      const hoursScheduled = Math.round(position.baseHours * laborMultiplier / 7 * 10) / 10;
      const variance = 0.9 + Math.random() * 0.2;
      const hoursWorked = Math.round(hoursScheduled * variance * 10) / 10;
      const overtime = Math.max(0, hoursWorked - 8);

      await prisma.laborDetail.create({
        data: {
          locationId: breweryLocation,
          date,
          positionName: position.name,
          positionCategory: position.category,
          hoursScheduled,
          hoursWorked,
          overtimeHours: overtime,
          laborCost: Math.round(hoursWorked * position.rate * 100) / 100,
          avgHourlyRate: position.rate,
          employeeCount: Math.ceil(hoursWorked / 6),
        },
      });
      laborDetailCount++;
    }
  }
  console.log(`  ✓ LaborDetail: ${laborDetailCount} entries (Brewery)`);

  // ==========================================================================
  // 15. CATEGORY SALES (7 days sample for brewery)
  // ==========================================================================
  console.log("\nCreating category sales...");

  const categoryMix = [
    { name: "Appetizers", percent: 12 },
    { name: "Salads", percent: 6 },
    { name: "Entrees", percent: 32 },
    { name: "Steaks & Grills", percent: 15 },
    { name: "Sides", percent: 8 },
    { name: "Desserts", percent: 5 },
    { name: "Beer", percent: 10 },
    { name: "Wine", percent: 6 },
    { name: "Cocktails", percent: 4 },
    { name: "Non-Alcoholic", percent: 2 },
  ];

  let categorySalesCount = 0;
  for (let i = 0; i < transactionDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const dailyTotal = (isWeekend ? 28000 : 22000) + Math.round((Math.random() - 0.5) * 4000);

    for (const cat of categoryMix) {
      const revenue = Math.round(dailyTotal * cat.percent / 100);
      const avgItemPrice = cat.name.includes("Steak") ? 48 : cat.name === "Entrees" ? 28 : 12;

      await prisma.categorySales.create({
        data: {
          locationId: breweryLocation,
          date,
          categoryName: cat.name,
          itemsSold: Math.round(revenue / avgItemPrice),
          totalRevenue: revenue,
          percentOfSales: cat.percent,
        },
      });
      categorySalesCount++;
    }
  }
  console.log(`  ✓ CategorySales: ${categorySalesCount} entries (Brewery)`);

  console.log("\n✅ Seed completed successfully!\n");

  // Print summary
  console.log("Summary:");
  console.log(`  Organization: Southerleigh Hospitality Group`);
  console.log(`  Restaurant Groups: 1 (Southerleigh Concepts)`);
  console.log(`  Locations: ${locations.length}`);
  console.log(`  Users: ${users.length}`);
  console.log(`  Health Score Configs: ${locations.length}`);
  console.log(`  Monthly Metrics: ${locations.length * months.length}`);
  console.log(`  Health Score History: ${locations.length * months.length}`);
  console.log(`  AI Insights: ${insightsData.reduce((sum, l) => sum + l.insights.length, 0)}`);
  console.log(`  Holidays: ${holidays.length}`);
  console.log(`  Seating Areas: ${seatingAreaCount}`);
  console.log(`  Menu Categories: ${menuCategories.length}`);
  console.log(`  Menu Items: ${menuItemCount}`);
  console.log(`  Transaction Summaries: ${transactionDays}`);
  console.log(`  Labor Details: ${laborDetailCount}`);
  console.log(`  Category Sales: ${categorySalesCount}`);
  console.log(`\n📝 Demo user password: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
