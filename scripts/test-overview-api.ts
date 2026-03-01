/**
 * Test script for /api/dashboard/overview data
 *
 * Usage: npx tsx scripts/test-overview-api.ts [locationId]
 *
 * If no locationId is provided, uses Mon Chou Chou.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const LOCATION_ID = process.argv[2] || 'loc-mon-chou-chou'

async function main() {
  console.log('\n=== Testing Overview API Data ===\n')
  console.log(`Location ID: ${LOCATION_ID}\n`)

  // Get location
  const location = await prisma.location.findUnique({
    where: { id: LOCATION_ID },
    include: {
      integrations: {
        where: { status: 'CONNECTED' },
        orderBy: { lastSyncAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!location) {
    console.error('Location not found!')
    return
  }

  console.log(`Restaurant: ${location.name}`)
  console.log(`Last Sync: ${location.integrations[0]?.lastSyncAt || 'Never'}\n`)

  // Get all transactions
  const transactions = await prisma.transactionSummary.findMany({
    where: { locationId: LOCATION_ID },
    orderBy: { date: 'desc' },
  })

  console.log(`Total transactions: ${transactions.length}`)

  if (transactions.length === 0) {
    console.log('No transaction data found!')
    return
  }

  // Date calculations
  const now = new Date()
  const today = startOfDay(now)
  const yesterday = subDays(today, 1)

  // Start of week (Monday)
  const dayOfWeek = today.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = subDays(today, daysFromMonday)

  // Start of month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  // Previous month
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

  console.log('\n--- Date Context ---')
  console.log(`Today: ${formatDate(today)}`)
  console.log(`Yesterday: ${formatDate(yesterday)}`)
  console.log(`Start of Week: ${formatDate(startOfWeek)}`)
  console.log(`Start of Month: ${formatDate(startOfMonth)}`)

  // Calculate DOW averages
  console.log('\n--- Day-of-Week Averages ---')
  const dowAverages = calculateDOWAverages(transactions)
  for (const [day, data] of Object.entries(dowAverages)) {
    if (data.count > 0) {
      console.log(`${day}: $${Math.round(data.avg).toLocaleString()} (${data.count} samples)`)
    }
  }

  // Yesterday's data
  console.log('\n--- Yesterday\'s Data ---')
  const yesterdayTx = transactions.find(tx => isSameDay(new Date(tx.date), yesterday))
  if (yesterdayTx) {
    const sales = Number(yesterdayTx.netSales)
    const dayName = getDayName(yesterday)
    const avgForDay = dowAverages[dayName]?.avg || 0
    const pctDiff = avgForDay > 0 ? ((sales - avgForDay) / avgForDay) * 100 : 0

    console.log(`Date: ${formatDate(yesterday)}`)
    console.log(`Net Sales: $${sales.toLocaleString()}`)
    console.log(`Orders: ${yesterdayTx.transactionCount}`)
    console.log(`Avg for ${dayName}: $${Math.round(avgForDay).toLocaleString()}`)
    console.log(`Comparison: ${pctDiff >= 0 ? '+' : ''}${Math.round(pctDiff)}% vs avg ${dayName}`)

    if (pctDiff > 10) console.log('Label: GOOD day')
    else if (pctDiff < -10) console.log('Label: SLOW day')
    else console.log('Label: AVERAGE day')
  } else {
    console.log('No data for yesterday - finding most recent open day...')
    const recentOpen = transactions.find(tx => Number(tx.netSales) > 0)
    if (recentOpen) {
      console.log(`Most recent: ${formatDate(new Date(recentOpen.date))} - $${Number(recentOpen.netSales).toLocaleString()}`)
    }
  }

  // This week data
  console.log('\n--- This Week ---')
  let weekTotal = 0
  let weekDays = 0
  for (const tx of transactions) {
    const txDate = new Date(tx.date)
    if (txDate >= startOfWeek && txDate < today) {
      weekTotal += Number(tx.netSales)
      weekDays++
    }
  }
  console.log(`Days counted: ${weekDays}`)
  console.log(`Total so far: $${Math.round(weekTotal).toLocaleString()}`)

  // Project remaining days
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
  const daysRemaining = daysUntilSunday + 1
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  let projectedRemaining = 0
  for (let i = 0; i <= daysUntilSunday; i++) {
    const futureDate = new Date(today)
    futureDate.setDate(today.getDate() + i)
    const futureDayName = dayNames[futureDate.getDay()]
    projectedRemaining += dowAverages[futureDayName]?.avg || 0
  }
  console.log(`Days remaining (incl today): ${daysRemaining}`)
  console.log(`Projected remaining: $${Math.round(projectedRemaining).toLocaleString()}`)
  console.log(`Projected total: $${Math.round(weekTotal + projectedRemaining).toLocaleString()}`)

  // This month data
  console.log('\n--- This Month ---')
  let monthTotal = 0
  let bestDay: { date: Date; amount: number } | null = null
  let slowestDay: { date: Date; amount: number } | null = null

  for (const tx of transactions) {
    const txDate = new Date(tx.date)
    if (txDate >= startOfMonth && txDate < today) {
      const sales = Number(tx.netSales)
      monthTotal += sales
      if (sales > 0) {
        if (!bestDay || sales > bestDay.amount) {
          bestDay = { date: txDate, amount: sales }
        }
        if (!slowestDay || sales < slowestDay.amount) {
          slowestDay = { date: txDate, amount: sales }
        }
      }
    }
  }

  const daysIntoMonth = Math.floor((today.getTime() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000))
  console.log(`Days into ${today.toLocaleDateString('en-US', { month: 'long' })}: ${daysIntoMonth}`)
  console.log(`Total: $${Math.round(monthTotal).toLocaleString()}`)

  if (bestDay) {
    console.log(`Best day: ${formatDate(bestDay.date)} - $${Math.round(bestDay.amount).toLocaleString()}`)
  }
  if (slowestDay) {
    console.log(`Slowest day: ${formatDate(slowestDay.date)} - $${Math.round(slowestDay.amount).toLocaleString()}`)
  }

  // Last month comparison
  console.log('\n--- Last Month Comparison ---')
  let lastMonthTotal = 0
  for (const tx of transactions) {
    const txDate = new Date(tx.date)
    if (txDate >= startOfLastMonth && txDate <= endOfLastMonth) {
      lastMonthTotal += Number(tx.netSales)
    }
  }

  if (lastMonthTotal > 0) {
    const diff = monthTotal - lastMonthTotal
    const pctDiff = ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100
    console.log(`${startOfLastMonth.toLocaleDateString('en-US', { month: 'long' })} total: $${Math.round(lastMonthTotal).toLocaleString()}`)
    console.log(`Difference: ${diff >= 0 ? '+' : ''}$${Math.round(diff).toLocaleString()} (${pctDiff >= 0 ? '+' : ''}${Math.round(pctDiff * 10) / 10}%)`)
  } else {
    console.log('No data for last month')
  }

  // Health Score
  console.log('\n--- Health Score ---')
  const healthScore = await prisma.healthScoreHistory.findFirst({
    where: { locationId: LOCATION_ID },
    orderBy: { month: 'desc' },
  })

  if (healthScore) {
    console.log(`Score: ${Number(healthScore.overallScore)}`)
    console.log(`Trend: ${healthScore.scoreDelta ? Number(healthScore.scoreDelta) : 'N/A'}`)
    console.log(`Status: ${healthScore.status}`)
  } else {
    console.log('No health score data')
  }

  // AI Insights
  console.log('\n--- AI Insights ---')
  const insights = await prisma.aIInsight.findMany({
    where: {
      locationId: LOCATION_ID,
      isCurrent: true,
    },
    orderBy: { generatedAt: 'desc' },
  })

  console.log(`Total current insights: ${insights.length}`)

  const anomaly = insights.find(i => i.insightType === 'anomaly')
  const opportunity = insights.find(i => i.insightType === 'opportunity')
  const trend = insights.find(i => i.insightType === 'trend')

  if (anomaly) console.log(`Anomaly: "${anomaly.headline || anomaly.title}"`)
  if (trend) console.log(`Trend: "${trend.headline || trend.title}"`)
  if (opportunity) console.log(`Opportunity: "${opportunity.headline || opportunity.title}"`)

  // Weather
  console.log('\n--- Weather (Next 2 Days) ---')
  const twoDaysFromNow = new Date(today)
  twoDaysFromNow.setDate(today.getDate() + 2)

  const weather = await prisma.weatherData.findMany({
    where: {
      locationId: LOCATION_ID,
      date: {
        gte: today,
        lte: twoDaysFromNow,
      },
    },
    orderBy: { date: 'asc' },
  })

  if (weather.length > 0) {
    for (const w of weather) {
      console.log(`${formatDate(new Date(w.date))}: ${w.condition || 'Unknown'}, Precip: ${w.precipProb || 0}%`)
    }
  } else {
    console.log('No weather data')
  }

  console.log('\n=== Test Complete ===\n')
}

// Helper functions
function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  return d
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

interface TransactionRecord {
  date: Date
  netSales: unknown
  transactionCount: number
}

function calculateDOWAverages(transactions: TransactionRecord[]) {
  const dowTotals: { [key: string]: { total: number; count: number } } = {
    Sunday: { total: 0, count: 0 },
    Monday: { total: 0, count: 0 },
    Tuesday: { total: 0, count: 0 },
    Wednesday: { total: 0, count: 0 },
    Thursday: { total: 0, count: 0 },
    Friday: { total: 0, count: 0 },
    Saturday: { total: 0, count: 0 },
  }

  for (const tx of transactions) {
    const sales = Number(tx.netSales)
    if (sales <= 0) continue
    const dayName = getDayName(new Date(tx.date))
    if (dowTotals[dayName]) {
      dowTotals[dayName].total += sales
      dowTotals[dayName].count += 1
    }
  }

  const averages: { [key: string]: { avg: number; count: number } } = {}
  for (const [day, data] of Object.entries(dowTotals)) {
    averages[day] = {
      avg: data.count > 0 ? data.total / data.count : 0,
      count: data.count,
    }
  }

  return averages
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
