import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { analyzeWeatherCorrelations, getClimateContext, getWeatherSummaryForAI } from "@/lib/weather/correlations";
import { fetchForecast } from "@/lib/weather/open-meteo";
import {
  calculateConfidence,
  getHedgeInstructions,
  formatConfidenceBar,
  type IntelligenceConfidence,
} from "@/lib/intelligence/confidence";
import { AI_RULES } from "@/lib/ai/prompts";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const requestSchema = z.object({
  locationId: z.string(),
  dataType: z.enum(["pos", "accounting", "combined"]),
  layer: z.enum(["sales", "weather"]).optional().default("sales"),
});

/**
 * POST /api/intelligence/generate/stream
 *
 * Streams AI insight generation in real-time using Server-Sent Events.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const body = await request.json();
    const { locationId, dataType, layer } = requestSchema.parse(body);

    // Verify location
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { restaurantGroup: true },
    });

    if (!location) {
      return new Response(JSON.stringify({ error: "Location not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send("status", { message: "Analyzing data..." });

          // Calculate confidence
          let confidence: IntelligenceConfidence | undefined;
          try {
            confidence = await calculateConfidence(locationId);
            send("confidence", {
              score: confidence.score,
              level: confidence.level,
              disclaimer: confidence.disclaimer,
            });
          } catch {
            // Continue without confidence
          }

          // Determine what to generate
          if (layer === "weather") {
            send("status", { message: "Analyzing weather correlations..." });
            await streamWeatherInsights(controller, encoder, send, locationId, location, confidence);
          } else {
            send("status", { message: "Analyzing sales patterns..." });
            await streamSalesInsights(controller, encoder, send, locationId, location, dataType, confidence);
          }

          send("done", { success: true });
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          send("error", { message: errorMessage });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid request", details: error.issues }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Failed to start stream" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

type SendFn = (event: string, data: unknown) => void;

async function streamSalesInsights(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  send: SendFn,
  locationId: string,
  location: { name: string; restaurantType: string | null },
  dataType: string,
  confidence?: IntelligenceConfidence
) {
  // Fetch sales data
  const salesData = await fetchSalesData(locationId);
  if (!salesData) {
    send("error", { message: "No sales data available" });
    return;
  }

  send("status", { message: "Generating insights with AI..." });

  // Build prompt
  const prompt = buildSalesPrompt(location.name, salesData, location.restaurantType, confidence);

  // Stream from Claude
  let fullText = "";
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
    system: `You are an expert restaurant analytics consultant. Generate actionable insights from sales data. Return valid JSON.
${AI_RULES}`,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullText += event.delta.text;
      send("text", { chunk: event.delta.text });
    }
  }

  // Parse and save insights
  send("status", { message: "Saving insights..." });

  let parsed;
  try {
    let jsonText = fullText.trim();
    if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
    else if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
    if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
    parsed = JSON.parse(jsonText.trim());
  } catch {
    parsed = {
      title: "Sales Analysis",
      summary: fullText.slice(0, 200),
      insights: [fullText],
      recommendations: [],
    };
  }

  // Save to database
  await saveInsights(locationId, "sales", parsed, dataType);

  send("insights", parsed);
}

async function streamWeatherInsights(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  send: SendFn,
  locationId: string,
  location: { name: string; latitude: number | null; longitude: number | null; timezone: string | null; restaurantType: string | null },
  confidence?: IntelligenceConfidence
) {
  // Get weather correlations
  send("status", { message: "Calculating weather impact..." });
  const correlations = await analyzeWeatherCorrelations(locationId);

  if (correlations.totalDaysAnalyzed === 0) {
    send("error", { message: "No weather data available. Enable weather first." });
    return;
  }

  // Get climate context and summary
  let climateContext: string | undefined;
  if (location.latitude && location.longitude) {
    climateContext = getClimateContext(location.latitude, location.longitude);
  }
  const weatherSummary = getWeatherSummaryForAI(correlations, climateContext);

  // Get forecast
  let forecastSection = "";
  if (location.latitude && location.longitude) {
    try {
      send("status", { message: "Fetching 7-day forecast..." });
      const forecast = await fetchForecast(
        location.latitude,
        location.longitude,
        7,
        location.timezone || undefined
      );
      forecastSection = formatForecastSection(forecast, correlations);
    } catch {
      // Continue without forecast
    }
  }

  send("status", { message: "Generating weather insights..." });

  // Build prompt
  const prompt = buildWeatherPrompt(location.name, weatherSummary, forecastSection, correlations, confidence);

  // Build system prompt
  let systemPrompt = `You are an expert restaurant analytics consultant with weather intelligence capabilities. Generate insights that are ONLY possible because of weather data. Return valid JSON.
${AI_RULES}`;
  if (confidence) {
    systemPrompt += `\n\n${getHedgeInstructions(confidence)}`;
  }

  // Stream from Claude
  let fullText = "";
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
    system: systemPrompt,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullText += event.delta.text;
      send("text", { chunk: event.delta.text });
    }
  }

  // Parse and save
  send("status", { message: "Saving insights..." });

  let parsed;
  try {
    let jsonText = fullText.trim();
    if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
    else if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
    if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
    parsed = JSON.parse(jsonText.trim());
  } catch {
    parsed = {
      title: "Weather Impact Analysis",
      summary: fullText.slice(0, 200),
      insights: [fullText],
      recommendations: [],
    };
  }

  await saveInsights(locationId, "weather", parsed, "combined");

  send("insights", parsed);
}

function buildSalesPrompt(
  locationName: string,
  salesData: Awaited<ReturnType<typeof fetchSalesData>>,
  restaurantType: string | null,
  confidence?: IntelligenceConfidence
): string {
  const confidenceSection = confidence
    ? `\n== DATA CONFIDENCE ==\nData Completeness: ${formatConfidenceBar(confidence.score)} (${confidence.level})\n${confidence.disclaimer}\n`
    : "";

  return `Analyze sales data for ${locationName}${restaurantType ? ` (${restaurantType})` : ""}.
${confidenceSection}
Sales Data:
- Period: ${salesData?.months} months
- Total Revenue: $${salesData?.totalRevenue.toLocaleString()}
- Avg Daily Revenue: $${salesData?.avgDailyRevenue.toLocaleString()}
- Top Days: ${salesData?.topDays.map(d => `${d.day} ($${d.revenue})`).join(", ")}
- Slow Days: ${salesData?.slowDays.map(d => `${d.day} ($${d.revenue})`).join(", ")}
- Transactions: ${salesData?.transactionCount.toLocaleString()}
- Avg Check: $${salesData?.avgCheckSize.toFixed(2)}
- Trend: ${salesData?.trend}

Generate 3-4 actionable insights. Each should be specific with numbers.

Return as JSON:
{
  "title": "Revenue Analysis",
  "summary": "2-sentence summary",
  "insights": ["Insight 1 with specific numbers", "Insight 2", "Insight 3"],
  "recommendations": ["Action 1", "Action 2", "Action 3"]
}`;
}

function buildWeatherPrompt(
  locationName: string,
  weatherSummary: string,
  forecastSection: string,
  correlations: Awaited<ReturnType<typeof analyzeWeatherCorrelations>>,
  confidence?: IntelligenceConfidence
): string {
  const confidenceSection = confidence
    ? `\n== DATA CONFIDENCE ==\nData Completeness: ${formatConfidenceBar(confidence.score)} (${confidence.level})\n${confidence.disclaimer}\n`
    : "";

  const anomalySection = correlations.weatherExplainedAnomalies.length > 0
    ? `\n\nWeather-Explained Anomalies:\n${correlations.weatherExplainedAnomalies.slice(0, 5).map(a =>
        `- ${a.date}: Sales $${a.sales.toLocaleString()} (${a.pctDiff > 0 ? "+" : ""}${a.pctDiff}%) — ${a.explanation}`
      ).join("\n")}`
    : "";

  return `You are analyzing weather impact for ${locationName}.
${confidenceSection}
${weatherSummary}
${forecastSection}
${anomalySection}

CRITICAL: Generate EXACTLY 3 insights:

1. "MYSTERY SOLVED" — Pick a dramatic anomaly explained by weather
2. "THE #1 WEATHER DRIVER" — The biggest weather factor affecting revenue
3. "THIS WEEK'S FORECAST" — Specific predictions with dollar estimates

Return as JSON:
{
  "title": "Weather Impact Analysis",
  "summary": "2-sentence summary of weather's overall impact",
  "insights": ["Mystery solved insight", "#1 driver insight", "Forecast insight"],
  "recommendations": []
}`;
}

function formatForecastSection(
  forecast: Awaited<ReturnType<typeof fetchForecast>>,
  correlations: Awaited<ReturnType<typeof analyzeWeatherCorrelations>>
): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let section = "\n\n7-Day Forecast:\n";

  for (const day of forecast) {
    const dayOfWeek = dayNames[new Date(day.date).getDay()];
    let impact = "";

    if (day.isSevereWeather) {
      impact = ` — severe weather expected (${correlations.adjustedSevereWeatherImpactPct || -30}% impact)`;
    } else if (day.isExtremeHeat) {
      impact = ` — extreme heat (${correlations.adjustedExtremeHeatImpactPct}% impact)`;
    } else if (day.isRainy) {
      impact = ` — rain expected (${correlations.adjustedRainImpactPct}% impact)`;
    }

    section += `- ${day.date} (${dayOfWeek}): ${day.weatherDescription}, High ${Math.round(day.tempHigh)}°F${impact}\n`;
  }

  return section;
}

async function fetchSalesData(locationId: string) {
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
  sevenMonthsAgo.setDate(1);

  const transactions = await prisma.transactionSummary.findMany({
    where: {
      locationId,
      date: { gte: sevenMonthsAgo },
    },
    orderBy: { date: "desc" },
  });

  if (transactions.length === 0) return null;

  const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.netSales), 0);
  const transactionCount = transactions.reduce((sum, tx) => sum + (tx.transactionCount ?? 0), 0);
  const avgDailyRevenue = totalRevenue / transactions.length;
  const avgCheckSize = transactionCount > 0 ? totalRevenue / transactionCount : 0;

  const dayTotals: Record<string, number[]> = {};
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const tx of transactions) {
    const dayOfWeek = new Date(tx.date).getDay();
    const dayName = dayNames[dayOfWeek];
    if (!dayTotals[dayName]) dayTotals[dayName] = [];
    dayTotals[dayName].push(Number(tx.netSales));
  }

  const dayAverages = Object.entries(dayTotals)
    .map(([day, values]) => ({
      day,
      revenue: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const midpoint = Math.floor(transactions.length / 2);
  const recentHalf = transactions.slice(0, midpoint);
  const olderHalf = transactions.slice(midpoint);

  const recentAvg = recentHalf.reduce((sum, tx) => sum + Number(tx.netSales), 0) / (recentHalf.length || 1);
  const olderAvg = olderHalf.reduce((sum, tx) => sum + Number(tx.netSales), 0) / (olderHalf.length || 1);

  let trend: "up" | "down" | "flat" = "flat";
  if (recentAvg > olderAvg * 1.05) trend = "up";
  else if (recentAvg < olderAvg * 0.95) trend = "down";

  const uniqueMonths = new Set(
    transactions.map((tx) => `${new Date(tx.date).getFullYear()}-${new Date(tx.date).getMonth()}`)
  );

  return {
    months: uniqueMonths.size,
    totalRevenue: Math.round(totalRevenue),
    avgDailyRevenue: Math.round(avgDailyRevenue),
    topDays: dayAverages.slice(0, 2),
    slowDays: dayAverages.slice(-2).reverse(),
    transactionCount,
    avgCheckSize,
    trend,
  };
}

async function saveInsights(
  locationId: string,
  layer: string,
  intelligence: { title: string; summary: string; insights: string[]; recommendations: string[] },
  dataType: string
) {
  const batchId = randomUUID();
  const now = new Date();
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
  const defaultExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // Get or create prompt
  const promptSlug = `streaming-${dataType}`;
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: { restaurantGroup: true },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  const prompt = await prisma.aIPrompt.upsert({
    where: { id: promptSlug },
    create: {
      id: promptSlug,
      organizationId: location.restaurantGroup.organizationId,
      name: `Streaming ${dataType.toUpperCase()} Analysis`,
      slug: promptSlug,
      systemPrompt: "You are a restaurant analytics expert.",
      userPromptTemplate: "Analyze the provided data.",
      category: "METRIC_ANALYSIS",
      version: 1,
      isActive: true,
    },
    update: {},
  });

  // Archive previous active insights for this layer
  await prisma.aIInsight.updateMany({
    where: {
      locationId,
      layer,
      status: { in: ["active", "stale"] },
    },
    data: {
      status: "archived",
      isCurrent: false,
    },
  });

  // Ensure we have at least 2 insights for keyPoints requirement
  const keyPoints = intelligence.insights.length >= 2
    ? intelligence.insights
    : [...intelligence.insights, intelligence.summary];

  // Ensure we have at least 1 recommendation
  const recommendations = intelligence.recommendations.length > 0
    ? intelligence.recommendations
    : [`Review the ${layer} analysis above and take action on the key findings.`];

  console.log(`[Stream Save] Creating insight for ${layer}:`, {
    keyPointsCount: keyPoints.length,
    recommendationsCount: recommendations.length,
  });

  // Create main insight with all required fields
  await prisma.aIInsight.create({
    data: {
      locationId,
      promptId: prompt.id,
      batchId,
      isCurrent: true,
      layer,
      status: "active",
      insightType: "trend",
      periodType: "MONTHLY",
      periodStart: sevenMonthsAgo,
      periodEnd: now,
      inputData: {},
      title: intelligence.title,
      headline: intelligence.title,
      content: intelligence.summary,
      detail: intelligence.summary,
      keyPoints,
      recommendations,
      expiresAt: defaultExpiresAt,
      model: "claude-sonnet-4-5-20250929",
      promptVersion: 1,
    },
  });

  console.log(`[Stream Save] Insight saved for ${layer}`);
}
