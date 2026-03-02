/**
 * Test the weather AI prompt output with new seasonal outdoor data
 */

import prisma from "../src/lib/prisma";
import { analyzeWeatherCorrelations, getWeatherSummaryForAI, getClimateContext } from "../src/lib/weather/correlations";

async function main() {
  // Get MCC location
  const location = await prisma.location.findFirst({
    where: { name: { contains: "Mon Chou" } },
  });

  if (!location) {
    console.log("Location not found");
    return;
  }

  console.log(`\n=== Testing Weather AI Prompt for ${location.name} ===\n`);

  // Analyze correlations
  const correlation = await analyzeWeatherCorrelations(location.id);

  // Get climate context
  const climateContext = location.latitude && location.longitude
    ? getClimateContext(location.latitude, location.longitude)
    : undefined;

  // Generate the AI prompt
  const aiPrompt = getWeatherSummaryForAI(correlation, climateContext);

  console.log("=== AI PROMPT OUTPUT ===\n");
  console.log(aiPrompt);
  console.log("\n=== END AI PROMPT ===\n");

  // Also show the raw outdoor impact data
  console.log("=== RAW OUTDOOR IMPACT DATA ===\n");
  console.log(JSON.stringify(correlation.outdoorImpact, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
