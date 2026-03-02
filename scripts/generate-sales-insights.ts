/**
 * Generate sales insights for MCC and display the output
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import prisma from "../src/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { AI_RULES } from "../src/lib/ai/prompts";

const anthropic = new Anthropic();

async function main() {
  // Get MCC location
  const location = await prisma.location.findFirst({
    where: { name: { contains: "Mon Chou" } },
  });

  if (!location) {
    console.log("Location not found");
    return;
  }

  console.log(`\n=== Generating Sales Insights for ${location.name} ===\n`);

  // Load restaurant profile
  const profile = await prisma.restaurantProfile.findUnique({
    where: { locationId: location.id },
  });

  // Get recent transaction data
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
  sevenMonthsAgo.setDate(1);

  const transactions = await prisma.transactionSummary.findMany({
    where: {
      locationId: location.id,
      date: { gte: sevenMonthsAgo },
    },
    orderBy: { date: "desc" },
  });

  if (transactions.length === 0) {
    console.log("No transaction data found");
    return;
  }

  // Calculate stats
  const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.netSales ?? 0), 0);
  const totalOrders = transactions.reduce((sum, tx) => sum + (tx.transactionCount ?? 0), 0);
  const daysWithData = transactions.length;
  const avgDailyRevenue = totalRevenue / daysWithData;
  const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Day of week analysis
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeekTotals: Record<string, { revenue: number; count: number }> = {};

  for (const tx of transactions) {
    const dayIndex = new Date(tx.date).getDay();
    const dayName = dayNames[dayIndex];
    if (!dayOfWeekTotals[dayName]) {
      dayOfWeekTotals[dayName] = { revenue: 0, count: 0 };
    }
    dayOfWeekTotals[dayName].revenue += Number(tx.netSales ?? 0);
    dayOfWeekTotals[dayName].count += 1;
  }

  const dayOfWeekAvg: Record<string, number> = {};
  for (const [day, data] of Object.entries(dayOfWeekTotals)) {
    dayOfWeekAvg[day] = Math.round(data.revenue / data.count);
  }

  const sortedDays = Object.entries(dayOfWeekAvg)
    .sort(([, a], [, b]) => b - a);
  const peakDays = sortedDays.slice(0, 3);
  const weakestDays = sortedDays.slice(-2);

  // Monthly trend
  const monthlyData: Record<string, { revenue: number; orders: number; days: number }> = {};
  for (const tx of transactions) {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { revenue: 0, orders: 0, days: 0 };
    }
    monthlyData[monthKey].revenue += Number(tx.netSales ?? 0);
    monthlyData[monthKey].orders += tx.transactionCount ?? 0;
    monthlyData[monthKey].days += 1;
  }

  const monthlyTrend = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      revenue: Math.round(data.revenue),
      avgDaily: Math.round(data.revenue / data.days),
      orders: data.orders,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Build restaurant profile context
  let profileContext = "";
  if (profile) {
    profileContext = `
== RESTAURANT PROFILE ==
Name: ${location.name}
${profile.restaurantType ? `Type: ${profile.restaurantType}` : ""}
${profile.conceptDescription ? `Concept: ${profile.conceptDescription}` : ""}
${profile.cuisineType ? `Cuisine: ${profile.cuisineType}` : ""}
${profile.priceRange ? `Price Range: ${profile.priceRange}` : ""}
${profile.neighborhood ? `Neighborhood: ${profile.neighborhood}` : ""}
${location.city && location.state ? `Location: ${location.city}, ${location.state}` : ""}

== OPERATOR CONTEXT ==
${profile.userContext?.map((c: string) => `- ${c}`).join("\n") || "None provided"}
`;
  }

  // Build sales data summary
  const salesSummary = `
== SALES DATA (${daysWithData} days analyzed) ==
Total Revenue: $${totalRevenue.toLocaleString()}
Average Daily Revenue: $${Math.round(avgDailyRevenue).toLocaleString()}
Total Orders: ${totalOrders.toLocaleString()}
Average Check: $${avgCheck.toFixed(2)}

== DAY OF WEEK PERFORMANCE ==
${sortedDays.map(([day, avg]) => `${day}: $${avg.toLocaleString()}/day`).join("\n")}

Best Days: ${peakDays.map(([day, avg]) => `${day} ($${avg.toLocaleString()})`).join(", ")}
Weakest Days: ${weakestDays.map(([day, avg]) => `${day} ($${avg.toLocaleString()})`).join(", ")}

== MONTHLY TREND ==
${monthlyTrend.map(m => `${m.month}: $${m.revenue.toLocaleString()} total, $${m.avgDaily.toLocaleString()}/day avg`).join("\n")}

== OPPORTUNITY CALCULATION ==
Saturday avg: $${dayOfWeekAvg["Saturday"]?.toLocaleString() || "N/A"}
Monday avg: $${dayOfWeekAvg["Monday"]?.toLocaleString() || "N/A"}
Gap: $${((dayOfWeekAvg["Saturday"] || 0) - (dayOfWeekAvg["Monday"] || 0)).toLocaleString()}/day
Annual Monday opportunity (52 weeks): $${(((dayOfWeekAvg["Saturday"] || 0) - (dayOfWeekAvg["Monday"] || 0)) * 52).toLocaleString()}
`;

  // Build the prompt
  const systemPrompt = `You are a restaurant analytics expert helping ${location.name} understand their sales patterns.

${AI_RULES}`;

  const userPrompt = `${profileContext}

${salesSummary}

Based on this sales analysis, provide exactly 3 insights about sales patterns and opportunities.

FORMAT REQUIREMENTS:
- Each insight gets its own card with a **Bold Title**
- Lead with the finding and a number. 2-3 sentences max per card.
- One finding per card
- Use real dollar amounts from the data, not percentages

CONTENT:
1. Day-of-week pattern and the Monday/Tuesday opportunity (with dollar amounts)
2. Monthly trend analysis (what's driving the pattern)
3. One specific, actionable recommendation with expected ROI`;

  console.log("=== PROMPT BEING SENT TO AI ===\n");
  console.log(userPrompt);
  console.log("\n=== END PROMPT ===\n");

  // Generate insights
  console.log("Generating AI response...\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const aiOutput = response.content[0].type === "text" ? response.content[0].text : "";

  console.log("=== AI RESPONSE ===\n");
  console.log(aiOutput);
  console.log("\n=== END AI RESPONSE ===\n");

  // Save the insights to the database
  const batchId = `batch_${Date.now()}`;

  // Parse the response into individual insights (split by bold headers)
  const insights = aiOutput.split(/\n\n(?=\*\*)/).filter(s => s.trim());

  // Ensure we have a prompt record for sales insights
  let prompt = await prisma.aIPrompt.findFirst({
    where: { slug: "sales_day_of_week", organizationId: null },
  });

  if (!prompt) {
    prompt = await prisma.aIPrompt.create({
      data: {
        slug: "sales_day_of_week",
        name: "Sales Day of Week Analysis",
        description: "Analyzes sales patterns by day of week and identifies opportunities",
        systemPrompt: systemPrompt,
        userPromptTemplate: userPrompt,
        category: "METRIC_ANALYSIS",
        model: "claude-sonnet-4-20250514",
        maxTokens: 1500,
      },
    });
    console.log("Created AIPrompt record:", prompt.id);
  }

  // Archive old sales insights for this location
  await prisma.aIInsight.updateMany({
    where: { locationId: location.id, layer: "sales", status: "active" },
    data: { status: "archived", isCurrent: false },
  });

  // Save new insights
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (const insightText of insights) {
    // Extract title from the bold header
    const titleMatch = insightText.match(/^\*\*(.+?)\*\*/);
    const title = titleMatch ? titleMatch[1] : insightText.slice(0, 100);

    await prisma.aIInsight.create({
      data: {
        locationId: location.id,
        promptId: prompt.id,
        promptVersion: prompt.version,
        model: "claude-sonnet-4-20250514",
        layer: "sales",
        title: title,
        content: insightText,
        batchId,
        status: "active",
        isCurrent: true,
        periodType: "MONTHLY",
        periodStart,
        periodEnd,
        inputData: { source: "transaction_summary", daysAnalyzed: daysWithData },
        generatedAt: new Date(),
      },
    });
  }

  console.log(`Saved ${insights.length} insights to database (batch: ${batchId})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
