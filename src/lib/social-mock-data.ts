// ============================================
// SOCIAL MEDIA DATA
// ============================================

// Social Media Providers
export type SocialProvider = 'sprout' | 'metricool' | 'hootsuite' | 'buffer' | 'later'
export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'linkedin'

export interface ProviderConfig {
  id: SocialProvider
  name: string
  description: string
  logo: string
  color: string
}

export const socialProviders: ProviderConfig[] = [
  { id: 'sprout', name: 'Sprout Social', description: 'Enterprise social media management', logo: '🌱', color: '#59C3B3' },
  { id: 'metricool', name: 'Metricool', description: 'Analytics and scheduling platform', logo: '📊', color: '#00D4AA' },
  { id: 'hootsuite', name: 'Hootsuite', description: 'Social media dashboard', logo: '🦉', color: '#143059' },
  { id: 'buffer', name: 'Buffer', description: 'Publishing and analytics', logo: '📤', color: '#168EEA' },
  { id: 'later', name: 'Later', description: 'Visual social marketing', logo: '📅', color: '#F5A623' },
]

// Mock connection state
export const mockSocialConnection = {
  isConnected: true,
  provider: 'metricool' as SocialProvider,
  connectedAt: '2024-06-15',
}

// Connected Accounts
export interface ConnectedAccount {
  id: string
  platform: SocialPlatform
  handle: string
  profileUrl: string
  avatarUrl: string
  followers: number
  following: number
  posts: number
  isVerified: boolean
}

export const mockConnectedAccounts: ConnectedAccount[] = [
  {
    id: 'ig-1',
    platform: 'instagram',
    handle: '@restaurantgwendolyn',
    profileUrl: 'https://instagram.com/restaurantgwendolyn',
    avatarUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
    followers: 12400,
    following: 892,
    posts: 487,
    isVerified: true,
  },
  {
    id: 'fb-1',
    platform: 'facebook',
    handle: 'Restaurant Gwendolyn',
    profileUrl: 'https://facebook.com/restaurantgwendolyn',
    avatarUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
    followers: 8200,
    following: 156,
    posts: 324,
    isVerified: true,
  },
  {
    id: 'tt-1',
    platform: 'tiktok',
    handle: '@gwendolynsa',
    profileUrl: 'https://tiktok.com/@gwendolynsa',
    avatarUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
    followers: 5100,
    following: 45,
    posts: 89,
    isVerified: false,
  },
]

// Platform display config - icon is Lucide icon name
export const platformConfig: Record<SocialPlatform, { name: string; icon: string; color: string; bgColor: string }> = {
  instagram: { name: 'Instagram', icon: 'Instagram', color: '#E4405F', bgColor: '#FCEEF2' },
  facebook: { name: 'Facebook', icon: 'Facebook', color: '#1877F2', bgColor: '#E7F3FF' },
  tiktok: { name: 'TikTok', icon: 'Music', color: '#000000', bgColor: '#F0F0F0' },
  twitter: { name: 'Twitter', icon: 'Twitter', color: '#1DA1F2', bgColor: '#E8F5FD' },
  linkedin: { name: 'LinkedIn', icon: 'Linkedin', color: '#0A66C2', bgColor: '#E8F1F8' },
}

// Social Stats
export const mockSocialStats = {
  totalFollowers: 25700,
  followerGrowth: 1247,
  followerGrowthPercent: 5.1,
  engagementRate: 4.8,
  engagementRateChange: 0.6,
  totalReach: 187500,
  reachChange: 12.3,
  totalImpressions: 342800,
  totalPosts: 47,
  avgLikesPerPost: 324,
  avgCommentsPerPost: 28,
}

// Platform-specific stats
export interface PlatformStats {
  platform: SocialPlatform
  followers: number
  followerGrowth: number
  engagementRate: number
  reach: number
  impressions: number
  posts: number
}

export const mockPlatformStats: PlatformStats[] = [
  { platform: 'instagram', followers: 12400, followerGrowth: 680, engagementRate: 5.2, reach: 98500, impressions: 178200, posts: 24 },
  { platform: 'facebook', followers: 8200, followerGrowth: 312, engagementRate: 3.8, reach: 62400, impressions: 112600, posts: 18 },
  { platform: 'tiktok', followers: 5100, followerGrowth: 255, engagementRate: 6.4, reach: 26600, impressions: 52000, posts: 5 },
]

// Follower Growth Trend (12 months)
export const mockFollowerTrend = [
  { date: '2024-02', instagram: 9800, facebook: 6900, tiktok: 2100, total: 18800 },
  { date: '2024-03', instagram: 10100, facebook: 7100, tiktok: 2400, total: 19600 },
  { date: '2024-04', instagram: 10400, facebook: 7300, tiktok: 2800, total: 20500 },
  { date: '2024-05', instagram: 10700, facebook: 7400, tiktok: 3200, total: 21300 },
  { date: '2024-06', instagram: 11000, facebook: 7600, tiktok: 3500, total: 22100 },
  { date: '2024-07', instagram: 11200, facebook: 7700, tiktok: 3800, total: 22700 },
  { date: '2024-08', instagram: 11500, facebook: 7800, tiktok: 4100, total: 23400 },
  { date: '2024-09', instagram: 11700, facebook: 7900, tiktok: 4400, total: 24000 },
  { date: '2024-10', instagram: 11900, facebook: 8000, tiktok: 4600, total: 24500 },
  { date: '2024-11', instagram: 12100, facebook: 8100, tiktok: 4800, total: 25000 },
  { date: '2024-12', instagram: 12250, facebook: 8150, tiktok: 4950, total: 25350 },
  { date: '2025-01', instagram: 12400, facebook: 8200, tiktok: 5100, total: 25700 },
]

// Engagement by Platform
export const mockEngagementByPlatform = [
  { platform: 'Instagram', engagementRate: 5.2, color: '#E4405F' },
  { platform: 'TikTok', engagementRate: 6.4, color: '#000000' },
  { platform: 'Facebook', engagementRate: 3.8, color: '#1877F2' },
]

// Content Type Performance
export const mockContentTypePerformance = [
  { type: 'Reels/Video', avgEngagement: 7.2, posts: 18, color: '#E4405F' },
  { type: 'Carousel', avgEngagement: 5.8, posts: 12, color: '#8B5CF6' },
  { type: 'Single Image', avgEngagement: 4.1, posts: 14, color: '#3B82F6' },
  { type: 'Stories', avgEngagement: 3.2, posts: 45, color: '#F59E0B' },
]

// Post type
export type PostType = 'image' | 'video' | 'carousel' | 'reel' | 'story'

export interface SocialPost {
  id: string
  platform: SocialPlatform
  type: PostType
  caption: string
  imageUrl: string
  postedAt: string
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  impressions: number
  engagementRate: number
  hashtags: string[]
  url: string
}

// Generate 20 mock posts
export const mockPosts: SocialPost[] = [
  {
    id: 'post-1',
    platform: 'instagram',
    type: 'reel',
    caption: 'Behind the scenes in our kitchen 🔥 Watch Chef Michael prepare our signature dry-aged ribeye. #FarmToTable #SanAntonioFood #ChefLife',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop',
    postedAt: '2025-01-24',
    likes: 1247,
    comments: 89,
    shares: 156,
    saves: 234,
    reach: 18500,
    impressions: 24200,
    engagementRate: 9.3,
    hashtags: ['FarmToTable', 'SanAntonioFood', 'ChefLife', 'FineDining'],
    url: 'https://instagram.com/p/abc123',
  },
  {
    id: 'post-2',
    platform: 'instagram',
    type: 'carousel',
    caption: 'New winter menu highlights ❄️ Swipe to see all 8 new dishes including our truffle risotto and braised short rib. Reservations recommended!',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop',
    postedAt: '2025-01-22',
    likes: 892,
    comments: 67,
    shares: 45,
    saves: 312,
    reach: 14200,
    impressions: 19800,
    engagementRate: 7.8,
    hashtags: ['WinterMenu', 'NewDishes', 'SanAntonioDining', 'Foodie'],
    url: 'https://instagram.com/p/abc124',
  },
  {
    id: 'post-3',
    platform: 'tiktok',
    type: 'video',
    caption: 'POV: You ordered our famous chocolate soufflé 🍫 #FoodTok #SanAntonioTikTok #Dessert #FineDining',
    imageUrl: 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=400&h=400&fit=crop',
    postedAt: '2025-01-21',
    likes: 4523,
    comments: 234,
    shares: 892,
    saves: 1567,
    reach: 52000,
    impressions: 78400,
    engagementRate: 12.1,
    hashtags: ['FoodTok', 'SanAntonioTikTok', 'Dessert', 'FineDining', 'ChocolateSouffle'],
    url: 'https://tiktok.com/@gwendolynsa/video/123',
  },
  {
    id: 'post-4',
    platform: 'facebook',
    type: 'image',
    caption: 'Join us for Valentine\'s Day! Our special 5-course menu features local ingredients and wine pairings. Book now - limited availability.',
    imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=400&h=400&fit=crop',
    postedAt: '2025-01-20',
    likes: 423,
    comments: 56,
    shares: 89,
    saves: 0,
    reach: 8900,
    impressions: 12400,
    engagementRate: 5.4,
    hashtags: ['ValentinesDay', 'DateNight', 'SanAntonioRestaurants'],
    url: 'https://facebook.com/restaurantgwendolyn/posts/123',
  },
  {
    id: 'post-5',
    platform: 'instagram',
    type: 'image',
    caption: 'Our sommelier\'s pick of the week: 2019 Chateau Margaux 🍷 Perfect pairing with our lamb dishes.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop',
    postedAt: '2025-01-19',
    likes: 567,
    comments: 34,
    shares: 23,
    saves: 89,
    reach: 9800,
    impressions: 13200,
    engagementRate: 5.9,
    hashtags: ['WineWednesday', 'Sommelier', 'FineDining', 'WinePairing'],
    url: 'https://instagram.com/p/abc125',
  },
  {
    id: 'post-6',
    platform: 'instagram',
    type: 'reel',
    caption: 'The art of plating 🎨 Our pastry chef creates edible masterpieces every day. #PlatingGoals',
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop',
    postedAt: '2025-01-18',
    likes: 1089,
    comments: 78,
    shares: 145,
    saves: 456,
    reach: 16700,
    impressions: 22100,
    engagementRate: 8.7,
    hashtags: ['PlatingGoals', 'PastryChef', 'FoodArt', 'Desserts'],
    url: 'https://instagram.com/p/abc126',
  },
  {
    id: 'post-7',
    platform: 'facebook',
    type: 'image',
    caption: 'Thank you San Antonio Current for featuring us in "Best Fine Dining 2025"! We\'re honored to serve this amazing community.',
    imageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=400&fit=crop',
    postedAt: '2025-01-17',
    likes: 678,
    comments: 89,
    shares: 134,
    saves: 0,
    reach: 12300,
    impressions: 16800,
    engagementRate: 6.8,
    hashtags: ['BestOfSanAntonio', 'FineDining', 'ThankYou'],
    url: 'https://facebook.com/restaurantgwendolyn/posts/124',
  },
  {
    id: 'post-8',
    platform: 'tiktok',
    type: 'video',
    caption: 'When the table next to you orders the tomahawk 👀🥩 #Steak #FoodTok #ASMR',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop',
    postedAt: '2025-01-16',
    likes: 8934,
    comments: 412,
    shares: 1234,
    saves: 2341,
    reach: 89000,
    impressions: 124000,
    engagementRate: 14.5,
    hashtags: ['Steak', 'FoodTok', 'ASMR', 'Tomahawk', 'FineDining'],
    url: 'https://tiktok.com/@gwendolynsa/video/124',
  },
  {
    id: 'post-9',
    platform: 'instagram',
    type: 'carousel',
    caption: 'Sunday brunch vibes ☀️ Join us every Sunday 10am-2pm for our chef\'s brunch menu featuring local eggs, house-made pastries, and bottomless mimosas.',
    imageUrl: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&h=400&fit=crop',
    postedAt: '2025-01-15',
    likes: 723,
    comments: 45,
    shares: 67,
    saves: 189,
    reach: 11200,
    impressions: 15600,
    engagementRate: 6.5,
    hashtags: ['SundayBrunch', 'Brunch', 'Mimosas', 'SanAntonioBrunch'],
    url: 'https://instagram.com/p/abc127',
  },
  {
    id: 'post-10',
    platform: 'facebook',
    type: 'video',
    caption: 'A message from Chef Michael about our commitment to sustainable sourcing and supporting local farmers.',
    imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop',
    postedAt: '2025-01-14',
    likes: 345,
    comments: 67,
    shares: 89,
    saves: 0,
    reach: 7800,
    impressions: 10200,
    engagementRate: 5.1,
    hashtags: ['Sustainability', 'LocalFarmers', 'FarmToTable'],
    url: 'https://facebook.com/restaurantgwendolyn/posts/125',
  },
  {
    id: 'post-11',
    platform: 'instagram',
    type: 'image',
    caption: 'Fresh oysters, just arrived from the Gulf Coast 🦪 Available while supplies last.',
    imageUrl: 'https://images.unsplash.com/photo-1606731219412-183da5f7e6ee?w=400&h=400&fit=crop',
    postedAt: '2025-01-13',
    likes: 456,
    comments: 28,
    shares: 12,
    saves: 67,
    reach: 8400,
    impressions: 11200,
    engagementRate: 4.8,
    hashtags: ['Oysters', 'Seafood', 'GulfCoast', 'FreshCatch'],
    url: 'https://instagram.com/p/abc128',
  },
  {
    id: 'post-12',
    platform: 'tiktok',
    type: 'video',
    caption: 'Replying to @foodlover - how we make our pasta from scratch every morning 🍝 #PastaMaking #Homemade #ChefSecrets',
    imageUrl: 'https://images.unsplash.com/photo-1556761223-4c4282c73f77?w=400&h=400&fit=crop',
    postedAt: '2025-01-12',
    likes: 3421,
    comments: 189,
    shares: 567,
    saves: 892,
    reach: 34000,
    impressions: 48000,
    engagementRate: 10.2,
    hashtags: ['PastaMaking', 'Homemade', 'ChefSecrets', 'ItalianFood'],
    url: 'https://tiktok.com/@gwendolynsa/video/125',
  },
  {
    id: 'post-13',
    platform: 'instagram',
    type: 'reel',
    caption: 'Date night done right 💕 Tag someone you\'d bring here! #DateNight #RomanticDinner',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop',
    postedAt: '2025-01-11',
    likes: 934,
    comments: 123,
    shares: 234,
    saves: 345,
    reach: 14500,
    impressions: 19800,
    engagementRate: 8.2,
    hashtags: ['DateNight', 'RomanticDinner', 'SanAntonioDate', 'FineDining'],
    url: 'https://instagram.com/p/abc129',
  },
  {
    id: 'post-14',
    platform: 'facebook',
    type: 'image',
    caption: 'Private dining room now available for corporate events and celebrations. Contact us for booking inquiries.',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
    postedAt: '2025-01-10',
    likes: 234,
    comments: 34,
    shares: 56,
    saves: 0,
    reach: 5600,
    impressions: 7800,
    engagementRate: 4.2,
    hashtags: ['PrivateDining', 'CorporateEvents', 'Celebrations'],
    url: 'https://facebook.com/restaurantgwendolyn/posts/126',
  },
  {
    id: 'post-15',
    platform: 'instagram',
    type: 'image',
    caption: 'Truffle season is here 🖤 Our black truffle tasting menu is available for a limited time.',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
    postedAt: '2025-01-09',
    likes: 678,
    comments: 45,
    shares: 34,
    saves: 156,
    reach: 10200,
    impressions: 14100,
    engagementRate: 6.1,
    hashtags: ['TruffleSeason', 'BlackTruffle', 'TastingMenu', 'LuxuryDining'],
    url: 'https://instagram.com/p/abc130',
  },
  {
    id: 'post-16',
    platform: 'tiktok',
    type: 'video',
    caption: 'The sound of a perfectly seared scallop 🤤 #ASMR #Scallops #ChefSkills',
    imageUrl: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=400&fit=crop',
    postedAt: '2025-01-08',
    likes: 5678,
    comments: 287,
    shares: 789,
    saves: 1234,
    reach: 56000,
    impressions: 78000,
    engagementRate: 11.8,
    hashtags: ['ASMR', 'Scallops', 'ChefSkills', 'Seafood', 'Cooking'],
    url: 'https://tiktok.com/@gwendolynsa/video/126',
  },
  {
    id: 'post-17',
    platform: 'instagram',
    type: 'carousel',
    caption: 'Meet our team! Swipe to meet the talented people behind every dish at Restaurant Gwendolyn. #MeetTheTeam #TeamWork',
    imageUrl: 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=400&h=400&fit=crop',
    postedAt: '2025-01-07',
    likes: 812,
    comments: 89,
    shares: 45,
    saves: 67,
    reach: 12100,
    impressions: 16400,
    engagementRate: 6.7,
    hashtags: ['MeetTheTeam', 'TeamWork', 'RestaurantLife', 'Chefs'],
    url: 'https://instagram.com/p/abc131',
  },
  {
    id: 'post-18',
    platform: 'facebook',
    type: 'image',
    caption: 'Happy New Year from all of us at Restaurant Gwendolyn! Thank you for making 2024 our best year yet. Cheers to 2025! 🥂',
    imageUrl: 'https://images.unsplash.com/photo-1482275548304-a58859dc31b7?w=400&h=400&fit=crop',
    postedAt: '2025-01-01',
    likes: 567,
    comments: 78,
    shares: 45,
    saves: 0,
    reach: 9800,
    impressions: 13400,
    engagementRate: 5.8,
    hashtags: ['HappyNewYear', 'NewYear2025', 'ThankYou', 'Cheers'],
    url: 'https://facebook.com/restaurantgwendolyn/posts/127',
  },
  {
    id: 'post-19',
    platform: 'instagram',
    type: 'reel',
    caption: 'New Year\'s Eve countdown at Restaurant Gwendolyn 🎉 What a night! #NYE2025 #Celebration',
    imageUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=400&h=400&fit=crop',
    postedAt: '2025-01-01',
    likes: 1456,
    comments: 167,
    shares: 289,
    saves: 123,
    reach: 21000,
    impressions: 28400,
    engagementRate: 9.1,
    hashtags: ['NYE2025', 'Celebration', 'NewYearsEve', 'Party'],
    url: 'https://instagram.com/p/abc132',
  },
  {
    id: 'post-20',
    platform: 'instagram',
    type: 'image',
    caption: 'Grateful for every guest who chose to celebrate with us this holiday season. Here\'s to more memorable meals in 2025! ✨',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop',
    postedAt: '2024-12-30',
    likes: 623,
    comments: 56,
    shares: 34,
    saves: 78,
    reach: 9500,
    impressions: 12800,
    engagementRate: 5.6,
    hashtags: ['Grateful', 'HolidaySeason', 'FineDining', 'SanAntonio'],
    url: 'https://instagram.com/p/abc133',
  },
]

// Top posts (sorted by engagement)
export const mockTopPosts = [...mockPosts].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 4)

// Hashtag Performance
export interface HashtagPerformance {
  hashtag: string
  uses: number
  avgEngagement: number
  reach: number
  trending: 'up' | 'down' | 'stable'
}

export const mockHashtagPerformance: HashtagPerformance[] = [
  { hashtag: '#FoodTok', uses: 5, avgEngagement: 11.2, reach: 145000, trending: 'up' },
  { hashtag: '#SanAntonioFood', uses: 8, avgEngagement: 6.8, reach: 78000, trending: 'up' },
  { hashtag: '#FineDining', uses: 12, avgEngagement: 6.2, reach: 92000, trending: 'stable' },
  { hashtag: '#FarmToTable', uses: 6, avgEngagement: 5.9, reach: 45000, trending: 'up' },
  { hashtag: '#ChefLife', uses: 4, avgEngagement: 5.4, reach: 34000, trending: 'stable' },
  { hashtag: '#DateNight', uses: 5, avgEngagement: 5.1, reach: 38000, trending: 'up' },
  { hashtag: '#ASMR', uses: 3, avgEngagement: 9.8, reach: 112000, trending: 'up' },
  { hashtag: '#Brunch', uses: 4, avgEngagement: 4.8, reach: 28000, trending: 'down' },
  { hashtag: '#WineWednesday', uses: 4, avgEngagement: 4.2, reach: 22000, trending: 'stable' },
  { hashtag: '#Foodie', uses: 7, avgEngagement: 3.9, reach: 41000, trending: 'down' },
]

// Competitor Data
export interface Competitor {
  id: string
  name: string
  handle: string
  platform: SocialPlatform
  followers: number
  followerGrowth: number
  engagementRate: number
  postsPerWeek: number
  avatarUrl: string
}

export const mockCompetitors: Competitor[] = [
  {
    id: 'comp-1',
    name: 'Cured',
    handle: '@caborestaurant',
    platform: 'instagram',
    followers: 18200,
    followerGrowth: 3.2,
    engagementRate: 4.1,
    postsPerWeek: 5,
    avatarUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop',
  },
  {
    id: 'comp-2',
    name: 'Mixtli',
    handle: '@mixtlisa',
    platform: 'instagram',
    followers: 15800,
    followerGrowth: 4.5,
    engagementRate: 5.8,
    postsPerWeek: 4,
    avatarUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=100&h=100&fit=crop',
  },
  {
    id: 'comp-3',
    name: 'Rebelle',
    handle: '@rebellesa',
    platform: 'instagram',
    followers: 9400,
    followerGrowth: 2.8,
    engagementRate: 3.9,
    postsPerWeek: 3,
    avatarUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=100&h=100&fit=crop',
  },
]

// Format follower count
export function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}
