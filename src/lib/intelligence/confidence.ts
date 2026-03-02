/**
 * Intelligence Confidence System
 *
 * Calculates how complete the data picture is for generating insights.
 * The more data sources connected, the more confident we can be in our analysis.
 *
 * This prevents over-attribution (e.g., blaming weather for a sales drop
 * when there was also a Spurs away game and a bad review that week).
 */

import prisma from "@/lib/prisma";

export interface DataLayer {
  id: string;
  label: string;
  weight: number; // how much this contributes to confidence (0-100)
  connected: boolean;
  description: string; // what it adds to the picture
  enablePath?: string; // where to enable this in the UI
}

export interface IntelligenceConfidence {
  score: number; // 0-100
  level: "Basic" | "Growing" | "Strong" | "Comprehensive" | "Complete";
  connectedLayers: string[];
  missingLayers: DataLayer[];
  nextRecommended: DataLayer | null; // highest-weight unconnected layer
  disclaimer: string; // e.g., "Based on sales and weather data only..."
  hedgeLevel: "high" | "medium" | "low" | "none"; // how much the AI should hedge
}

/**
 * Data layer definitions with weights
 * Total weight = 100 (all layers connected = 100% confidence)
 */
const DATA_LAYER_DEFINITIONS: Omit<DataLayer, "connected">[] = [
  {
    id: "sales",
    label: "POS / Sales Data",
    weight: 25,
    description: "Revenue patterns, trends, and day-of-week analysis",
    enablePath: "/dashboard/settings",
  },
  {
    id: "weather",
    label: "Weather Intelligence",
    weight: 15,
    description: "External weather impact on sales, forecast predictions",
    enablePath: "/dashboard/intelligence",
  },
  {
    id: "events",
    label: "Local Events",
    weight: 15,
    description: "Spurs games, concerts, festivals, conventions",
    enablePath: "/dashboard/settings",
  },
  {
    id: "costs",
    label: "Accounting / Costs",
    weight: 20,
    description: "Profit margins, food costs, labor, true profitability",
    enablePath: "/dashboard/settings",
  },
  {
    id: "customers",
    label: "Reservations / Customers",
    weight: 10,
    description: "Customer behavior, repeat visits, party size, no-shows",
    enablePath: "/dashboard/settings",
  },
  {
    id: "reviews",
    label: "Reviews / Social",
    weight: 10,
    description: "Reputation trends, sentiment, marketing impact",
    enablePath: "/dashboard/settings",
  },
  {
    id: "visibility",
    label: "Visibility / SEO",
    weight: 5,
    description: "Search presence, online discoverability",
    enablePath: "/dashboard/settings",
  },
];

/**
 * Calculate intelligence confidence for a location
 *
 * Data source connection is determined by explicit flags on the Location model,
 * NOT by checking if data exists in tables. This prevents seed/test data from
 * incorrectly inflating confidence scores.
 *
 * Flags are set when a user explicitly connects an integration:
 * - salesEnabled: Set when Toast/POS integration is connected
 * - weatherEnabled: Set when weather intelligence is enabled
 * - costsEnabled: Set when accounting integration (R365/QuickBooks) is connected
 * - eventsEnabled: Set when local events feed is connected
 * - customersEnabled: Set when reservations/CRM is connected
 * - reviewsEnabled: Set when review aggregation is connected
 * - visibilityEnabled: Set when SEO tracking is connected
 */
export async function calculateConfidence(
  locationId: string
): Promise<IntelligenceConfidence> {
  // Fetch location with all data source flags
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      salesEnabled: true,
      weatherEnabled: true,
      costsEnabled: true,
      eventsEnabled: true,
      customersEnabled: true,
      reviewsEnabled: true,
      visibilityEnabled: true,
    },
  });

  if (!location) {
    // Return empty confidence if location not found
    return {
      score: 0,
      level: "Basic",
      connectedLayers: [],
      missingLayers: DATA_LAYER_DEFINITIONS.map((def) => ({ ...def, connected: false })),
      nextRecommended: DATA_LAYER_DEFINITIONS.sort((a, b) => b.weight - a.weight)[0]
        ? { ...DATA_LAYER_DEFINITIONS.sort((a, b) => b.weight - a.weight)[0], connected: false }
        : null,
      disclaimer: "Location not found.",
      hedgeLevel: "high",
    };
  }

  // Build layers with connection status from explicit flags
  const layers: DataLayer[] = DATA_LAYER_DEFINITIONS.map((def) => {
    let connected = false;

    switch (def.id) {
      case "sales":
        connected = location.salesEnabled;
        break;
      case "weather":
        connected = location.weatherEnabled;
        break;
      case "events":
        connected = location.eventsEnabled;
        break;
      case "costs":
        connected = location.costsEnabled;
        break;
      case "customers":
        connected = location.customersEnabled;
        break;
      case "reviews":
        connected = location.reviewsEnabled;
        break;
      case "visibility":
        connected = location.visibilityEnabled;
        break;
    }

    return { ...def, connected };
  });

  // Calculate score
  const score = layers
    .filter((l) => l.connected)
    .reduce((sum, l) => sum + l.weight, 0);

  // Determine confidence level
  const level: IntelligenceConfidence["level"] =
    score >= 90
      ? "Complete"
      : score >= 70
        ? "Comprehensive"
        : score >= 50
          ? "Strong"
          : score >= 30
            ? "Growing"
            : "Basic";

  // Determine hedge level (how much the AI should qualify its statements)
  const hedgeLevel: IntelligenceConfidence["hedgeLevel"] =
    score >= 80
      ? "none"
      : score >= 60
        ? "low"
        : score >= 40
          ? "medium"
          : "high";

  // Get connected and missing layers
  const connectedLayers = layers.filter((l) => l.connected).map((l) => l.label);
  const missingLayers = layers.filter((l) => !l.connected);

  // Find next recommended layer (highest weight among missing)
  const nextRecommended =
    missingLayers.length > 0
      ? missingLayers.sort((a, b) => b.weight - a.weight)[0]
      : null;

  // Build disclaimer
  let disclaimer: string;
  if (connectedLayers.length === 0) {
    disclaimer = "No data sources connected. Connect your POS to get started.";
  } else if (connectedLayers.length === 1) {
    disclaimer = `Based on ${connectedLayers[0].toLowerCase()} only. `;
    if (nextRecommended) {
      disclaimer += `Connect ${nextRecommended.label.toLowerCase()} for more accurate insights.`;
    }
  } else {
    const lastLayer = connectedLayers.pop();
    disclaimer = `Based on ${connectedLayers.join(", ")} and ${lastLayer?.toLowerCase()}. `;
    if (nextRecommended) {
      disclaimer += `Connect ${nextRecommended.label.toLowerCase()} for fuller picture.`;
    }
  }

  return {
    score,
    level,
    connectedLayers: layers.filter((l) => l.connected).map((l) => l.label),
    missingLayers,
    nextRecommended,
    disclaimer,
    hedgeLevel,
  };
}

/**
 * Get hedge language instructions for the AI based on confidence level
 */
export function getHedgeInstructions(confidence: IntelligenceConfidence): string {
  const { score, level, connectedLayers, missingLayers } = confidence;

  const connectedStr = connectedLayers.join(", ") || "None";
  const missingStr = missingLayers.map((l) => l.label).join(", ") || "None";

  let instructions = `== INTELLIGENCE CONFIDENCE: ${score}% (${level}) ==

Connected data sources: ${connectedStr}
Missing data sources: ${missingStr}

CRITICAL INSTRUCTION FOR LANGUAGE:
Your confidence level is ${level}. Adjust your language accordingly:

`;

  if (score < 30) {
    instructions += `BASIC (under 30%): You only have sales data.
- Say "suggests" not "shows", "appears to" not "is caused by"
- Say "Based on sales data alone, we see..."
- Explicitly note: "Without weather, events, or cost data, we can only identify patterns — not explain them"
- Do NOT attribute causation. Only note correlation.
- When showing anomalies, say "This variance is unexplained with current data" not "This was caused by X"`;
  } else if (score < 50) {
    instructions += `GROWING (30-49%): You have sales + one external source.
- Say "weather appears to be a factor" not "weather caused this"
- Say "this likely contributed to" not "this explains"
- Note what other factors COULD also be at play: "A local event or staffing issue could also explain part of this drop"
- Frame weather impact as PARTIAL: "Weather may account for some of the decline, but other factors we can't see yet could also contribute"
- When showing dollar estimates, add: "This estimate reflects weather impact only — actual causes may include multiple factors"`;
  } else if (score < 70) {
    instructions += `STRONG (50-69%): Multiple external sources connected.
- Can be more confident in attributions
- Still note gaps: "Without cost data, we can see revenue impact but not profit impact"
- Can use "explains" for well-supported findings
- When multiple data sources agree, you can say "The data shows..." but still avoid absolute certainty`;
  } else {
    instructions += `COMPREHENSIVE (70%+): Rich data picture.
- Can make confident attributions
- Can offer profit-level recommendations, not just revenue
- Still hedge on predictions: "Based on historical patterns, we expect..."
- You have enough context to identify PRIMARY causes vs contributing factors`;
  }

  instructions += `

NEVER overstate what the data can tell you. If you're not sure, say so. Restaurant owners respect honesty over false confidence.`;

  return instructions;
}

/**
 * Get a simple confidence badge for UI display
 */
export function getConfidenceBadge(score: number): {
  label: string;
  color: string;
  emoji: string;
} {
  if (score >= 90) {
    return { label: "Complete", color: "green", emoji: "🎯" };
  }
  if (score >= 70) {
    return { label: "Comprehensive", color: "emerald", emoji: "✅" };
  }
  if (score >= 50) {
    return { label: "Strong", color: "blue", emoji: "💪" };
  }
  if (score >= 30) {
    return { label: "Growing", color: "amber", emoji: "📈" };
  }
  return { label: "Basic", color: "gray", emoji: "🌱" };
}

/**
 * Format confidence as a progress bar string for prompts
 */
export function formatConfidenceBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty) + ` ${score}%`;
}
