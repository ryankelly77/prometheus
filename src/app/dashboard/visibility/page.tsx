'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Eye,
  Target,
  Award,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Sparkles,
  Lock,
  Plus,
  ChevronRight,
  ExternalLink,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Building2,
  Phone,
  MapPinned,
  Users,
  Image,
  MessageSquare,
  HelpCircle,
  Settings,
} from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import {
  mockVisibilityStats,
  mockVisibilityTrend,
  mockKeywordDistribution,
  mockKeywordMovement,
  mockKeywords,
  mockUserPlan,
  mockAIVisibilityStats,
  mockAIVisibilityTrend,
  mockAIMentionsByPlatform,
  mockTrackedPrompts,
  mockPromptCategories,
  mockAIPlatforms,
  mockMapsVisibilityStats,
  mockMapsVisibilityTrend,
  mockMapsCompetitors,
  mockLocalKeywords,
  mockGridDataByKeyword,
  mockNAPAudit,
  mockGBPAudit,
  mockRankingHistory,
  type Keyword,
  type TrackedPrompt,
  type AIPlatform,
  type LocalKeyword,
  type GridPoint,
} from '@/lib/visibility-mock-data'
import { mockHealthScore } from '@/lib/mock-data'
import { TimeSeriesLine, DonutChart } from '@/components/charts'
import { MetricCard, PeriodSelector, SectionHeader } from '@/components/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { TimeSeriesLine as RankingHistoryChart } from '@/components/charts'
import { cn } from '@/lib/utils'

// Sortable Header component
function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
}: {
  label: string
  sortKey: string
  currentSort: { key: string; direction: 'asc' | 'desc' }
  onSort: (key: string) => void
}) {
  const isActive = currentSort.key === sortKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <span className="flex flex-col">
        <ChevronUp
          className={cn(
            'h-3 w-3 -mb-1',
            isActive && currentSort.direction === 'asc' ? 'text-primary' : 'text-muted-foreground/30'
          )}
        />
        <ChevronDown
          className={cn(
            'h-3 w-3 -mt-1',
            isActive && currentSort.direction === 'desc' ? 'text-primary' : 'text-muted-foreground/30'
          )}
        />
      </span>
    </button>
  )
}

// Position change indicator
function PositionChange({ change }: { change: number | null }) {
  if (change === null) return <span className="text-muted-foreground">New</span>
  if (change === 0) return <Minus className="h-4 w-4 text-muted-foreground" />
  if (change > 0) {
    return (
      <span className="flex items-center gap-0.5 text-health-excellent">
        <TrendingUp className="h-4 w-4" />
        {change}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-health-danger">
      <TrendingDown className="h-4 w-4" />
      {Math.abs(change)}
    </span>
  )
}

// Keyword Movement Card
function KeywordMovementCard() {
  const { improved, declined, unchanged, new: newKw, lost } = mockKeywordMovement
  const total = improved + declined + unchanged + newKw + lost

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Keyword Movement</CardTitle>
        <CardDescription>Changes from last month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-health-excellent" />
              <span className="text-sm">Improved</span>
            </div>
            <span className="font-semibold tabular-nums">{improved}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-health-danger" />
              <span className="text-sm">Declined</span>
            </div>
            <span className="font-semibold tabular-nums">{declined}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              <span className="text-sm">Unchanged</span>
            </div>
            <span className="font-semibold tabular-nums">{unchanged}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="text-sm">New</span>
            </div>
            <span className="font-semibold tabular-nums">{newKw}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-health-warning" />
              <span className="text-sm">Lost</span>
            </div>
            <span className="font-semibold tabular-nums">{lost}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Keywords Table Component
function KeywordsTable() {
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'position',
    direction: 'asc',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const filteredKeywords = useMemo(() => {
    let filtered = [...mockKeywords]

    // Search filter
    if (search) {
      filtered = filtered.filter((kw) =>
        kw.keyword.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter((kw) => {
        if (positionFilter === '1-3') return kw.position !== null && kw.position <= 3
        if (positionFilter === '4-10') return kw.position !== null && kw.position >= 4 && kw.position <= 10
        if (positionFilter === '11-20') return kw.position !== null && kw.position >= 11 && kw.position <= 20
        if (positionFilter === '21-50') return kw.position !== null && kw.position >= 21 && kw.position <= 50
        if (positionFilter === '51-100') return kw.position !== null && kw.position >= 51 && kw.position <= 100
        if (positionFilter === 'not-ranking') return kw.position === null
        return true
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string | null = a[sort.key as keyof Keyword] as number | string | null
      let bVal: number | string | null = b[sort.key as keyof Keyword] as number | string | null

      // Handle nulls - put them at the end
      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'string') {
        return sort.direction === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal)
      }

      return sort.direction === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

    return filtered
  }, [search, positionFilter, sort])

  const totalPages = Math.ceil(filteredKeywords.length / pageSize)
  const paginatedKeywords = filteredKeywords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleSort = (key: string) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Top Keywords</CardTitle>
            <CardDescription>
              {filteredKeywords.length} keywords tracked
            </CardDescription>
          </div>
        </div>
        {/* Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search keywords..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>
          <select
            value={positionFilter}
            onChange={(e) => {
              setPositionFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Positions</option>
            <option value="1-3">Position 1-3</option>
            <option value="4-10">Position 4-10</option>
            <option value="11-20">Position 11-20</option>
            <option value="21-50">Position 21-50</option>
            <option value="51-100">Position 51-100</option>
            <option value="not-ranking">Not Ranking</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">
                  <SortableHeader label="Keyword" sortKey="keyword" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="pb-3 px-4 font-medium">
                  <SortableHeader label="Position" sortKey="position" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="pb-3 px-4 font-medium">Change</th>
                <th className="pb-3 px-4 font-medium">
                  <SortableHeader label="Volume" sortKey="volume" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="pb-3 px-4 font-medium">
                  <SortableHeader label="Traffic" sortKey="traffic" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="pb-3 pl-4 font-medium">URL</th>
              </tr>
            </thead>
            <tbody>
              {paginatedKeywords.map((kw) => (
                <tr key={kw.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{kw.keyword}</span>
                      {kw.hasFeaturedSnippet && (
                        <Badge variant="secondary" className="text-xs">Featured</Badge>
                      )}
                      {kw.hasLocalPack && (
                        <Badge variant="outline" className="text-xs">Local</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {kw.position ? (
                      <span className={cn(
                        'font-semibold tabular-nums',
                        kw.position <= 3 && 'text-health-excellent',
                        kw.position > 3 && kw.position <= 10 && 'text-health-good',
                        kw.position > 10 && kw.position <= 20 && 'text-health-warning',
                        kw.position > 20 && 'text-muted-foreground'
                      )}>
                        {kw.position}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <PositionChange change={kw.change} />
                  </td>
                  <td className="py-3 px-4 tabular-nums text-muted-foreground">
                    {kw.volume.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 tabular-nums text-muted-foreground">
                    {kw.traffic.toLocaleString()}
                  </td>
                  <td className="py-3 pl-4">
                    <span className="text-sm text-muted-foreground">{kw.url}</span>
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
              {Math.min(currentPage * pageSize, filteredKeywords.length)} of{' '}
              {filteredKeywords.length} keywords
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
  )
}

// AI Visibility Upgrade Banner
function AIUpgradeBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 text-xl font-bold">Unlock AI Visibility</h3>
        <p className="mb-6 max-w-md text-muted-foreground">
          Track how your restaurant appears in AI-powered search results from ChatGPT, Google AI, Perplexity, and more.
          See which prompts mention your brand and optimize your AI presence.
        </p>
        <button className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          Upgrade to Pro
        </button>
      </div>
    </div>
  )
}

// Blurred AI Preview
function BlurredAIPreview() {
  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-background/50 rounded-xl">
        <div className="text-center">
          <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Pro feature</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4 opacity-50">
        <Card className="p-4">
          <div className="h-4 w-20 bg-muted rounded mb-2" />
          <div className="h-8 w-16 bg-muted rounded" />
        </Card>
        <Card className="p-4">
          <div className="h-4 w-20 bg-muted rounded mb-2" />
          <div className="h-8 w-16 bg-muted rounded" />
        </Card>
        <Card className="p-4">
          <div className="h-4 w-20 bg-muted rounded mb-2" />
          <div className="h-8 w-16 bg-muted rounded" />
        </Card>
        <Card className="p-4">
          <div className="h-4 w-20 bg-muted rounded mb-2" />
          <div className="h-8 w-16 bg-muted rounded" />
        </Card>
      </div>
    </div>
  )
}

// Prompt Tracking Table
function PromptTrackingTable() {
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [mentionFilter, setMentionFilter] = useState<string>('all')
  const [selectedPrompt, setSelectedPrompt] = useState<TrackedPrompt | null>(null)

  const filteredPrompts = useMemo(() => {
    let filtered = [...mockTrackedPrompts]

    if (search) {
      filtered = filtered.filter((p) =>
        p.prompt.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter((p) => p.platform === platformFilter)
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category === categoryFilter)
    }

    if (mentionFilter !== 'all') {
      filtered = filtered.filter((p) =>
        mentionFilter === 'mentioned' ? p.brandMentioned : !p.brandMentioned
      )
    }

    return filtered
  }, [search, platformFilter, categoryFilter, mentionFilter])

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Prompt Tracking</CardTitle>
              <CardDescription>
                {filteredPrompts.length} prompts tracked across AI platforms
              </CardDescription>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Prompt
            </button>
          </div>
          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Platforms</option>
              {mockAIPlatforms.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Categories</option>
              {mockPromptCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={mentionFilter}
              onChange={(e) => setMentionFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Results</option>
              <option value="mentioned">Mentioned</option>
              <option value="not-mentioned">Not Mentioned</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Prompt</th>
                  <th className="pb-3 px-4 font-medium">Platform</th>
                  <th className="pb-3 px-4 font-medium">Mentioned</th>
                  <th className="pb-3 px-4 font-medium">Position</th>
                  <th className="pb-3 px-4 font-medium">Mention Rate</th>
                  <th className="pb-3 px-4 font-medium">Last Check</th>
                  <th className="pb-3 pl-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPrompts.map((prompt) => (
                  <tr
                    key={prompt.id}
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    <td className="py-3 pr-4">
                      <div>
                        <span className="font-medium">{prompt.prompt}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{prompt.category}</Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        style={{
                          backgroundColor: prompt.platform === 'Google AI' ? '#E8F0FE' :
                            prompt.platform === 'ChatGPT' ? '#E6F4F1' :
                            prompt.platform === 'Perplexity' ? '#E5F6F8' : '#E5F7FC',
                          color: prompt.platform === 'Google AI' ? '#4285F4' :
                            prompt.platform === 'ChatGPT' ? '#10A37F' :
                            prompt.platform === 'Perplexity' ? '#1FB8CD' : '#00BCF2',
                        }}
                      >
                        {prompt.platform}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {prompt.brandMentioned ? (
                        <Check className="h-5 w-5 text-health-excellent" />
                      ) : (
                        <X className="h-5 w-5 text-health-danger" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {prompt.position ? (
                        <span className={cn(
                          'font-semibold tabular-nums',
                          prompt.position <= 2 && 'text-health-excellent',
                          prompt.position > 2 && prompt.position <= 4 && 'text-health-good',
                          prompt.position > 4 && 'text-muted-foreground'
                        )}>
                          #{prompt.position}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'font-medium tabular-nums',
                        prompt.mentionRate >= 70 && 'text-health-excellent',
                        prompt.mentionRate >= 40 && prompt.mentionRate < 70 && 'text-health-warning',
                        prompt.mentionRate < 40 && 'text-health-danger'
                      )}>
                        {prompt.mentionRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {prompt.lastChecked}
                    </td>
                    <td className="py-3 pl-4">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      {selectedPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setSelectedPrompt(null)}>
          <div
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-background shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">{selectedPrompt.prompt}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{selectedPrompt.category}</Badge>
                    <Badge
                      style={{
                        backgroundColor: selectedPrompt.platform === 'Google AI' ? '#E8F0FE' :
                          selectedPrompt.platform === 'ChatGPT' ? '#E6F4F1' :
                          selectedPrompt.platform === 'Perplexity' ? '#E5F6F8' : '#E5F7FC',
                        color: selectedPrompt.platform === 'Google AI' ? '#4285F4' :
                          selectedPrompt.platform === 'ChatGPT' ? '#10A37F' :
                          selectedPrompt.platform === 'Perplexity' ? '#1FB8CD' : '#00BCF2',
                      }}
                    >
                      {selectedPrompt.platform}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPrompt(null)}
                  className="rounded-lg p-2 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Mentioned</p>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedPrompt.brandMentioned ? (
                      <>
                        <Check className="h-5 w-5 text-health-excellent" />
                        <span className="font-semibold text-health-excellent">Yes</span>
                      </>
                    ) : (
                      <>
                        <X className="h-5 w-5 text-health-danger" />
                        <span className="font-semibold text-health-danger">No</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="text-2xl font-bold mt-1">
                    {selectedPrompt.position ? `#${selectedPrompt.position}` : '—'}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Mention Rate</p>
                  <p className="text-2xl font-bold mt-1">{selectedPrompt.mentionRate.toFixed(0)}%</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Checks</p>
                  <p className="text-2xl font-bold mt-1">{selectedPrompt.totalChecks}</p>
                </div>
              </div>

              {/* Mention Context */}
              {selectedPrompt.mentionContext && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Mention Context</h3>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground italic">
                      &ldquo;{selectedPrompt.mentionContext}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {/* Competitors */}
              {selectedPrompt.competitorsMentioned.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Competitors Mentioned</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPrompt.competitorsMentioned.map((comp) => (
                      <Badge key={comp} variant="secondary">{comp}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Checked */}
              <div className="text-sm text-muted-foreground">
                Last checked: {selectedPrompt.lastChecked}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Get rank color based on position
function getRankColor(rank: number | null): string {
  if (rank === null) return 'bg-health-danger'
  if (rank <= 3) return 'bg-health-excellent'
  if (rank <= 10) return 'bg-health-good'
  if (rank <= 20) return 'bg-health-warning'
  return 'bg-health-danger'
}

function getRankTextColor(rank: number | null): string {
  if (rank === null) return 'text-muted-foreground'
  if (rank <= 3) return 'text-health-excellent'
  if (rank <= 10) return 'text-health-good'
  if (rank <= 20) return 'text-health-warning'
  return 'text-health-danger'
}

// Local Pack Position Badge
function LocalPackBadge({ position }: { position: number | null }) {
  if (position === null) return <span className="text-muted-foreground">—</span>
  return (
    <span className={cn(
      'font-semibold tabular-nums',
      position === 1 && 'text-health-excellent',
      position === 2 && 'text-health-good',
      position === 3 && 'text-health-warning'
    )}>
      #{position}
    </span>
  )
}

// Local Search Grid Heatmap Component
function LocalSearchGrid({
  selectedKeyword,
  showCompetitors,
  selectedCompetitor,
}: {
  selectedKeyword: string
  showCompetitors: boolean
  selectedCompetitor: string | null
}) {
  const gridData = mockGridDataByKeyword[selectedKeyword] || []

  // Get the grid as 5x5 matrix
  const gridMatrix: GridPoint[][] = []
  for (let row = 0; row < 5; row++) {
    gridMatrix.push(gridData.filter((p) => p.row === row))
  }

  // Static map URL for San Antonio Pearl District area (center point)
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=29.4241,-98.4936&zoom=14&size=400x400&scale=2&maptype=roadmap&style=feature:all|saturation:-20&key=demo`

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Local Search Grid</CardTitle>
        <CardDescription>5-mile radius around your location</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-health-excellent" />
            <span>1-3</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-health-good" />
            <span>4-10</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-health-warning" />
            <span>11-20</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-health-danger" />
            <span>21+</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-health-danger" />
            <span>Not ranking</span>
          </div>
        </div>

        {/* Grid on Map */}
        <div className="relative aspect-square w-full rounded-lg overflow-hidden border">
          {/* Map background - using OpenStreetMap tile for demo */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://tile.openstreetmap.org/14/3732/6869.png'),
                               url('https://tile.openstreetmap.org/14/3733/6869.png'),
                               linear-gradient(135deg, #e8e8e8 0%, #f5f5f5 100%)`,
              backgroundColor: '#e8e8e8',
            }}
          />
          {/* Fallback map-like pattern */}
          <div className="absolute inset-0 opacity-30">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-streets" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#999" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="#f0efe9"/>
              <rect width="100%" height="100%" fill="url(#grid-streets)"/>
              {/* Simulated streets */}
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#fff" strokeWidth="3"/>
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#fff" strokeWidth="3"/>
              <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#ddd" strokeWidth="1.5"/>
              <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#ddd" strokeWidth="1.5"/>
              <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#ddd" strokeWidth="1.5"/>
              <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#ddd" strokeWidth="1.5"/>
            </svg>
          </div>

          {/* Grid overlay */}
          <div className="absolute inset-0 p-8">
            <div className="grid grid-cols-5 gap-4 h-full">
              {gridMatrix.flat().map((point, idx) => {
                const displayRank = showCompetitors && selectedCompetitor
                  ? point.competitors[selectedCompetitor]
                  : point.rank

                return (
                  <div
                    key={idx}
                    className="relative flex items-center justify-center"
                  >
                    <div
                      className={cn(
                        'group relative h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer transition-all hover:scale-110 hover:z-10 shadow-lg border-2 border-white/50',
                        getRankColor(displayRank)
                      )}
                    >
                      {displayRank || '—'}
                      {/* Center marker indicator */}
                      {point.row === 2 && point.col === 2 && (
                        <div className="absolute -inset-1 border-2 border-primary rounded-full animate-pulse" />
                      )}
                      {/* Hover tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                        <div className="bg-popover text-popover-foreground rounded-md shadow-lg border px-2 py-1.5 text-xs whitespace-nowrap">
                          <div className="font-semibold mb-1">You: {point.rank ? `#${point.rank}` : '—'}</div>
                          {mockMapsCompetitors.slice(0, 2).map((comp) => (
                            <div key={comp.id} className="flex justify-between gap-3 text-muted-foreground">
                              <span>{comp.name}:</span>
                              <span>{point.competitors[comp.name] ? `#${point.competitors[comp.name]}` : '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Location label */}
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium shadow">
            <MapPin className="h-3 w-3 inline mr-1 text-primary" />
            Pearl District, San Antonio
          </div>
        </div>

        {/* Info footer */}
        <div className="mt-4 border-t pt-3">
          <p className="text-sm text-muted-foreground">
            <span className="mr-1">ℹ️</span>
            Each point shows your Google Maps ranking when searching from that location. Hover for competitor positions.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Local Rankings Table with Drawer
function LocalRankingsTable() {
  const [search, setSearch] = useState('')
  const [localPackFilter, setLocalPackFilter] = useState<string>('all')
  const [selectedKeyword, setSelectedKeyword] = useState<LocalKeyword | null>(null)

  const filteredKeywords = useMemo(() => {
    let filtered = [...mockLocalKeywords]

    if (search) {
      filtered = filtered.filter((kw) =>
        kw.keyword.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (localPackFilter === 'in-pack') {
      filtered = filtered.filter((kw) => kw.inLocalPack)
    } else if (localPackFilter === 'not-in-pack') {
      filtered = filtered.filter((kw) => !kw.inLocalPack)
    }

    return filtered
  }, [search, localPackFilter])

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Local Rankings</CardTitle>
              <CardDescription>
                {filteredKeywords.length} keywords tracked
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={localPackFilter}
              onChange={(e) => setLocalPackFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Keywords</option>
              <option value="in-pack">In Local Pack</option>
              <option value="not-in-pack">Not in Local Pack</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Keyword</th>
                  <th className="pb-3 px-4 font-medium">Local Pack</th>
                  <th className="pb-3 px-4 font-medium">Maps Pos</th>
                  <th className="pb-3 px-4 font-medium">Change</th>
                  <th className="pb-3 px-4 font-medium">Grid Avg</th>
                  <th className="pb-3 px-4 font-medium">Coverage</th>
                  <th className="pb-3 pl-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredKeywords.map((kw) => (
                  <tr
                    key={kw.id}
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedKeyword(kw)}
                  >
                    <td className="py-3 pr-4">
                      <span className="font-medium">{kw.keyword}</span>
                    </td>
                    <td className="py-3 px-4">
                      <LocalPackBadge position={kw.localPackPosition} />
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('font-semibold tabular-nums', getRankTextColor(kw.mapsPosition))}>
                        {kw.mapsPosition ? `#${kw.mapsPosition}` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <PositionChange change={kw.mapsChange} />
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('tabular-nums', getRankTextColor(kw.averageGridRank ? Math.round(kw.averageGridRank) : null))}>
                        {kw.averageGridRank?.toFixed(1) || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              kw.gridCoverage >= 80 ? 'bg-health-excellent' :
                              kw.gridCoverage >= 60 ? 'bg-health-good' :
                              kw.gridCoverage >= 40 ? 'bg-health-warning' : 'bg-health-danger'
                            )}
                            style={{ width: `${kw.gridCoverage}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{kw.gridCoverage}%</span>
                      </div>
                    </td>
                    <td className="py-3 pl-4">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      {selectedKeyword && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setSelectedKeyword(null)}>
          <div
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-background shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">{selectedKeyword.keyword}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedKeyword.searchVolume.toLocaleString()} monthly searches
                  </p>
                </div>
                <button
                  onClick={() => setSelectedKeyword(null)}
                  className="rounded-lg p-2 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Local Pack</p>
                  <p className="text-2xl font-bold mt-1">
                    <LocalPackBadge position={selectedKeyword.localPackPosition} />
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Maps Position</p>
                  <p className={cn('text-2xl font-bold mt-1', getRankTextColor(selectedKeyword.mapsPosition))}>
                    {selectedKeyword.mapsPosition ? `#${selectedKeyword.mapsPosition}` : '—'}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Grid Average</p>
                  <p className="text-2xl font-bold mt-1">{selectedKeyword.averageGridRank?.toFixed(1) || '—'}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Grid Coverage</p>
                  <p className="text-2xl font-bold mt-1">{selectedKeyword.gridCoverage}%</p>
                </div>
              </div>

              {/* Mini Heatmap */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Search Grid</h3>
                <div className="grid grid-cols-5 gap-1 max-w-[200px]">
                  {(mockGridDataByKeyword[selectedKeyword.id] || []).map((point, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'aspect-square rounded text-white text-xs font-bold flex items-center justify-center',
                        getRankColor(point.rank)
                      )}
                    >
                      {point.rank || '—'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Competitor Comparison */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Competitor Positions</h3>
                <div className="space-y-2">
                  {mockMapsCompetitors.map((comp) => {
                    const positions = selectedKeyword.competitorPositions[comp.name]
                    return (
                      <div key={comp.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: comp.color }} />
                          <span className="font-medium">{comp.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Pack: </span>
                            <span className="font-semibold">{positions?.localPack || '—'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Maps: </span>
                            <span className="font-semibold">{positions?.maps || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Ranking History */}
              <div>
                <h3 className="font-medium mb-3">Ranking History</h3>
                <div className="h-[200px] rounded-lg border p-4">
                  <div className="h-full flex items-end justify-between gap-2">
                    {mockRankingHistory.map((point, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex-1 w-full flex flex-col justify-end gap-1">
                          <div
                            className="w-full bg-primary/80 rounded-t"
                            style={{ height: `${Math.max(10, (20 - (point.maps || 20)) * 5)}%` }}
                            title={`Maps: #${point.maps}`}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{point.date.split('-')[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// NAP & GBP Health Panel
function NAPGBPHealthPanel() {
  const [napOpen, setNapOpen] = useState(false)
  const [gbpOpen, setGbpOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* NAP Health */}
      <Collapsible open={napOpen} onOpenChange={setNapOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    mockNAPAudit.overallScore >= 90 ? 'bg-health-excellent/10 text-health-excellent' :
                    mockNAPAudit.overallScore >= 80 ? 'bg-health-good/10 text-health-good' :
                    mockNAPAudit.overallScore >= 70 ? 'bg-health-warning/10 text-health-warning' :
                    'bg-health-danger/10 text-health-danger'
                  )}>
                    <MapPinned className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-base">NAP Consistency</CardTitle>
                    <CardDescription>Name, Address, Phone across directories</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={cn(
                      'text-2xl font-bold tabular-nums',
                      mockNAPAudit.overallScore >= 90 ? 'text-health-excellent' :
                      mockNAPAudit.overallScore >= 80 ? 'text-health-good' :
                      mockNAPAudit.overallScore >= 70 ? 'text-health-warning' :
                      'text-health-danger'
                    )}>
                      {mockNAPAudit.overallScore}%
                    </p>
                    <p className="text-xs text-muted-foreground">{mockNAPAudit.directoriesWithIssues} issues</p>
                  </div>
                  <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', napOpen && 'rotate-180')} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Score breakdown */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="text-lg font-bold">{mockNAPAudit.nameScore}%</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Address</p>
                  <p className="text-lg font-bold">{mockNAPAudit.addressScore}%</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <p className="text-lg font-bold">{mockNAPAudit.phoneScore}%</p>
                </div>
              </div>

              {/* Priority Fixes */}
              <div className="mb-4">
                <h4 className="font-medium mb-2 text-sm">Priority Fixes</h4>
                <div className="space-y-2">
                  {mockNAPAudit.priorityFixes.map((fix, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                      <AlertTriangle className={cn(
                        'h-4 w-4 mt-0.5 shrink-0',
                        fix.severity === 'high' ? 'text-health-danger' : 'text-health-warning'
                      )} />
                      <div>
                        <p className="font-medium text-sm">{fix.directory}</p>
                        <p className="text-xs text-muted-foreground">{fix.issue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Directory Status */}
              <div>
                <h4 className="font-medium mb-2 text-sm">Directory Status ({mockNAPAudit.directoriesFound}/{mockNAPAudit.totalDirectories} found)</h4>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {mockNAPAudit.directoryResults.slice(0, 8).map((dir, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded p-2 hover:bg-muted/50">
                      <span className="text-sm">{dir.directory}</span>
                      <div className="flex items-center gap-2">
                        {!dir.found ? (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        ) : dir.issues.length > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-health-warning" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-health-excellent" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* GBP Health */}
      <Collapsible open={gbpOpen} onOpenChange={setGbpOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    mockGBPAudit.optimizationScore >= 90 ? 'bg-health-excellent/10 text-health-excellent' :
                    mockGBPAudit.optimizationScore >= 80 ? 'bg-health-good/10 text-health-good' :
                    mockGBPAudit.optimizationScore >= 70 ? 'bg-health-warning/10 text-health-warning' :
                    'bg-health-danger/10 text-health-danger'
                  )}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-base">Google Business Profile</CardTitle>
                    <CardDescription>Profile optimization score</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={cn(
                      'text-2xl font-bold tabular-nums',
                      mockGBPAudit.optimizationScore >= 90 ? 'text-health-excellent' :
                      mockGBPAudit.optimizationScore >= 80 ? 'text-health-good' :
                      mockGBPAudit.optimizationScore >= 70 ? 'text-health-warning' :
                      'text-health-danger'
                    )}>
                      {mockGBPAudit.optimizationScore}%
                    </p>
                    <p className="text-xs text-muted-foreground">{mockGBPAudit.recommendations.length} recommendations</p>
                  </div>
                  <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', gbpOpen && 'rotate-180')} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Score breakdown */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Basic Info', score: mockGBPAudit.basicInfoScore, icon: Info },
                  { label: 'Photos', score: mockGBPAudit.photosScore, icon: Image },
                  { label: 'Reviews', score: mockGBPAudit.reviewsScore, icon: MessageSquare },
                  { label: 'Posts', score: mockGBPAudit.postsScore, icon: Settings },
                  { label: 'Q&A', score: mockGBPAudit.qaScore, icon: HelpCircle },
                  { label: 'Attributes', score: mockGBPAudit.attributesScore, icon: CheckCircle2 },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border p-2 text-center">
                    <item.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={cn(
                      'font-bold',
                      (item.score || 0) >= 90 ? 'text-health-excellent' :
                      (item.score || 0) >= 80 ? 'text-health-good' :
                      (item.score || 0) >= 70 ? 'text-health-warning' :
                      'text-health-danger'
                    )}>
                      {item.score}%
                    </p>
                  </div>
                ))}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-lg font-bold">{mockGBPAudit.photoCount}</p>
                  <p className="text-xs text-muted-foreground">Photos</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-lg font-bold">{mockGBPAudit.reviewCount}</p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-lg font-bold">{mockGBPAudit.averageRating}</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-lg font-bold">{mockGBPAudit.responseRate}%</p>
                  <p className="text-xs text-muted-foreground">Response</p>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-medium mb-2 text-sm">Recommendations</h4>
                <div className="space-y-2">
                  {mockGBPAudit.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className={cn(
                        'mt-0.5 h-2 w-2 rounded-full shrink-0',
                        rec.priority === 'high' ? 'bg-health-danger' : 'bg-health-warning'
                      )} />
                      <div>
                        <p className="font-medium text-sm">{rec.category}</p>
                        <p className="text-xs text-muted-foreground">{rec.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}

// Maps Visibility Tab Component
function MapsVisibilityTab() {
  const [selectedKeyword, setSelectedKeyword] = useState(mockLocalKeywords[0]?.id || '')
  const [showCompetitors, setShowCompetitors] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Maps Score"
          value={mockMapsVisibilityStats.mapsVisibilityScore.toString()}
          change={{
            value: `+${mockMapsVisibilityStats.mapsVisibilityChange}`,
            type: 'positive',
          }}
          icon="Target"
          info="Composite score based on local pack appearances, maps positions, and grid coverage"
        />
        <MetricCard
          title="Local Pack"
          value={`${mockMapsVisibilityStats.localPackAppearances}/${mockMapsVisibilityStats.localPackTotal}`}
          change={{
            value: `${mockMapsVisibilityStats.keywordsInTop3} in top 3`,
            type: 'positive',
          }}
          icon="Target"
          info="Keywords where you appear in the Google Local Pack (top 3 map results)"
        />
        <MetricCard
          title="Avg Grid Rank"
          value={mockMapsVisibilityStats.averageGridRank.toString()}
          change={{
            value: `${mockMapsVisibilityStats.gridCoveragePercent}% coverage`,
            type: 'positive',
          }}
          icon="Target"
          info="Average position across all grid check points within 5-mile radius"
        />
        <MetricCard
          title="NAP Health"
          value={`${mockMapsVisibilityStats.napHealthScore}%`}
          change={{
            value: `${mockMapsVisibilityStats.napIssuesCount} issues`,
            type: mockMapsVisibilityStats.napIssuesCount > 0 ? 'negative' : 'positive',
          }}
          icon="Target"
          info="Name, Address, Phone consistency score across business directories"
        />
      </div>

      {/* Grid Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-xs">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Select Keyword</Label>
              <Select value={selectedKeyword} onValueChange={setSelectedKeyword}>
                <SelectTrigger>
                  <SelectValue placeholder="Select keyword" />
                </SelectTrigger>
                <SelectContent>
                  {mockLocalKeywords.map((kw) => (
                    <SelectItem key={kw.id} value={kw.id}>
                      {kw.keyword}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-competitors"
                  checked={showCompetitors}
                  onCheckedChange={setShowCompetitors}
                />
                <Label htmlFor="show-competitors" className="text-sm">Show Competitor</Label>
              </div>
              {showCompetitors && (
                <Select value={selectedCompetitor || ''} onValueChange={setSelectedCompetitor}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockMapsCompetitors.map((comp) => (
                      <SelectItem key={comp.id} value={comp.name}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: comp.color }} />
                          {comp.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid and Trend Chart + NAP/GBP */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Local Search Grid */}
        <LocalSearchGrid
          selectedKeyword={selectedKeyword}
          showCompetitors={showCompetitors}
          selectedCompetitor={selectedCompetitor}
        />

        {/* Right column: Trend + NAP/GBP */}
        <div className="space-y-4">
          {/* Maps Score Trend */}
          <TimeSeriesLine
            title="Maps Visibility Trend"
            description="12-month maps visibility score"
            data={mockMapsVisibilityTrend}
            format="number"
            height={280}
            goalLine={{
              value: mockMapsVisibilityStats.mapsVisibilityTarget,
              label: `Target: ${mockMapsVisibilityStats.mapsVisibilityTarget}`,
              type: 'max',
            }}
          />

          {/* NAP & GBP Health */}
          <NAPGBPHealthPanel />
        </div>
      </div>

      {/* Local Rankings Table */}
      <LocalRankingsTable />
    </div>
  )
}

// Main Page Component
export default function VisibilityPage() {
  const { currentLocation, isAllLocations } = useLocation()
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')
  const [activeTab, setActiveTab] = useState('website')

  const isPro = mockUserPlan.plan === 'pro' || mockUserPlan.plan === 'enterprise'

  // Get health score for visibility
  const getMetricScore = (metricName: string) => {
    const item = mockHealthScore.breakdown.find((b) => b.metric === metricName)
    return item
      ? {
          percentage: item.score,
          score: item.weightedScore,
          maxScore: item.weight,
          trendData: item.trend,
        }
      : undefined
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visibility</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Search, AI, and maps visibility across all locations'
              : `Search, AI, and maps visibility for ${currentLocation?.name}`}
          </p>
        </div>
        <PeriodSelector
          currentPeriod={currentPeriod}
          periodType={periodType}
          onPeriodChange={setCurrentPeriod}
          onPeriodTypeChange={setPeriodType}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="website" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Website
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI
            {!isPro && <Lock className="h-3 w-3 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="maps" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Maps
          </TabsTrigger>
        </TabsList>

        {/* ==================== WEBSITE VISIBILITY TAB ==================== */}
        <TabsContent value="website" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Visibility Score"
              value={mockVisibilityStats.visibilityScore.toString()}
              change={{
                value: `+${mockVisibilityStats.visibilityChange}`,
                type: 'positive',
              }}
              icon="Target"
              healthScore={getMetricScore('Website Visibility')}
              info="Composite score based on keyword rankings, search volume, and estimated click-through rates"
            />
            <MetricCard
              title="Est. Traffic"
              value={mockVisibilityStats.estimatedTraffic.toLocaleString()}
              change={{
                value: `+${mockVisibilityStats.trafficChange}%`,
                type: 'positive',
              }}
              icon="TrendingUp"
              info="Estimated monthly organic visitors based on keyword positions and search volumes"
            />
            <MetricCard
              title="Keywords Tracked"
              value={mockVisibilityStats.keywordsTracked.toString()}
              change={{
                value: `${mockVisibilityStats.keywordsInTop10} in Top 10`,
                type: 'neutral',
              }}
              icon="Target"
              info="Total keywords monitored across search engines including branded and non-branded terms"
            />
            <MetricCard
              title="Top 3 Keywords"
              value={mockVisibilityStats.keywordsInTop3.toString()}
              change={{
                value: 'Position 1-3',
                type: 'positive',
              }}
              icon="Target"
              info="Keywords ranking in positions 1-3 receive ~60% of all organic clicks"
            />
          </div>

          {/* Visibility Trend + Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TimeSeriesLine
              title="Visibility Score Trend"
              description="12-month visibility score performance"
              data={mockVisibilityTrend}
              format="number"
              goalLine={{
                value: mockVisibilityStats.visibilityTarget,
                label: `Target: ${mockVisibilityStats.visibilityTarget}`,
                type: 'max',
              }}
              healthScore={getMetricScore('Website Visibility')}
              healthScorePosition="header"
            />

            <KeywordMovementCard />
          </div>

          {/* Keywords Table */}
          <KeywordsTable />
        </TabsContent>

        {/* ==================== AI VISIBILITY TAB ==================== */}
        <TabsContent value="ai" className="space-y-6 mt-6">
          {!isPro ? (
            <>
              <AIUpgradeBanner />
              <div className="mt-6">
                <BlurredAIPreview />
              </div>
            </>
          ) : (
            <>
              {/* AI Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="AI Visibility Score"
                  value={mockAIVisibilityStats.aiVisibilityScore.toString()}
                  change={{
                    value: `+${mockAIVisibilityStats.aiVisibilityChange}`,
                    type: 'positive',
                  }}
                  icon="Target"
                  info="Weighted score based on mention frequency, position, and platform reach across AI assistants"
                />
                <MetricCard
                  title="Brand Mentions"
                  value={mockAIVisibilityStats.brandMentions.toString()}
                  change={{
                    value: `+${mockAIVisibilityStats.mentionChange} this month`,
                    type: 'positive',
                  }}
                  icon="TrendingUp"
                  info="Number of times your brand appeared in AI-generated responses this month"
                />
                <MetricCard
                  title="Avg Position"
                  value={`#${mockAIVisibilityStats.avgPosition}`}
                  change={{
                    value: 'When mentioned',
                    type: 'neutral',
                  }}
                  icon="Target"
                  info="Average position in AI recommendation lists when your brand is mentioned"
                />
                <MetricCard
                  title="Mention Rate"
                  value={`${mockAIVisibilityStats.mentionRate}%`}
                  change={{
                    value: `${mockAIVisibilityStats.promptsWithMention}/${mockAIVisibilityStats.promptsTracked} prompts`,
                    type: 'positive',
                  }}
                  icon="Target"
                  info="Percentage of tracked prompts where your brand appears in the AI response"
                />
              </div>

              {/* AI Trend + Platform Distribution */}
              <div className="grid gap-6 lg:grid-cols-2">
                <TimeSeriesLine
                  title="AI Visibility Trend"
                  description="12-month AI visibility score"
                  data={mockAIVisibilityTrend}
                  format="number"
                  goalLine={{
                    value: mockAIVisibilityStats.aiVisibilityTarget,
                    label: `Target: ${mockAIVisibilityStats.aiVisibilityTarget}`,
                    type: 'max',
                  }}
                />

                <DonutChart
                  title="Mentions by Platform"
                  description="Brand mentions across AI platforms"
                  data={mockAIMentionsByPlatform}
                  centerValue={mockAIVisibilityStats.brandMentions.toString()}
                  centerLabel="Total Mentions"
                />
              </div>

              {/* Prompt Tracking Table */}
              <PromptTrackingTable />
            </>
          )}
        </TabsContent>

        {/* ==================== MAPS VISIBILITY TAB ==================== */}
        <TabsContent value="maps" className="space-y-6 mt-6">
          <MapsVisibilityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
