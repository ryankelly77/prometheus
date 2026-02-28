/**
 * Clear old/mock insights from the database
 *
 * Usage: npx tsx scripts/clear-old-insights.ts [locationId]
 *
 * If no locationId is provided, lists all locations with insights.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const locationId = process.argv[2]

  if (!locationId) {
    // List locations with insights
    const locations = await prisma.location.findMany({
      include: {
        _count: {
          select: { aiInsights: true }
        }
      }
    })

    console.log('\nLocations with insights:')
    for (const loc of locations) {
      if (loc._count.aiInsights > 0) {
        console.log(`  ${loc.name} (${loc.id}): ${loc._count.aiInsights} insights`)
      }
    }
    console.log('\nTo clear insights for a location, run:')
    console.log('  npx tsx scripts/clear-old-insights.ts <locationId>\n')
    return
  }

  // Get location info
  const location = await prisma.location.findUnique({
    where: { id: locationId }
  })

  if (!location) {
    console.error(`Location not found: ${locationId}`)
    process.exit(1)
  }

  // Count existing insights
  const count = await prisma.aIInsight.count({
    where: { locationId }
  })

  console.log(`\nFound ${count} insights for ${location.name}`)

  if (count === 0) {
    console.log('No insights to clear.\n')
    return
  }

  // Delete feedback first (foreign key constraint)
  const feedbackDeleted = await prisma.insightFeedback.deleteMany({
    where: { locationId }
  })
  console.log(`Deleted ${feedbackDeleted.count} feedback records`)

  // Delete insights
  const deleted = await prisma.aIInsight.deleteMany({
    where: { locationId }
  })
  console.log(`Deleted ${deleted.count} insights`)

  console.log('\nDone! New insights will be generated when you visit the Intelligence page.\n')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
