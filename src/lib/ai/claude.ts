/**
 * Claude AI Client
 *
 * Provides a simple interface to the Anthropic Claude API for generating
 * restaurant intelligence insights.
 */

import Anthropic from "@anthropic-ai/sdk";

// Initialize the client (uses ANTHROPIC_API_KEY env var by default)
const anthropic = new Anthropic();

export type RestaurantType =
  | "fine_dining"
  | "casual_dining"
  | "fast_casual"
  | "quick_service"
  | "cafe"
  | "bar_pub"
  | "bistro"
  | "ethnic_specialty"
  | "food_truck"
  | "buffet"
  | "family_style"
  | "ghost_kitchen";

export interface RestaurantTypeContext {
  label: string;
  benchmarks: string;
  strategies: string;
}

export const RESTAURANT_TYPE_CONTEXT: Record<RestaurantType, RestaurantTypeContext> = {
  fine_dining: {
    label: "Fine Dining",
    benchmarks: "Average check $100-300, 60-120 covers/night, food cost 28-35%, labor 30-35%, wine/beverage 25-40% of revenue",
    strategies: "Focus on experience, wine program, private events, tasting menus, seasonal menu rotations, sommelier-driven upselling",
  },
  casual_dining: {
    label: "Casual Dining",
    benchmarks: "Average check $40-80, 150-300 covers/night, food cost 28-32%, labor 25-30%, bar 20-30% of revenue",
    strategies: "Happy hour programs, loyalty/rewards, family promotions, online ordering, catering, local partnerships",
  },
  fast_casual: {
    label: "Fast Casual",
    benchmarks: "Average check $12-25, 200-500 transactions/day, food cost 28-32%, labor 25-28%, minimal bar revenue",
    strategies: "Speed of service optimization, digital ordering, loyalty apps, catering, daypart expansion, LTO items",
  },
  quick_service: {
    label: "Quick Service / QSR",
    benchmarks: "Average check $8-15, 300-800 transactions/day, food cost 25-30%, labor 22-28%, drive-thru 60-70% of sales",
    strategies: "Drive-thru optimization, combo meal engineering, mobile ordering, breakfast daypart, late night",
  },
  cafe: {
    label: "Café",
    benchmarks: "Average check $8-18, beverage-heavy mix (60%+ beverage), food cost 25-30%, morning peak critical",
    strategies: "Morning rush optimization, food attachment rate, afternoon daypart, retail merchandise, catering",
  },
  bar_pub: {
    label: "Bar / Pub / Tavern",
    benchmarks: "Average check $25-50, beverage 50-70% of revenue, food cost 28-35% on food items, late night important",
    strategies: "Happy hour strategy, live events/entertainment, sports programming, late night food, trivia/game nights",
  },
  bistro: {
    label: "Bistro",
    benchmarks: "Average check $50-100, 80-150 covers/night, wine 20-30% of revenue, food cost 30-35%",
    strategies: "Prix fixe menus, wine pairing programs, seasonal rotations, weekday specials, neighborhood loyalty",
  },
  ethnic_specialty: {
    label: "Ethnic / Specialty Restaurant",
    benchmarks: "Average check $20-60, varies widely by cuisine, food cost 28-35%, authenticity drives loyalty",
    strategies: "Cultural event tie-ins, family-style options, catering for cultural events, cooking classes, takeout/delivery",
  },
  food_truck: {
    label: "Food Truck / Mobile Vendor",
    benchmarks: "Average check $10-18, 100-300 transactions/day, food cost 28-35%, location is everything",
    strategies: "Location optimization, event booking, social media presence, catering, commissary efficiency",
  },
  buffet: {
    label: "Buffet",
    benchmarks: "Fixed price $15-40, high volume, food cost 35-45%, labor efficient, waste management critical",
    strategies: "Waste reduction, station optimization, off-peak pricing, group/party packages, holiday specials",
  },
  family_style: {
    label: "Family-Style Restaurant",
    benchmarks: "Average check $15-35, high table turns, family-friendly, food cost 28-33%, kids menu important",
    strategies: "Kids eat free promotions, birthday parties, early bird specials, takeout family meals, weeknight bundles",
  },
  ghost_kitchen: {
    label: "Ghost Kitchen / Virtual Restaurant",
    benchmarks: "Average check $20-40, 100% delivery/pickup, food cost 28-33%, no FOH labor, 15-30% commission to platforms",
    strategies: "Platform optimization, virtual brand expansion, delivery radius analysis, packaging quality, menu engineering for delivery",
  },
};

export interface IntelligenceRequest {
  locationName: string;
  dataType: "pos" | "accounting" | "combined";
  restaurantType?: RestaurantType | null;
  city?: string | null;
  state?: string | null;
  salesData?: {
    months: number;
    totalRevenue: number;
    avgDailyRevenue: number;
    topDays: { day: string; revenue: number }[];
    slowDays: { day: string; revenue: number }[];
    transactionCount: number;
    avgCheckSize: number;
    trend: "up" | "down" | "flat";
  };
  costData?: {
    months: number;
    totalCosts: number;
    laborPercent: number;
    foodPercent: number;
    primeCost: number;
    trend: "up" | "down" | "flat";
  };
}

export interface IntelligenceResponse {
  title: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  dataQuality: "excellent" | "good" | "limited";
}

function buildSystemPrompt(restaurantType?: RestaurantType | null): string {
  const typeContext = restaurantType ? RESTAURANT_TYPE_CONTEXT[restaurantType] : null;

  let prompt = `You are an expert restaurant analytics consultant`;

  if (typeContext) {
    prompt += ` specializing in ${typeContext.label} restaurants`;
  }

  prompt += `. Your role is to analyze restaurant data and provide actionable insights in a concise, professional manner.

Guidelines:
- Be specific and actionable - avoid generic advice
- Use actual numbers from the data provided
- Focus on patterns and opportunities
- Keep insights brief (1-2 sentences each)
- Recommendations should be concrete steps the restaurant can take`;

  if (typeContext) {
    prompt += `
- Compare performance against industry benchmarks for ${typeContext.label} operations
- Tailor recommendations to strategies that work for this restaurant type`;
  }

  prompt += `

Format your response as JSON with this structure:
{
  "title": "Short headline summarizing the key finding",
  "summary": "2-3 sentence executive summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "dataQuality": "excellent|good|limited"
}`;

  return prompt;
}

export async function generateIntelligence(
  request: IntelligenceRequest
): Promise<IntelligenceResponse> {
  const userPrompt = buildUserPrompt(request);
  const systemPrompt = buildSystemPrompt(request.restaurantType);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  // Extract the text content
  const textContent = message.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse the JSON response
  try {
    // Strip markdown code block formatting if present
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7); // Remove ```json
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3); // Remove ```
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3); // Remove trailing ```
    }
    jsonText = jsonText.trim();

    const response = JSON.parse(jsonText) as IntelligenceResponse;
    return response;
  } catch {
    // If JSON parsing fails, create a structured response from the text
    return {
      title: "Analysis Complete",
      summary: textContent.text.slice(0, 200),
      insights: [textContent.text],
      recommendations: [],
      dataQuality: "limited",
    };
  }
}

function buildUserPrompt(request: IntelligenceRequest): string {
  const parts: string[] = [];
  const typeContext = request.restaurantType ? RESTAURANT_TYPE_CONTEXT[request.restaurantType] : null;

  // Restaurant profile section
  parts.push("## Restaurant Profile");
  parts.push(`- Name: ${request.locationName}`);
  if (typeContext) {
    parts.push(`- Type: ${typeContext.label}`);
  }
  if (request.city || request.state) {
    const location = [request.city, request.state].filter(Boolean).join(", ");
    parts.push(`- Location: ${location}`);
  }
  if (typeContext) {
    parts.push(`- Industry Benchmarks: ${typeContext.benchmarks}`);
    parts.push(`- Typical Strategies: ${typeContext.strategies}`);
  }
  parts.push("");

  parts.push(`Analyze the following data for ${request.locationName}:`);
  parts.push("");

  if (request.salesData) {
    parts.push("## Sales Data (from POS)");
    parts.push(`- Period: ${request.salesData.months} months of data`);
    parts.push(
      `- Total Revenue: $${request.salesData.totalRevenue.toLocaleString()}`
    );
    parts.push(
      `- Average Daily Revenue: $${request.salesData.avgDailyRevenue.toLocaleString()}`
    );
    parts.push(
      `- Total Transactions: ${request.salesData.transactionCount.toLocaleString()}`
    );
    parts.push(
      `- Average Check Size: $${request.salesData.avgCheckSize.toFixed(2)}`
    );
    parts.push(`- Revenue Trend: ${request.salesData.trend}`);

    if (request.salesData.topDays.length > 0) {
      parts.push(
        `- Best Days: ${request.salesData.topDays.map((d) => `${d.day} ($${d.revenue.toLocaleString()})`).join(", ")}`
      );
    }
    if (request.salesData.slowDays.length > 0) {
      parts.push(
        `- Slowest Days: ${request.salesData.slowDays.map((d) => `${d.day} ($${d.revenue.toLocaleString()})`).join(", ")}`
      );
    }
    parts.push("");
  }

  if (request.costData) {
    parts.push("## Cost Data (from Accounting)");
    parts.push(`- Period: ${request.costData.months} months of data`);
    parts.push(
      `- Total Operating Costs: $${request.costData.totalCosts.toLocaleString()}`
    );
    parts.push(`- Labor Cost %: ${request.costData.laborPercent.toFixed(1)}%`);
    parts.push(`- Food Cost %: ${request.costData.foodPercent.toFixed(1)}%`);
    parts.push(
      `- Prime Cost (Labor + Food): ${request.costData.primeCost.toFixed(1)}%`
    );
    parts.push(`- Cost Trend: ${request.costData.trend}`);
    parts.push("");
  }

  if (typeContext) {
    parts.push(
      `Provide your analysis focusing on actionable insights for this ${typeContext.label} restaurant. Use the industry benchmarks to compare their performance and make recommendations that are SPECIFIC to a ${typeContext.label} operation. Reference industry standards where relevant.`
    );
  } else {
    parts.push(
      "Provide your analysis focusing on actionable insights for this restaurant."
    );
  }

  return parts.join("\n");
}

/**
 * Check if the Claude API is available
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
