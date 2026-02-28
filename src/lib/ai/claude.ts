/**
 * Claude AI Client
 *
 * Provides a simple interface to the Anthropic Claude API for generating
 * restaurant intelligence insights.
 */

import Anthropic from "@anthropic-ai/sdk";

// Initialize the client (uses ANTHROPIC_API_KEY env var by default)
const anthropic = new Anthropic();

export interface IntelligenceRequest {
  locationName: string;
  dataType: "pos" | "accounting" | "combined";
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

const SYSTEM_PROMPT = `You are an expert restaurant analytics consultant. Your role is to analyze restaurant data and provide actionable insights in a concise, professional manner.

Guidelines:
- Be specific and actionable - avoid generic advice
- Use actual numbers from the data provided
- Focus on patterns and opportunities
- Keep insights brief (1-2 sentences each)
- Recommendations should be concrete steps the restaurant can take

Format your response as JSON with this structure:
{
  "title": "Short headline summarizing the key finding",
  "summary": "2-3 sentence executive summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "dataQuality": "excellent|good|limited"
}`;

export async function generateIntelligence(
  request: IntelligenceRequest
): Promise<IntelligenceResponse> {
  const userPrompt = buildUserPrompt(request);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: SYSTEM_PROMPT,
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

  parts.push(
    "Provide your analysis focusing on actionable insights for this restaurant."
  );

  return parts.join("\n");
}

/**
 * Check if the Claude API is available
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
