/**
 * Test script for weather intelligence generation
 *
 * Run with: npx tsx scripts/test-weather-insights.ts
 */

import prisma from "../src/lib/prisma";
import { analyzeWeatherCorrelations, getClimateContext, getWeatherSummaryForAI } from "../src/lib/weather/correlations";
import { fetchForecast } from "../src/lib/weather/open-meteo";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function main() {
  const locationId = "loc-mon-chou-chou";

  console.log("=".repeat(60));
  console.log("WEATHER INTELLIGENCE TEST FOR MON CHOU CHOU");
  console.log("=".repeat(60));

  // Get location details
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, name: true, latitude: true, longitude: true, timezone: true, restaurantType: true },
  });

  if (!location) {
    console.error("Location not found");
    return;
  }

  console.log(`\nLocation: ${location.name}`);
  console.log(`Coordinates: ${location.latitude}, ${location.longitude}`);

  // Step 1: Get weather correlations
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: WEATHER CORRELATIONS");
  console.log("=".repeat(60));

  const correlations = await analyzeWeatherCorrelations(locationId);

  console.log(`\nAnalysis period: ${correlations.periodStart} to ${correlations.periodEnd}`);
  console.log(`Days analyzed: ${correlations.totalDaysAnalyzed}`);
  console.log(`Avg daily revenue: $${correlations.avgDailyRevenue.toLocaleString()}`);

  console.log("\n--- RANKED WEATHER DRIVERS ---");
  for (const driver of correlations.weatherDrivers) {
    console.log(`  #${driver.rank} ${driver.label}: ${driver.impactPct}% × ${driver.daysAffected} days = ~$${driver.estimatedAnnualLoss.toLocaleString()}/year`);
  }

  console.log("\n--- WEATHER-EXPLAINED ANOMALIES ---");
  for (const anomaly of correlations.weatherExplainedAnomalies) {
    console.log(`  ${anomaly.date} (${anomaly.dayOfWeek}): $${anomaly.sales.toLocaleString()} (${anomaly.pctDiff > 0 ? "+" : ""}${anomaly.pctDiff}% vs $${anomaly.expectedSales.toLocaleString()}) — ${anomaly.explanation}`);
  }

  // Check for January 25 specifically
  const jan25Anomaly = correlations.weatherExplainedAnomalies.find(
    (a) => a.date === "2026-01-25" || a.date.includes("2026-01-25")
  );
  console.log("\n--- JANUARY 25 CHECK ---");
  if (jan25Anomaly) {
    console.log(`✅ January 25 anomaly FOUND and EXPLAINED:`);
    console.log(`   ${jan25Anomaly.explanation}`);
    console.log(`   Sales: $${jan25Anomaly.sales.toLocaleString()} (${jan25Anomaly.pctDiff}% vs expected)`);
  } else {
    console.log("❌ January 25 anomaly NOT FOUND in weather-explained anomalies");
    // Check if it exists in the data at all
    const allAnomalies = correlations.weatherExplainedAnomalies.map(a => a.date);
    console.log(`   Available dates: ${allAnomalies.slice(0, 5).join(", ")}...`);
  }

  // Step 2: Get 7-day forecast
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: 7-DAY FORECAST");
  console.log("=".repeat(60));

  if (location.latitude && location.longitude) {
    const forecast = await fetchForecast(location.latitude, location.longitude, 7);
    console.log("\nUpcoming weather:");
    for (const day of forecast) {
      const dayOfWeek = new Date(day.date).toLocaleDateString("en-US", { weekday: "long" });
      let impact = "";
      if (day.isSevereWeather) impact = " ⚠️ SEVERE";
      else if (day.isExtremeHeat) impact = " 🔥 EXTREME HEAT";
      else if (day.isExtremeCold) impact = " ❄️ EXTREME COLD";
      else if (day.isRainy) impact = " 🌧️ RAIN";
      console.log(`  ${day.date} (${dayOfWeek}): ${day.weatherDescription}, High ${Math.round(day.tempHigh)}°F${impact}`);
    }
  }

  // Step 3: Generate weather intelligence
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: GENERATING WEATHER INTELLIGENCE");
  console.log("=".repeat(60));

  // Get previous sales insights
  const previousInsights = await prisma.aIInsight.findMany({
    where: { locationId, layer: "sales" },
    orderBy: { generatedAt: "desc" },
    take: 5,
    select: { title: true, headline: true, content: true },
  });

  console.log(`\nPrevious sales insights: ${previousInsights.length}`);

  // Get climate context
  const climateContext = getClimateContext(location.latitude!, location.longitude!);
  console.log("\nClimate context:", climateContext.slice(0, 100) + "...");

  // Get weather summary for AI
  const weatherSummary = getWeatherSummaryForAI(correlations, climateContext);

  // Build prompt
  const anomalySection = correlations.weatherExplainedAnomalies.length > 0
    ? `\n\nPreviously Unexplained Anomalies — NOW EXPLAINED BY WEATHER:\n${correlations.weatherExplainedAnomalies.map((a) =>
        `- ${a.date} (${a.dayOfWeek}): Sales $${a.sales.toLocaleString()} (${a.pctDiff > 0 ? "+" : ""}${a.pctDiff}% vs expected $${a.expectedSales.toLocaleString()}) — ${a.explanation}`
      ).join("\n")}\n\nIMPORTANT: If any previous insight mentioned an unexplained anomaly on these dates, SOLVE IT with the weather explanation above.`
    : "";

  const prompt = `You are a restaurant analytics expert with NEW weather data for ${location.name}.

${weatherSummary}
${anomalySection}

Your task: Generate exactly 3 NEW insights that are ONLY possible because of weather data.

These insights should:
1. Explain mysteries — solve any unexplained sales anomalies with weather data
2. Predict future impact — use historical correlations to predict upcoming impacts
3. Reveal the TRUE #1 weather driver — ranked by annual revenue impact

Focus on specific numbers and dates.

Return as JSON:
{
  "title": "Weather Intelligence for ${location.name}",
  "summary": "Key weather findings (2-3 sentences)",
  "insights": [
    "Insight 1",
    "Insight 2",
    "Insight 3"
  ],
  "recommendations": ["Action 1", "Action 2"],
  "dataQuality": "excellent|good|limited"
}`;

  console.log("\nGenerating insights with Claude...");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
    system: "You are an expert restaurant analytics consultant with weather intelligence capabilities. Generate insights that are ONLY possible because of weather data. Return valid JSON.",
  });

  const textContent = message.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    console.error("No response from Claude");
    return;
  }

  let jsonText = textContent.text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  try {
    const result = JSON.parse(jsonText);

    console.log("\n" + "=".repeat(60));
    console.log("WEATHER INTELLIGENCE RESULTS");
    console.log("=".repeat(60));

    console.log(`\nTitle: ${result.title}`);
    console.log(`\nSummary: ${result.summary}`);

    console.log("\n--- INSIGHTS ---");
    result.insights.forEach((insight: string, i: number) => {
      console.log(`\n${i + 1}. ${insight}`);
    });

    console.log("\n--- RECOMMENDATIONS ---");
    result.recommendations.forEach((rec: string, i: number) => {
      console.log(`${i + 1}. ${rec}`);
    });

    console.log(`\nData Quality: ${result.dataQuality}`);

    // Verify January 25 is mentioned
    console.log("\n" + "=".repeat(60));
    console.log("VERIFICATION CHECKS");
    console.log("=".repeat(60));

    const allText = JSON.stringify(result);
    const jan25Mentioned = allText.includes("January 25") || allText.includes("01-25") || allText.includes("1/25");
    console.log(`\n✅ January 25 mentioned in insights: ${jan25Mentioned ? "YES" : "NO"}`);

    const heatMentioned = allText.toLowerCase().includes("heat");
    console.log(`✅ Heat impact mentioned: ${heatMentioned ? "YES" : "NO"}`);

    const forecastMentioned = allText.toLowerCase().includes("forecast") || allText.toLowerCase().includes("upcoming") || allText.toLowerCase().includes("this week");
    console.log(`✅ Forecast-based prediction: ${forecastMentioned ? "YES" : "NO"}`);

  } catch (e) {
    console.error("Failed to parse response:", e);
    console.log("Raw response:", jsonText);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
