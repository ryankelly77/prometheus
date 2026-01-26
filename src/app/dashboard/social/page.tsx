'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Link2,
  BarChart3,
  Hash,
  Bookmark,
} from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import {
  socialProviders,
  mockSocialConnection,
  mockConnectedAccounts,
  platformConfig,
  mockSocialStats,
  mockPlatformStats,
  mockFollowerTrend,
  mockEngagementByPlatform,
  mockContentTypePerformance,
  mockTopPosts,
  mockPosts,
  mockHashtagPerformance,
  mockCompetitors,
  formatFollowers,
  type SocialPost,
  type SocialPlatform,
} from '@/lib/social-mock-data'
import { TimeSeriesLine } from '@/components/charts'
import { MetricCard, PeriodSelector } from '@/components/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

// Custom SVG Icons for social platforms
interface SvgIconProps {
  className?: string
  style?: React.CSSProperties
}

function InstagramIcon({ className, style }: SvgIconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}

function FacebookIcon({ className, style }: SvgIconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function TikTokIcon({ className, style }: SvgIconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  )
}

function TwitterIcon({ className, style }: SvgIconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function LinkedInIcon({ className, style }: SvgIconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

// Platform Icon Component
function PlatformIcon({ platform, size = 'md' }: { platform: SocialPlatform; size?: 'sm' | 'md' | 'lg' }) {
  const config = platformConfig[platform]
  const containerSizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const iconComponents: Record<SocialPlatform, React.ComponentType<SvgIconProps>> = {
    instagram: InstagramIcon,
    facebook: FacebookIcon,
    tiktok: TikTokIcon,
    twitter: TwitterIcon,
    linkedin: LinkedInIcon,
  }

  const Icon = iconComponents[platform]

  return (
    <div
      className={cn('rounded-full flex items-center justify-center', containerSizes[size])}
      style={{ backgroundColor: config.bgColor }}
    >
      <Icon className={iconSizes[size]} style={{ color: config.color }} />
    </div>
  )
}

// Provider Connection Card
function ProviderCard({
  provider,
  onConnect,
}: {
  provider: (typeof socialProviders)[0]
  onConnect: () => void
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: `${provider.color}15` }}
          >
            {provider.logo}
          </div>
        </div>
        <h3 className="font-semibold mb-1">{provider.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{provider.description}</p>
        <button
          onClick={onConnect}
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Connect
        </button>
      </CardContent>
    </Card>
  )
}

// No Provider Connected State
function NoProviderState({ onConnect }: { onConnect: (providerId: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Link2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Connect Your Social Media</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Connect a social media management platform to automatically sync your analytics, posts, and engagement metrics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {socialProviders.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onConnect={() => onConnect(provider.id)}
          />
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-2">
            Don&apos;t use a management platform?
          </p>
          <button className="text-sm font-medium text-primary hover:underline">
            Enter metrics manually
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

// Connected Accounts Bar
function ConnectedAccountsBar() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-6">
          {mockConnectedAccounts.map((account) => {
            const config = platformConfig[account.platform]
            return (
              <div key={account.id} className="flex items-center gap-3">
                <PlatformIcon platform={account.platform} />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-sm">{account.handle}</span>
                    {account.isVerified && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFollowers(account.followers)} followers
                  </p>
                </div>
              </div>
            )
          })}
          <button className="ml-auto text-sm text-muted-foreground hover:text-foreground">
            Manage accounts
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

// Platform Breakdown Cards
function PlatformBreakdownCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {mockPlatformStats.map((stat) => {
        const config = platformConfig[stat.platform]
        return (
          <Card key={stat.platform}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <PlatformIcon platform={stat.platform} size="lg" />
                <div>
                  <p className="font-semibold">{config.name}</p>
                  <p className="text-xs text-muted-foreground">{stat.posts} posts this month</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Followers</p>
                  <p className="font-semibold tabular-nums">{formatFollowers(stat.followers)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Growth</p>
                  <p className="font-semibold text-health-excellent tabular-nums">+{formatFollowers(stat.followerGrowth)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Engagement</p>
                  <p className="font-semibold tabular-nums">{stat.engagementRate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reach</p>
                  <p className="font-semibold tabular-nums">{formatFollowers(stat.reach)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Engagement by Platform Chart (horizontal bar)
function EngagementByPlatformChart() {
  const maxEngagement = Math.max(...mockEngagementByPlatform.map((d) => d.engagementRate))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Engagement by Platform</CardTitle>
        <CardDescription>Average engagement rate comparison</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockEngagementByPlatform.map((item) => (
            <div key={item.platform}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{item.platform}</span>
                <span className="text-sm font-semibold tabular-nums">{item.engagementRate}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.engagementRate / maxEngagement) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t pt-3">
          <p className="text-sm text-muted-foreground">
            <span className="mr-1">ℹ️</span>
            TikTok leads in engagement due to its algorithm favoring content discovery
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Content Type Performance Chart
function ContentTypePerformanceChart() {
  const maxEngagement = Math.max(...mockContentTypePerformance.map((d) => d.avgEngagement))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Content Type Performance</CardTitle>
        <CardDescription>Engagement by content format</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockContentTypePerformance.map((item) => (
            <div key={item.type}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.type}</span>
                  <span className="text-xs text-muted-foreground">({item.posts} posts)</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{item.avgEngagement}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.avgEngagement / maxEngagement) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t pt-3">
          <p className="text-sm text-muted-foreground">
            <span className="mr-1">ℹ️</span>
            Video content (Reels) drives 75% more engagement than static images
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Top Posts Grid
function TopPostsGrid() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Performing Posts</CardTitle>
        <CardDescription>Highest engagement this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mockTopPosts.map((post) => (
            <div
              key={post.id}
              className="group relative overflow-hidden rounded-lg border bg-muted/30"
            >
              <div className="aspect-square relative">
                <img
                  src={post.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="h-6 w-6 text-white" />
                </div>
                <div className="absolute top-2 left-2">
                  <PlatformIcon platform={post.platform} size="sm" />
                </div>
                <div className="absolute top-2 right-2">
                  <Badge
                    variant="secondary"
                    className="bg-background/80 backdrop-blur-sm text-xs font-semibold"
                  >
                    {post.engagementRate}%
                  </Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {post.caption}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {formatFollowers(post.likes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {post.comments}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    {post.shares}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Post Type Badge
function PostTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    image: 'bg-blue-100 text-blue-700',
    video: 'bg-purple-100 text-purple-700',
    carousel: 'bg-pink-100 text-pink-700',
    reel: 'bg-red-100 text-red-700',
    story: 'bg-amber-100 text-amber-700',
  }
  return (
    <Badge variant="secondary" className={cn('text-xs capitalize', colors[type])}>
      {type}
    </Badge>
  )
}

// Posts Table
function PostsTable() {
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const filteredPosts = useMemo(() => {
    let filtered = [...mockPosts]

    if (search) {
      filtered = filtered.filter((p) =>
        p.caption.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter((p) => p.platform === platformFilter)
    }

    return filtered.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
  }, [search, platformFilter])

  const totalPages = Math.ceil(filteredPosts.length / pageSize)
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Posts</CardTitle>
              <CardDescription>
                {filteredPosts.length} posts across all platforms
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 px-4 font-medium">Platform</th>
                  <th className="pb-3 px-4 font-medium">Type</th>
                  <th className="pb-3 px-4 font-medium">Caption</th>
                  <th className="pb-3 px-4 font-medium text-right">Likes</th>
                  <th className="pb-3 px-4 font-medium text-right">Comments</th>
                  <th className="pb-3 px-4 font-medium text-right">Reach</th>
                  <th className="pb-3 px-4 font-medium text-right">Eng %</th>
                  <th className="pb-3 pl-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedPost(post)}
                  >
                    <td className="py-3 pr-4 text-sm">
                      {new Date(post.postedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <PlatformIcon platform={post.platform} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <PostTypeBadge type={post.type} />
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <p className="text-sm truncate">{post.caption}</p>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-sm">
                      {post.likes.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-sm">
                      {post.comments}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-sm">
                      {formatFollowers(post.reach)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={cn(
                          'font-semibold tabular-nums text-sm',
                          post.engagementRate >= 8 && 'text-health-excellent',
                          post.engagementRate >= 5 && post.engagementRate < 8 && 'text-health-good',
                          post.engagementRate >= 3 && post.engagementRate < 5 && 'text-health-warning',
                          post.engagementRate < 3 && 'text-muted-foreground'
                        )}
                      >
                        {post.engagementRate}%
                      </span>
                    </td>
                    <td className="py-3 pl-4">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredPosts.length)} of{' '}
                {filteredPosts.length} posts
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Detail Drawer */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setSelectedPost(null)}>
          <div
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-background shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={selectedPost.platform} size="lg" />
                  <div>
                    <PostTypeBadge type={selectedPost.type} />
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(selectedPost.postedAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="rounded-lg p-2 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Post Image */}
              <div className="aspect-square relative rounded-lg overflow-hidden mb-4">
                <img
                  src={selectedPost.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              {/* Caption */}
              <p className="text-sm mb-4">{selectedPost.caption}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-lg border p-3 text-center">
                  <Heart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold tabular-nums">{selectedPost.likes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <MessageCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold tabular-nums">{selectedPost.comments}</p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Share2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold tabular-nums">{selectedPost.shares}</p>
                  <p className="text-xs text-muted-foreground">Shares</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Bookmark className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold tabular-nums">{selectedPost.saves}</p>
                  <p className="text-xs text-muted-foreground">Saves</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold tabular-nums">{formatFollowers(selectedPost.reach)}</p>
                  <p className="text-xs text-muted-foreground">Reach</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold tabular-nums">{selectedPost.engagementRate}%</p>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
              </div>

              {/* Hashtags */}
              {selectedPost.hashtags.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2 text-sm">Hashtags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* View Post Button */}
              <a
                href={selectedPost.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" />
                View Post
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Hashtag Performance Section
function HashtagPerformanceSection() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Hash className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base">Hashtag Performance</CardTitle>
                  <CardDescription>Top performing hashtags by engagement</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{mockHashtagPerformance.length} tracked</span>
                <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Hashtag</th>
                    <th className="pb-3 px-4 font-medium text-right">Uses</th>
                    <th className="pb-3 px-4 font-medium text-right">Avg Eng</th>
                    <th className="pb-3 px-4 font-medium text-right">Reach</th>
                    <th className="pb-3 pl-4 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {mockHashtagPerformance.map((hashtag) => (
                    <tr key={hashtag.hashtag} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{hashtag.hashtag}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{hashtag.uses}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            hashtag.avgEngagement >= 8 && 'text-health-excellent',
                            hashtag.avgEngagement >= 5 && hashtag.avgEngagement < 8 && 'text-health-good',
                            hashtag.avgEngagement < 5 && 'text-muted-foreground'
                          )}
                        >
                          {hashtag.avgEngagement}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                        {formatFollowers(hashtag.reach)}
                      </td>
                      <td className="py-3 pl-4">
                        {hashtag.trending === 'up' && (
                          <TrendingUp className="h-4 w-4 text-health-excellent" />
                        )}
                        {hashtag.trending === 'down' && (
                          <TrendingDown className="h-4 w-4 text-health-danger" />
                        )}
                        {hashtag.trending === 'stable' && (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// Competitor Comparison Section
function CompetitorComparisonSection() {
  const [isOpen, setIsOpen] = useState(false)

  // Include our restaurant for comparison
  const ourAccount = mockConnectedAccounts.find((a) => a.platform === 'instagram')

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base">Competitor Comparison</CardTitle>
                  <CardDescription>How you stack up against competitors</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{mockCompetitors.length} competitors</span>
                <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Your Restaurant */}
              {ourAccount && (
                <div className="flex items-center gap-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                  <img
                    src={ourAccount.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">Restaurant Gwendolyn</p>
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{ourAccount.handle}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-6 text-center">
                    <div>
                      <p className="text-lg font-bold tabular-nums">{formatFollowers(ourAccount.followers)}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums text-health-excellent">+{mockSocialStats.followerGrowthPercent}%</p>
                      <p className="text-xs text-muted-foreground">Growth</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">{mockSocialStats.engagementRate}%</p>
                      <p className="text-xs text-muted-foreground">Engagement</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">{Math.round(mockSocialStats.totalPosts / 4)}/wk</p>
                      <p className="text-xs text-muted-foreground">Posts</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Competitors */}
              {mockCompetitors.map((competitor) => (
                <div key={competitor.id} className="flex items-center gap-4 rounded-lg border p-4">
                  <img
                    src={competitor.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{competitor.name}</p>
                    <p className="text-sm text-muted-foreground">{competitor.handle}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-6 text-center">
                    <div>
                      <p className="text-lg font-bold tabular-nums">{formatFollowers(competitor.followers)}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    <div>
                      <p className={cn(
                        'text-lg font-bold tabular-nums',
                        competitor.followerGrowth > mockSocialStats.followerGrowthPercent ? 'text-health-danger' : 'text-health-excellent'
                      )}>
                        +{competitor.followerGrowth}%
                      </p>
                      <p className="text-xs text-muted-foreground">Growth</p>
                    </div>
                    <div>
                      <p className={cn(
                        'text-lg font-bold tabular-nums',
                        competitor.engagementRate > mockSocialStats.engagementRate ? 'text-health-danger' : 'text-health-excellent'
                      )}>
                        {competitor.engagementRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">Engagement</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">{competitor.postsPerWeek}/wk</p>
                      <p className="text-xs text-muted-foreground">Posts</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// Connected State - Main Content
function ConnectedState() {
  // Convert follower trend to TimeSeriesLine format
  const followerTrendData = mockFollowerTrend.map((d) => ({
    date: d.date,
    value: d.total,
  }))

  return (
    <div className="space-y-6">
      {/* Connected Accounts Bar */}
      <ConnectedAccountsBar />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Followers"
          value={formatFollowers(mockSocialStats.totalFollowers)}
          change={{
            value: `+${formatFollowers(mockSocialStats.followerGrowth)}`,
            type: 'positive',
          }}
          icon="Users"
          info="Combined followers across all connected social media platforms"
        />
        <MetricCard
          title="Follower Growth"
          value={`+${mockSocialStats.followerGrowthPercent}%`}
          change={{
            value: 'This month',
            type: 'positive',
          }}
          icon="TrendingUp"
          info="Month-over-month follower growth rate across all platforms"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${mockSocialStats.engagementRate}%`}
          change={{
            value: `+${mockSocialStats.engagementRateChange}%`,
            type: 'positive',
          }}
          icon="Heart"
          info="Average engagement rate (likes + comments + shares) / followers"
        />
        <MetricCard
          title="Total Reach"
          value={formatFollowers(mockSocialStats.totalReach)}
          change={{
            value: `+${mockSocialStats.reachChange}%`,
            type: 'positive',
          }}
          icon="Eye"
          info="Unique accounts that saw your content this month"
        />
      </div>

      {/* Platform Breakdown */}
      <PlatformBreakdownCards />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <TimeSeriesLine
          title="Follower Growth"
          description="12-month follower trend"
          data={followerTrendData}
          format="number"
          color="hsl(var(--primary))"
        />
        <EngagementByPlatformChart />
        <ContentTypePerformanceChart />
      </div>

      {/* Top Posts */}
      <TopPostsGrid />

      {/* Posts Table */}
      <PostsTable />

      {/* Hashtag & Competitor Sections */}
      <HashtagPerformanceSection />
      <CompetitorComparisonSection />
    </div>
  )
}

// Main Page Component
export default function SocialMediaPage() {
  const { currentLocation, isAllLocations } = useLocation()
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')
  const [isConnected, setIsConnected] = useState(mockSocialConnection.isConnected)

  const handleConnect = (providerId: string) => {
    // In a real app, this would trigger OAuth flow
    console.log('Connecting to:', providerId)
    setIsConnected(true)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Media</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Social media performance across all locations'
              : `Social media performance for ${currentLocation?.name}`}
          </p>
        </div>
        {isConnected && (
          <PeriodSelector
            currentPeriod={currentPeriod}
            periodType={periodType}
            onPeriodChange={setCurrentPeriod}
            onPeriodTypeChange={setPeriodType}
          />
        )}
      </div>

      {/* Content */}
      {isConnected ? (
        <ConnectedState />
      ) : (
        <NoProviderState onConnect={handleConnect} />
      )}
    </div>
  )
}
