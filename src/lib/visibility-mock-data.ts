// ============================================
// VISIBILITY DATA
// ============================================

// Mock user plan for Pro gating
export const mockUserPlan = {
  plan: 'pro' as 'starter' | 'pro' | 'enterprise',
  aiVisibilityEnabled: true,
}

// Visibility Stats
export const mockVisibilityStats = {
  visibilityScore: 72.5,
  visibilityTarget: 80,
  visibilityChange: 4.2,
  estimatedTraffic: 8450,
  trafficChange: 12.3,
  keywordsTracked: 156,
  keywordsInTop10: 23,
  keywordsInTop3: 8,
  domainAuthority: 42,
}

// Visibility Score Trend (12 months)
export const mockVisibilityTrend = [
  { date: '2024-02', value: 58.2 },
  { date: '2024-03', value: 59.8 },
  { date: '2024-04', value: 61.5 },
  { date: '2024-05', value: 60.2 },
  { date: '2024-06', value: 63.4 },
  { date: '2024-07', value: 65.1 },
  { date: '2024-08', value: 64.8 },
  { date: '2024-09', value: 67.2 },
  { date: '2024-10', value: 68.5 },
  { date: '2024-11', value: 70.1 },
  { date: '2024-12', value: 71.8 },
  { date: '2025-01', value: 72.5 },
]

// Keyword Rankings Distribution
export const mockKeywordDistribution = [
  { position: '1-3', count: 8, color: '#16A249' },
  { position: '4-10', count: 15, color: '#82CB15' },
  { position: '11-20', count: 28, color: '#F59E0B' },
  { position: '21-50', count: 45, color: '#F97316' },
  { position: '51-100', count: 60, color: '#EF4444' },
]

// Keyword Movement Summary
export const mockKeywordMovement = {
  improved: 34,
  declined: 18,
  unchanged: 89,
  new: 12,
  lost: 3,
}

// Keyword type for individual keywords
export interface Keyword {
  id: string
  keyword: string
  position: number | null
  previousPosition: number | null
  change: number | null
  volume: number
  traffic: number
  url: string
  difficulty: number
  hasFeaturedSnippet: boolean
  hasLocalPack: boolean
}

// Generate 55 realistic keywords
const keywordData: Omit<Keyword, 'id'>[] = [
  // Top 3 keywords
  { keyword: 'best restaurants san antonio', position: 1, previousPosition: 2, change: 1, volume: 12100, traffic: 2420, url: '/san-antonio', difficulty: 65, hasFeaturedSnippet: true, hasLocalPack: true },
  { keyword: 'san antonio fine dining', position: 2, previousPosition: 3, change: 1, volume: 6600, traffic: 990, url: '/fine-dining', difficulty: 58, hasFeaturedSnippet: false, hasLocalPack: true },
  { keyword: 'romantic restaurants san antonio', position: 2, previousPosition: 2, change: 0, volume: 4400, traffic: 660, url: '/romantic-dining', difficulty: 52, hasFeaturedSnippet: false, hasLocalPack: true },
  { keyword: 'san antonio steakhouse', position: 3, previousPosition: 5, change: 2, volume: 5400, traffic: 648, url: '/steakhouse', difficulty: 61, hasFeaturedSnippet: false, hasLocalPack: true },
  { keyword: 'downtown san antonio restaurants', position: 1, previousPosition: 1, change: 0, volume: 8100, traffic: 1620, url: '/downtown', difficulty: 55, hasFeaturedSnippet: true, hasLocalPack: true },
  { keyword: 'best brunch san antonio', position: 3, previousPosition: 4, change: 1, volume: 5900, traffic: 590, url: '/brunch', difficulty: 48, hasFeaturedSnippet: false, hasLocalPack: true },
  { keyword: 'river walk restaurants', position: 2, previousPosition: 3, change: 1, volume: 14800, traffic: 2220, url: '/river-walk', difficulty: 72, hasFeaturedSnippet: false, hasLocalPack: true },
  { keyword: 'san antonio seafood restaurant', position: 3, previousPosition: 6, change: 3, volume: 3600, traffic: 360, url: '/seafood', difficulty: 45, hasFeaturedSnippet: false, hasLocalPack: true },
  // Positions 4-10
  { keyword: 'upscale restaurants san antonio', position: 4, previousPosition: 5, change: 1, volume: 2900, traffic: 232, url: '/upscale', difficulty: 51, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio restaurant week', position: 5, previousPosition: 8, change: 3, volume: 3200, traffic: 224, url: '/restaurant-week', difficulty: 38, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'private dining san antonio', position: 6, previousPosition: 4, change: -2, volume: 1900, traffic: 114, url: '/private-dining', difficulty: 42, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'anniversary dinner san antonio', position: 7, previousPosition: 9, change: 2, volume: 1600, traffic: 80, url: '/anniversary', difficulty: 35, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'best wine bar san antonio', position: 8, previousPosition: 7, change: -1, volume: 2200, traffic: 88, url: '/wine-bar', difficulty: 44, hasFeaturedSnippet: false, hasLocalPack: true },
  { keyword: 'san antonio date night restaurants', position: 9, previousPosition: 12, change: 3, volume: 2800, traffic: 84, url: '/date-night', difficulty: 47, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'business dinner san antonio', position: 10, previousPosition: 11, change: 1, volume: 1100, traffic: 33, url: '/business-dining', difficulty: 32, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio chef table', position: 4, previousPosition: 6, change: 2, volume: 880, traffic: 70, url: '/chefs-table', difficulty: 28, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'pearl district restaurants', position: 5, previousPosition: 5, change: 0, volume: 4900, traffic: 343, url: '/pearl-district', difficulty: 56, hasFeaturedSnippet: false, hasLocalPack: true },
  { keyword: 'san antonio tasting menu', position: 6, previousPosition: 8, change: 2, volume: 720, traffic: 43, url: '/tasting-menu', difficulty: 31, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'michelin restaurants san antonio', position: 7, previousPosition: 10, change: 3, volume: 1300, traffic: 65, url: '/', difficulty: 68, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio outdoor dining', position: 8, previousPosition: 7, change: -1, volume: 3100, traffic: 124, url: '/outdoor-patio', difficulty: 41, hasFeaturedSnippet: false, hasLocalPack: true },
  { keyword: 'celebration dinner san antonio', position: 9, previousPosition: 14, change: 5, volume: 590, traffic: 18, url: '/celebrations', difficulty: 25, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio happy hour', position: 10, previousPosition: 9, change: -1, volume: 4200, traffic: 126, url: '/happy-hour', difficulty: 53, hasFeaturedSnippet: false, hasLocalPack: true },
  // Positions 11-20
  { keyword: 'farm to table san antonio', position: 11, previousPosition: 15, change: 4, volume: 1400, traffic: 28, url: '/farm-to-table', difficulty: 39, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio cocktail bars', position: 12, previousPosition: 11, change: -1, volume: 2600, traffic: 39, url: '/cocktails', difficulty: 49, hasFeaturedSnippet: false, hasLocalPack: true },
  { keyword: 'best steak san antonio', position: 13, previousPosition: 16, change: 3, volume: 3800, traffic: 46, url: '/steakhouse', difficulty: 62, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio special occasion', position: 14, previousPosition: 13, change: -1, volume: 880, traffic: 11, url: '/special-occasions', difficulty: 29, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'live music restaurants san antonio', position: 15, previousPosition: 18, change: 3, volume: 1700, traffic: 17, url: '/live-music', difficulty: 36, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio prix fixe', position: 16, previousPosition: 14, change: -2, volume: 390, traffic: 4, url: '/prix-fixe', difficulty: 22, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'rooftop restaurant san antonio', position: 17, previousPosition: 20, change: 3, volume: 2100, traffic: 21, url: '/rooftop', difficulty: 43, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio restaurant reservations', position: 18, previousPosition: 17, change: -1, volume: 1200, traffic: 12, url: '/reservations', difficulty: 34, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'gluten free san antonio', position: 19, previousPosition: 22, change: 3, volume: 1500, traffic: 12, url: '/dietary-options', difficulty: 37, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'vegan restaurants san antonio', position: 20, previousPosition: 19, change: -1, volume: 2400, traffic: 19, url: '/vegan-menu', difficulty: 46, hasFeaturedSnippet: false, hasLocalPack: false },
  // Positions 21-50
  { keyword: 'san antonio new years eve dinner', position: 22, previousPosition: 28, change: 6, volume: 1100, traffic: 8, url: '/new-years', difficulty: 33, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio valentines day', position: 24, previousPosition: 21, change: -3, volume: 2200, traffic: 13, url: '/valentines', difficulty: 40, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'mothers day brunch san antonio', position: 26, previousPosition: 30, change: 4, volume: 1800, traffic: 9, url: '/mothers-day', difficulty: 38, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio rehearsal dinner', position: 28, previousPosition: 25, change: -3, volume: 720, traffic: 4, url: '/rehearsal-dinner', difficulty: 26, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio corporate events', position: 31, previousPosition: 35, change: 4, volume: 590, traffic: 2, url: '/corporate-events', difficulty: 30, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio catering', position: 34, previousPosition: 31, change: -3, volume: 1600, traffic: 5, url: '/catering', difficulty: 44, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio wedding venue', position: 38, previousPosition: 42, change: 4, volume: 3200, traffic: 6, url: '/weddings', difficulty: 58, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'kids friendly restaurants san antonio', position: 41, previousPosition: 38, change: -3, volume: 1900, traffic: 4, url: '/family-dining', difficulty: 35, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio food tours', position: 44, previousPosition: 48, change: 4, volume: 1400, traffic: 2, url: '/tours', difficulty: 42, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio cooking classes', position: 47, previousPosition: 44, change: -3, volume: 880, traffic: 1, url: '/classes', difficulty: 31, hasFeaturedSnippet: false, hasLocalPack: false },
  // Positions 51-100
  { keyword: 'san antonio late night food', position: 52, previousPosition: 58, change: 6, volume: 2100, traffic: 2, url: '/late-night', difficulty: 47, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio lunch specials', position: 56, previousPosition: 52, change: -4, volume: 1300, traffic: 1, url: '/lunch', difficulty: 36, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio food delivery', position: 61, previousPosition: 67, change: 6, volume: 4500, traffic: 3, url: '/delivery', difficulty: 62, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio takeout', position: 65, previousPosition: 61, change: -4, volume: 2800, traffic: 2, url: '/takeout', difficulty: 51, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio gift cards', position: 72, previousPosition: 78, change: 6, volume: 480, traffic: 0, url: '/gift-cards', difficulty: 23, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio menu prices', position: 78, previousPosition: 72, change: -6, volume: 720, traffic: 0, url: '/menus', difficulty: 28, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio restaurant jobs', position: 84, previousPosition: 91, change: 7, volume: 1100, traffic: 0, url: '/careers', difficulty: 34, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio chef jobs', position: 88, previousPosition: 83, change: -5, volume: 590, traffic: 0, url: '/careers', difficulty: 29, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio server jobs', position: 95, previousPosition: null, change: null, volume: 880, traffic: 0, url: '/careers', difficulty: 26, hasFeaturedSnippet: false, hasLocalPack: false },
  // Not ranking
  { keyword: 'san antonio food blog', position: null, previousPosition: 98, change: null, volume: 720, traffic: 0, url: '/blog', difficulty: 41, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio restaurant reviews', position: null, previousPosition: null, change: null, volume: 1600, traffic: 0, url: '/reviews', difficulty: 55, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio michelin star', position: null, previousPosition: null, change: null, volume: 1100, traffic: 0, url: '/', difficulty: 71, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'james beard san antonio', position: null, previousPosition: null, change: null, volume: 480, traffic: 0, url: '/', difficulty: 63, hasFeaturedSnippet: false, hasLocalPack: false },
  { keyword: 'san antonio zagat', position: null, previousPosition: null, change: null, volume: 320, traffic: 0, url: '/', difficulty: 58, hasFeaturedSnippet: false, hasLocalPack: false },
]

export const mockKeywords: Keyword[] = keywordData.map((kw, index) => ({
  id: `kw-${index + 1}`,
  ...kw,
}))

// ============================================
// AI VISIBILITY DATA (PRO PLAN)
// ============================================

// AI Visibility Stats
export const mockAIVisibilityStats = {
  aiVisibilityScore: 45.8,
  aiVisibilityTarget: 60,
  aiVisibilityChange: 8.3,
  brandMentions: 127,
  mentionChange: 23,
  avgPosition: 3.2,
  promptsTracked: 42,
  promptsWithMention: 28,
  mentionRate: 66.7,
}

// AI Visibility Trend (12 months)
export const mockAIVisibilityTrend = [
  { date: '2024-02', value: 22.5 },
  { date: '2024-03', value: 25.8 },
  { date: '2024-04', value: 28.2 },
  { date: '2024-05', value: 30.1 },
  { date: '2024-06', value: 32.8 },
  { date: '2024-07', value: 34.5 },
  { date: '2024-08', value: 36.2 },
  { date: '2024-09', value: 38.9 },
  { date: '2024-10', value: 41.3 },
  { date: '2024-11', value: 43.6 },
  { date: '2024-12', value: 44.2 },
  { date: '2025-01', value: 45.8 },
]

// Brand Mentions by Platform (for donut chart)
export const mockAIMentionsByPlatform = [
  { name: 'Google AI', value: 48, color: '#4285F4' },
  { name: 'ChatGPT', value: 35, color: '#10A37F' },
  { name: 'Perplexity', value: 28, color: '#1FB8CD' },
  { name: 'Bing Copilot', value: 16, color: '#00BCF2' },
]

// Prompt Tracking type
export type AIPlatform = 'Google AI' | 'ChatGPT' | 'Perplexity' | 'Bing Copilot'

export interface TrackedPrompt {
  id: string
  prompt: string
  category: string
  platform: AIPlatform
  brandMentioned: boolean
  position: number | null
  mentionContext: string | null
  lastChecked: string
  totalChecks: number
  totalMentions: number
  mentionRate: number
  competitorsMentioned: string[]
}

// Generate 15 tracked prompts
export const mockTrackedPrompts: TrackedPrompt[] = [
  {
    id: 'prompt-1',
    prompt: 'best restaurants in San Antonio',
    category: 'Local Discovery',
    platform: 'Google AI',
    brandMentioned: true,
    position: 2,
    mentionContext: 'For fine dining, Cured and Meadow are top choices, along with Restaurant Gwendolyn which offers a unique farm-to-table experience...',
    lastChecked: '2025-01-24',
    totalChecks: 12,
    totalMentions: 10,
    mentionRate: 83.3,
    competitorsMentioned: ['Cured', 'Meadow', 'Rebelle'],
  },
  {
    id: 'prompt-2',
    prompt: 'where to eat near the River Walk',
    category: 'Local Discovery',
    platform: 'ChatGPT',
    brandMentioned: true,
    position: 1,
    mentionContext: 'Restaurant Gwendolyn is highly recommended for its exceptional cuisine and ambiance, located just steps from the River Walk...',
    lastChecked: '2025-01-24',
    totalChecks: 12,
    totalMentions: 11,
    mentionRate: 91.7,
    competitorsMentioned: ['Boudros', 'The Palm'],
  },
  {
    id: 'prompt-3',
    prompt: 'romantic dinner spots San Antonio',
    category: 'Special Occasions',
    platform: 'Perplexity',
    brandMentioned: true,
    position: 3,
    mentionContext: 'Consider Maverick Texas Brasserie, Restaurant Gwendolyn, or Signature for romantic ambiance...',
    lastChecked: '2025-01-23',
    totalChecks: 10,
    totalMentions: 7,
    mentionRate: 70.0,
    competitorsMentioned: ['Maverick Texas Brasserie', 'Signature', 'Luke'],
  },
  {
    id: 'prompt-4',
    prompt: 'best steakhouse Texas',
    category: 'Cuisine Type',
    platform: 'Google AI',
    brandMentioned: false,
    position: null,
    mentionContext: null,
    lastChecked: '2025-01-24',
    totalChecks: 12,
    totalMentions: 0,
    mentionRate: 0,
    competitorsMentioned: ['Perrys Steakhouse', 'Bobs Steak & Chop House', 'Bohanans'],
  },
  {
    id: 'prompt-5',
    prompt: 'farm to table restaurants San Antonio',
    category: 'Cuisine Type',
    platform: 'ChatGPT',
    brandMentioned: true,
    position: 1,
    mentionContext: 'Restaurant Gwendolyn stands out for its commitment to locally-sourced ingredients and seasonal menus...',
    lastChecked: '2025-01-24',
    totalChecks: 8,
    totalMentions: 8,
    mentionRate: 100.0,
    competitorsMentioned: ['Cured', 'Folc'],
  },
  {
    id: 'prompt-6',
    prompt: 'San Antonio fine dining recommendations',
    category: 'Local Discovery',
    platform: 'Bing Copilot',
    brandMentioned: true,
    position: 2,
    mentionContext: 'Top fine dining options include Mixtli, Restaurant Gwendolyn, and Rebelle...',
    lastChecked: '2025-01-23',
    totalChecks: 10,
    totalMentions: 6,
    mentionRate: 60.0,
    competitorsMentioned: ['Mixtli', 'Rebelle', 'Signature'],
  },
  {
    id: 'prompt-7',
    prompt: 'private dining rooms San Antonio',
    category: 'Events',
    platform: 'Google AI',
    brandMentioned: true,
    position: 4,
    mentionContext: 'For private events, consider Restaurant Gwendolyn, Bohanans, or The Palm which all offer private dining spaces...',
    lastChecked: '2025-01-22',
    totalChecks: 8,
    totalMentions: 5,
    mentionRate: 62.5,
    competitorsMentioned: ['Bohanans', 'The Palm', 'Fig Tree'],
  },
  {
    id: 'prompt-8',
    prompt: 'best brunch San Antonio weekend',
    category: 'Meal Type',
    platform: 'Perplexity',
    brandMentioned: false,
    position: null,
    mentionContext: null,
    lastChecked: '2025-01-24',
    totalChecks: 10,
    totalMentions: 2,
    mentionRate: 20.0,
    competitorsMentioned: ['Guenther House', 'Magnolia Pancake Haus', 'La Panaderia'],
  },
  {
    id: 'prompt-9',
    prompt: 'anniversary dinner ideas San Antonio',
    category: 'Special Occasions',
    platform: 'ChatGPT',
    brandMentioned: true,
    position: 2,
    mentionContext: 'For a memorable anniversary, Restaurant Gwendolyn offers an intimate setting with exceptional cuisine...',
    lastChecked: '2025-01-24',
    totalChecks: 6,
    totalMentions: 5,
    mentionRate: 83.3,
    competitorsMentioned: ['Signature', 'Las Canarias'],
  },
  {
    id: 'prompt-10',
    prompt: 'top rated restaurants San Antonio 2025',
    category: 'Local Discovery',
    platform: 'Google AI',
    brandMentioned: true,
    position: 3,
    mentionContext: 'According to recent reviews, top-rated restaurants include Mixtli, Cured, and Restaurant Gwendolyn...',
    lastChecked: '2025-01-24',
    totalChecks: 4,
    totalMentions: 3,
    mentionRate: 75.0,
    competitorsMentioned: ['Mixtli', 'Cured', 'Rebelle'],
  },
  {
    id: 'prompt-11',
    prompt: 'best wine selection restaurants Texas',
    category: 'Cuisine Type',
    platform: 'Bing Copilot',
    brandMentioned: true,
    position: 5,
    mentionContext: '...notable wine programs can be found at Rebelle, Restaurant Gwendolyn, and Bohanans...',
    lastChecked: '2025-01-23',
    totalChecks: 8,
    totalMentions: 4,
    mentionRate: 50.0,
    competitorsMentioned: ['Rebelle', 'Bohanans', 'Perrys'],
  },
  {
    id: 'prompt-12',
    prompt: 'chef tasting menu San Antonio',
    category: 'Cuisine Type',
    platform: 'Perplexity',
    brandMentioned: true,
    position: 2,
    mentionContext: 'For tasting menu experiences, Mixtli offers an innovative approach, while Restaurant Gwendolyn provides a farm-focused tasting experience...',
    lastChecked: '2025-01-22',
    totalChecks: 6,
    totalMentions: 5,
    mentionRate: 83.3,
    competitorsMentioned: ['Mixtli', 'Signature'],
  },
  {
    id: 'prompt-13',
    prompt: 'corporate event venues San Antonio',
    category: 'Events',
    platform: 'ChatGPT',
    brandMentioned: false,
    position: null,
    mentionContext: null,
    lastChecked: '2025-01-24',
    totalChecks: 10,
    totalMentions: 3,
    mentionRate: 30.0,
    competitorsMentioned: ['La Cantera Resort', 'Hotel Emma', 'The St. Anthony'],
  },
  {
    id: 'prompt-14',
    prompt: 'date night restaurants Pearl District',
    category: 'Local Discovery',
    platform: 'Google AI',
    brandMentioned: true,
    position: 1,
    mentionContext: 'Restaurant Gwendolyn in the Pearl District is perfect for date night with its intimate atmosphere...',
    lastChecked: '2025-01-24',
    totalChecks: 8,
    totalMentions: 7,
    mentionRate: 87.5,
    competitorsMentioned: ['Cured', 'Botika', 'Southerleigh'],
  },
  {
    id: 'prompt-15',
    prompt: 'sustainable restaurants San Antonio',
    category: 'Cuisine Type',
    platform: 'Perplexity',
    brandMentioned: true,
    position: 1,
    mentionContext: 'Restaurant Gwendolyn is a leader in sustainable dining, sourcing ingredients from local farms and maintaining zero-waste practices...',
    lastChecked: '2025-01-23',
    totalChecks: 6,
    totalMentions: 6,
    mentionRate: 100.0,
    competitorsMentioned: ['Cured', 'Folc'],
  },
]

// Prompt categories for filtering
export const mockPromptCategories = ['Local Discovery', 'Special Occasions', 'Cuisine Type', 'Meal Type', 'Events']

// AI Platforms for filtering
export const mockAIPlatforms: AIPlatform[] = ['Google AI', 'ChatGPT', 'Perplexity', 'Bing Copilot']

// ============================================
// MAPS VISIBILITY DATA (BrightLocal)
// ============================================

// Maps Visibility Stats
export const mockMapsVisibilityStats = {
  mapsVisibilityScore: 68.5,
  mapsVisibilityTarget: 75,
  mapsVisibilityChange: 5.2,
  localPackAppearances: 12,
  localPackTotal: 15,
  averageGridRank: 6.8,
  gridCoveragePercent: 72,
  napHealthScore: 87,
  napIssuesCount: 3,
  gbpOptimizationScore: 87,
  keywordsTracked: 15,
  keywordsInLocalPack: 12,
  keywordsInTop3: 8,
  keywordsInTop10: 11,
}

// Maps Visibility Trend (12 months)
export const mockMapsVisibilityTrend = [
  { date: '2024-02', value: 52.3 },
  { date: '2024-03', value: 54.8 },
  { date: '2024-04', value: 56.1 },
  { date: '2024-05', value: 57.4 },
  { date: '2024-06', value: 59.2 },
  { date: '2024-07', value: 61.5 },
  { date: '2024-08', value: 62.8 },
  { date: '2024-09', value: 64.1 },
  { date: '2024-10', value: 65.7 },
  { date: '2024-11', value: 66.9 },
  { date: '2024-12', value: 67.8 },
  { date: '2025-01', value: 68.5 },
]

// Competitors
export const mockMapsCompetitors = [
  { id: 'comp-1', name: 'Cured', color: '#EF4444' },
  { id: 'comp-2', name: 'Mixtli', color: '#F97316' },
  { id: 'comp-3', name: 'Rebelle', color: '#8B5CF6' },
  { id: 'comp-4', name: 'Meadow', color: '#06B6D4' },
]

// Local Keyword type
export interface LocalKeyword {
  id: string
  keyword: string
  searchVolume: number
  localPackPosition: number | null
  inLocalPack: boolean
  mapsPosition: number | null
  previousLocalPackPos: number | null
  previousMapsPosition: number | null
  localPackChange: number | null
  mapsChange: number | null
  averageGridRank: number | null
  gridCoverage: number
  competitorPositions: Record<string, { localPack: number | null; maps: number | null }>
}

// Generate 15 local keywords
export const mockLocalKeywords: LocalKeyword[] = [
  {
    id: 'lk-1',
    keyword: 'restaurants near me',
    searchVolume: 18100,
    localPackPosition: 1,
    inLocalPack: true,
    mapsPosition: 2,
    previousLocalPackPos: 2,
    previousMapsPosition: 3,
    localPackChange: 1,
    mapsChange: 1,
    averageGridRank: 3.2,
    gridCoverage: 92,
    competitorPositions: {
      'Cured': { localPack: 2, maps: 1 },
      'Mixtli': { localPack: 3, maps: 4 },
      'Rebelle': { localPack: null, maps: 6 },
      'Meadow': { localPack: null, maps: 8 },
    },
  },
  {
    id: 'lk-2',
    keyword: 'best restaurants san antonio',
    searchVolume: 12100,
    localPackPosition: 2,
    inLocalPack: true,
    mapsPosition: 3,
    previousLocalPackPos: 2,
    previousMapsPosition: 4,
    localPackChange: 0,
    mapsChange: 1,
    averageGridRank: 4.5,
    gridCoverage: 88,
    competitorPositions: {
      'Cured': { localPack: 1, maps: 2 },
      'Mixtli': { localPack: 3, maps: 5 },
      'Rebelle': { localPack: null, maps: 4 },
      'Meadow': { localPack: null, maps: 9 },
    },
  },
  {
    id: 'lk-3',
    keyword: 'fine dining san antonio',
    searchVolume: 6600,
    localPackPosition: 1,
    inLocalPack: true,
    mapsPosition: 1,
    previousLocalPackPos: 1,
    previousMapsPosition: 2,
    localPackChange: 0,
    mapsChange: 1,
    averageGridRank: 2.8,
    gridCoverage: 96,
    competitorPositions: {
      'Cured': { localPack: 2, maps: 3 },
      'Mixtli': { localPack: 3, maps: 2 },
      'Rebelle': { localPack: null, maps: 5 },
      'Meadow': { localPack: null, maps: 7 },
    },
  },
  {
    id: 'lk-4',
    keyword: 'romantic dinner san antonio',
    searchVolume: 4400,
    localPackPosition: 2,
    inLocalPack: true,
    mapsPosition: 4,
    previousLocalPackPos: 3,
    previousMapsPosition: 5,
    localPackChange: 1,
    mapsChange: 1,
    averageGridRank: 5.1,
    gridCoverage: 84,
    competitorPositions: {
      'Cured': { localPack: 1, maps: 2 },
      'Mixtli': { localPack: null, maps: 8 },
      'Rebelle': { localPack: 3, maps: 3 },
      'Meadow': { localPack: null, maps: 6 },
    },
  },
  {
    id: 'lk-5',
    keyword: 'river walk restaurants',
    searchVolume: 14800,
    localPackPosition: 1,
    inLocalPack: true,
    mapsPosition: 2,
    previousLocalPackPos: 1,
    previousMapsPosition: 2,
    localPackChange: 0,
    mapsChange: 0,
    averageGridRank: 3.8,
    gridCoverage: 90,
    competitorPositions: {
      'Cured': { localPack: 3, maps: 5 },
      'Mixtli': { localPack: null, maps: 12 },
      'Rebelle': { localPack: 2, maps: 3 },
      'Meadow': { localPack: null, maps: 9 },
    },
  },
  {
    id: 'lk-6',
    keyword: 'best brunch san antonio',
    searchVolume: 5900,
    localPackPosition: 3,
    inLocalPack: true,
    mapsPosition: 6,
    previousLocalPackPos: null,
    previousMapsPosition: 8,
    localPackChange: null,
    mapsChange: 2,
    averageGridRank: 7.2,
    gridCoverage: 68,
    competitorPositions: {
      'Cured': { localPack: 1, maps: 2 },
      'Mixtli': { localPack: null, maps: 15 },
      'Rebelle': { localPack: 2, maps: 4 },
      'Meadow': { localPack: null, maps: 11 },
    },
  },
  {
    id: 'lk-7',
    keyword: 'pearl district restaurants',
    searchVolume: 4900,
    localPackPosition: 1,
    inLocalPack: true,
    mapsPosition: 1,
    previousLocalPackPos: 2,
    previousMapsPosition: 1,
    localPackChange: 1,
    mapsChange: 0,
    averageGridRank: 2.4,
    gridCoverage: 100,
    competitorPositions: {
      'Cured': { localPack: 2, maps: 2 },
      'Mixtli': { localPack: 3, maps: 3 },
      'Rebelle': { localPack: null, maps: 8 },
      'Meadow': { localPack: null, maps: 6 },
    },
  },
  {
    id: 'lk-8',
    keyword: 'steakhouse san antonio',
    searchVolume: 5400,
    localPackPosition: null,
    inLocalPack: false,
    mapsPosition: 8,
    previousLocalPackPos: null,
    previousMapsPosition: 10,
    localPackChange: null,
    mapsChange: 2,
    averageGridRank: 9.4,
    gridCoverage: 52,
    competitorPositions: {
      'Cured': { localPack: null, maps: 12 },
      'Mixtli': { localPack: null, maps: 18 },
      'Rebelle': { localPack: 2, maps: 4 },
      'Meadow': { localPack: null, maps: 15 },
    },
  },
  {
    id: 'lk-9',
    keyword: 'date night restaurants san antonio',
    searchVolume: 2800,
    localPackPosition: 2,
    inLocalPack: true,
    mapsPosition: 3,
    previousLocalPackPos: 3,
    previousMapsPosition: 4,
    localPackChange: 1,
    mapsChange: 1,
    averageGridRank: 4.8,
    gridCoverage: 80,
    competitorPositions: {
      'Cured': { localPack: 1, maps: 2 },
      'Mixtli': { localPack: null, maps: 9 },
      'Rebelle': { localPack: 3, maps: 4 },
      'Meadow': { localPack: null, maps: 7 },
    },
  },
  {
    id: 'lk-10',
    keyword: 'farm to table san antonio',
    searchVolume: 1400,
    localPackPosition: 1,
    inLocalPack: true,
    mapsPosition: 1,
    previousLocalPackPos: 1,
    previousMapsPosition: 1,
    localPackChange: 0,
    mapsChange: 0,
    averageGridRank: 1.8,
    gridCoverage: 100,
    competitorPositions: {
      'Cured': { localPack: 2, maps: 2 },
      'Mixtli': { localPack: null, maps: 6 },
      'Rebelle': { localPack: null, maps: 8 },
      'Meadow': { localPack: 3, maps: 4 },
    },
  },
  {
    id: 'lk-11',
    keyword: 'private dining san antonio',
    searchVolume: 1900,
    localPackPosition: 2,
    inLocalPack: true,
    mapsPosition: 5,
    previousLocalPackPos: 2,
    previousMapsPosition: 6,
    localPackChange: 0,
    mapsChange: 1,
    averageGridRank: 6.2,
    gridCoverage: 72,
    competitorPositions: {
      'Cured': { localPack: 3, maps: 6 },
      'Mixtli': { localPack: null, maps: 14 },
      'Rebelle': { localPack: 1, maps: 2 },
      'Meadow': { localPack: null, maps: 11 },
    },
  },
  {
    id: 'lk-12',
    keyword: 'anniversary dinner san antonio',
    searchVolume: 1600,
    localPackPosition: 1,
    inLocalPack: true,
    mapsPosition: 2,
    previousLocalPackPos: 2,
    previousMapsPosition: 3,
    localPackChange: 1,
    mapsChange: 1,
    averageGridRank: 3.6,
    gridCoverage: 88,
    competitorPositions: {
      'Cured': { localPack: 3, maps: 4 },
      'Mixtli': { localPack: null, maps: 10 },
      'Rebelle': { localPack: 2, maps: 3 },
      'Meadow': { localPack: null, maps: 8 },
    },
  },
  {
    id: 'lk-13',
    keyword: 'chef tasting menu san antonio',
    searchVolume: 720,
    localPackPosition: null,
    inLocalPack: false,
    mapsPosition: 4,
    previousLocalPackPos: null,
    previousMapsPosition: 5,
    localPackChange: null,
    mapsChange: 1,
    averageGridRank: 5.4,
    gridCoverage: 76,
    competitorPositions: {
      'Cured': { localPack: 2, maps: 3 },
      'Mixtli': { localPack: 1, maps: 1 },
      'Rebelle': { localPack: null, maps: 7 },
      'Meadow': { localPack: null, maps: 9 },
    },
  },
  {
    id: 'lk-14',
    keyword: 'outdoor dining san antonio',
    searchVolume: 3100,
    localPackPosition: 3,
    inLocalPack: true,
    mapsPosition: 7,
    previousLocalPackPos: null,
    previousMapsPosition: 9,
    localPackChange: null,
    mapsChange: 2,
    averageGridRank: 8.1,
    gridCoverage: 60,
    competitorPositions: {
      'Cured': { localPack: 1, maps: 3 },
      'Mixtli': { localPack: null, maps: 16 },
      'Rebelle': { localPack: 2, maps: 5 },
      'Meadow': { localPack: null, maps: 10 },
    },
  },
  {
    id: 'lk-15',
    keyword: 'wine bar san antonio',
    searchVolume: 2200,
    localPackPosition: null,
    inLocalPack: false,
    mapsPosition: 12,
    previousLocalPackPos: null,
    previousMapsPosition: 14,
    localPackChange: null,
    mapsChange: 2,
    averageGridRank: 11.8,
    gridCoverage: 36,
    competitorPositions: {
      'Cured': { localPack: 2, maps: 4 },
      'Mixtli': { localPack: null, maps: 18 },
      'Rebelle': { localPack: 1, maps: 2 },
      'Meadow': { localPack: null, maps: 15 },
    },
  },
]

// Grid Point type for heatmap
export interface GridPoint {
  row: number
  col: number
  lat: number
  lng: number
  rank: number | null
  inLocalPack: boolean
  competitors: Record<string, number | null>
}

// Generate 5x5 grid data for a keyword
function generateGridData(baseRank: number, coverage: number): GridPoint[] {
  const gridPoints: GridPoint[] = []
  const centerLat = 29.4241
  const centerLng = -98.4936
  const gridSpacing = 0.015 // ~1 mile

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const lat = centerLat + (row - 2) * gridSpacing
      const lng = centerLng + (col - 2) * gridSpacing

      // Determine if this point ranks (based on coverage)
      const shouldRank = Math.random() * 100 < coverage

      // Generate rank with some variance around base rank
      let rank: number | null = null
      if (shouldRank) {
        const variance = Math.floor(Math.random() * 8) - 3
        rank = Math.max(1, Math.min(20, Math.round(baseRank + variance)))
      }

      // Generate competitor ranks
      const competitors: Record<string, number | null> = {}
      mockMapsCompetitors.forEach((comp) => {
        if (Math.random() > 0.3) {
          competitors[comp.name] = Math.floor(Math.random() * 15) + 1
        } else {
          competitors[comp.name] = null
        }
      })

      gridPoints.push({
        row,
        col,
        lat,
        lng,
        rank,
        inLocalPack: rank !== null && rank <= 3,
        competitors,
      })
    }
  }
  return gridPoints
}

// Pre-generate grid data for each keyword
export const mockGridDataByKeyword: Record<string, GridPoint[]> = {}
mockLocalKeywords.forEach((kw) => {
  mockGridDataByKeyword[kw.id] = generateGridData(
    kw.averageGridRank || 10,
    kw.gridCoverage
  )
})

// NAP Audit Data
export interface NAPDirectoryResult {
  directory: string
  found: boolean
  nameMatch: boolean
  addressMatch: boolean
  phoneMatch: boolean
  issues: string[]
  url: string | null
}

export const mockNAPAudit = {
  overallScore: 87,
  nameScore: 95,
  addressScore: 82,
  phoneScore: 88,
  totalDirectories: 24,
  directoriesFound: 21,
  directoriesCorrect: 18,
  directoriesWithIssues: 3,
  auditedAt: '2025-01-20',
  directoryResults: [
    { directory: 'Google Business Profile', found: true, nameMatch: true, addressMatch: true, phoneMatch: true, issues: [], url: 'https://maps.google.com/...' },
    { directory: 'Yelp', found: true, nameMatch: true, addressMatch: false, phoneMatch: true, issues: ['Old address - missing suite number'], url: 'https://yelp.com/biz/...' },
    { directory: 'Facebook', found: true, nameMatch: true, addressMatch: true, phoneMatch: true, issues: [], url: 'https://facebook.com/...' },
    { directory: 'TripAdvisor', found: true, nameMatch: true, addressMatch: true, phoneMatch: false, issues: ['Phone shows old number'], url: 'https://tripadvisor.com/...' },
    { directory: 'Apple Maps', found: true, nameMatch: true, addressMatch: true, phoneMatch: true, issues: [], url: null },
    { directory: 'Bing Places', found: true, nameMatch: true, addressMatch: true, phoneMatch: true, issues: [], url: 'https://bing.com/maps/...' },
    { directory: 'Foursquare', found: true, nameMatch: true, addressMatch: false, phoneMatch: true, issues: ['Zip code incorrect'], url: 'https://foursquare.com/...' },
    { directory: 'OpenTable', found: true, nameMatch: true, addressMatch: true, phoneMatch: true, issues: [], url: 'https://opentable.com/...' },
    { directory: 'Yellow Pages', found: false, nameMatch: false, addressMatch: false, phoneMatch: false, issues: ['Listing not found'], url: null },
    { directory: 'Superpages', found: false, nameMatch: false, addressMatch: false, phoneMatch: false, issues: ['Listing not found'], url: null },
    { directory: 'Citysearch', found: false, nameMatch: false, addressMatch: false, phoneMatch: false, issues: ['Listing not found'], url: null },
  ] as NAPDirectoryResult[],
  priorityFixes: [
    { directory: 'Yelp', issue: 'Update address to include Suite 100', severity: 'high' },
    { directory: 'TripAdvisor', issue: 'Update phone to (210) 555-1234', severity: 'high' },
    { directory: 'Foursquare', issue: 'Correct zip code to 78205', severity: 'medium' },
  ],
}

// GBP Audit Data
export const mockGBPAudit = {
  optimizationScore: 87,
  completenessScore: 92,
  basicInfoScore: 100,
  photosScore: 78,
  reviewsScore: 88,
  postsScore: 72,
  qaScore: 65,
  attributesScore: 95,
  photoCount: 48,
  reviewCount: 347,
  averageRating: 4.6,
  responseRate: 94,
  postsLast30Days: 3,
  qaCount: 12,
  auditedAt: '2025-01-20',
  recommendations: [
    { category: 'Photos', recommendation: 'Add 10+ more interior photos - competitors average 65 photos', priority: 'high' },
    { category: 'Posts', recommendation: 'Increase posting frequency to 2x per week', priority: 'medium' },
    { category: 'Q&A', recommendation: 'Answer 5 unanswered questions and seed 3 new FAQs', priority: 'medium' },
    { category: 'Reviews', recommendation: 'Respond to 2 unanswered reviews from this week', priority: 'high' },
  ],
}

// Ranking history for drawer chart
export const mockRankingHistory = [
  { date: '2024-08', localPack: 3, maps: 5 },
  { date: '2024-09', localPack: 3, maps: 4 },
  { date: '2024-10', localPack: 2, maps: 4 },
  { date: '2024-11', localPack: 2, maps: 3 },
  { date: '2024-12', localPack: 2, maps: 3 },
  { date: '2025-01', localPack: 1, maps: 2 },
]
