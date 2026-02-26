/**
 * Debug script to check sync state
 */
import prisma from '../src/lib/prisma'

async function main() {
  console.log('=== Checking Database State ===\n')

  // Check integrations
  const integrations = await prisma.integration.findMany({
    where: { type: 'TOAST' },
    include: { location: { select: { id: true, name: true } } },
  })
  console.log('Toast Integrations:', JSON.stringify(integrations, null, 2))

  // Check transaction summaries
  const transactions = await prisma.transactionSummary.findMany({
    take: 10,
    orderBy: { date: 'desc' },
  })
  console.log('\nTransactionSummary count:', await prisma.transactionSummary.count())
  console.log('Recent transactions:', JSON.stringify(transactions, null, 2))

  // Check daypart metrics
  const dayparts = await prisma.daypartMetrics.findMany({
    take: 10,
    orderBy: { date: 'desc' },
  })
  console.log('\nDaypartMetrics count:', await prisma.daypartMetrics.count())
  console.log('Recent dayparts:', JSON.stringify(dayparts, null, 2))

  // Check locations
  const locations = await prisma.location.findMany({
    select: { id: true, name: true },
  })
  console.log('\nLocations:', JSON.stringify(locations, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
