/**
 * Generate weather insights for MCC and display the output
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import prisma from "../src/lib/prisma";
import { analyzeWeatherCorrelations, getClimateContext, getWeatherSummaryForAI } from "../src/lib/weather/correlations";
import { fetchForecast } from "../src/lib/weather/open-meteo";
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

  console.log(`\n=== Generating Weather Insights for ${location.name} ===\n`);

  // Load restaurant profile
  const profile = await prisma.restaurantProfile.findUnique({
    where: { locationId: location.id },
  });

  // Analyze weather correlations
  const correlation = await analyzeWeatherCorrelations(location.id);

  // Get climate context
  const climateContext = location.latitude && location.longitude
    ? getClimateContext(location.latitude, location.longitude)
    : undefined;

  // Get weather summary for AI
  const weatherSummary = getWeatherSummaryForAI(correlation, climateContext);

  // Get forecast
  let forecastText = "";
  if (location.latitude && location.longitude) {
    try {
      const forecast = await fetchForecast(location.latitude, location.longitude);
      forecastText = `\n\n7-Day Forecast:\n${forecast.daily.map((d, i) =>
        `${d.date}: High ${d.tempHigh}°F, Low ${d.tempLow}°F, ${d.description}${d.precipProbability > 30 ? ` (${d.precipProbability}% rain)` : ''}`
      ).join('\n')}`;
    } catch (e) {
      console.log("Could not fetch forecast:", e);
    }
  }

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

  // Build the prompt
  const systemPrompt = `You are a restaurant analytics expert helping ${location.name} understand how weather affects their business.

${AI_RULES}`;

  const userPrompt = `${profileContext}

${weatherSummary}${forecastText}

Based on this weather analysis, provide exactly 3 insights about how weather affects this restaurant's revenue.

FORMAT REQUIREMENTS:
- Each insight gets its own card with a **Bold Title**
- Lead with the finding and a number. 2-3 sentences max per card.
- One finding per card — don't combine heat + rain + forecast into one paragraph
- Use real dollar amounts from the data, not percentages

CONTENT:
1. Summer heat impact on outdoor terrace (the $335K annual loss story)
2. Extreme heat days impact on total restaurant revenue ($130K story)
3. This week's forecast and what to expect`;

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

  // Ensure we have a prompt record for weather insights
  let prompt = await prisma.aIPrompt.findFirst({
    where: { slug: "weather_seasonal_outdoor", organizationId: null },
  });

  if (!prompt) {
    prompt = await prisma.aIPrompt.create({
      data: {
        slug: "weather_seasonal_outdoor",
        name: "Weather Seasonal Outdoor Analysis",
        description: "Analyzes weather impact on outdoor seating revenue with seasonal patterns",
        systemPrompt: systemPrompt,
        userPromptTemplate: userPrompt,
        category: "METRIC_ANALYSIS",
        model: "claude-sonnet-4-20250514",
        maxTokens: 1500,
      },
    });
    console.log("Created AIPrompt record:", prompt.id);
  }

  // Archive old weather insights for this location
  await prisma.aIInsight.updateMany({
    where: { locationId: location.id, layer: "weather", status: "active" },
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
        layer: "weather",
        title: title,
        content: insightText,
        batchId,
        status: "active",
        isCurrent: true,
        periodType: "MONTHLY",
        periodStart,
        periodEnd,
        inputData: { source: "weather_correlation", outdoorImpact: correlation.outdoorImpact },
        generatedAt: new Date(),
      },
    });
  }

  console.log(`Saved ${insights.length} insights to database (batch: ${batchId})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
