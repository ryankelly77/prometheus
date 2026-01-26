'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Star,
  Tv,
  Newspaper,
  Globe,
  Mic,
  Radio,
  Share2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Upload,
  Download,
  Calendar,
  ExternalLink,
  Trophy,
  Award,
  Crown,
  Medal,
  FileText,
  XCircle,
  Filter,
  Play,
  Image as ImageIcon,
} from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import {
  mockPRStats,
  mockMentionsOverTime,
  mockReachByType,
  mockAVETrend,
  mockMediaMentions,
  mockAwards,
  mediaTypeConfig,
  awardStatusConfig,
  csvTemplateColumns,
  topicOptions,
  type MediaMention,
  type Award as AwardType,
  type MediaType,
  type AwardStatus,
} from '@/lib/pr-mock-data'
import { mockHealthScore } from '@/lib/mock-data'
import { TimeSeriesLine, SimpleBarChart, DonutChart } from '@/components/charts'
import { MetricCard, PeriodSelector, SectionHeader } from '@/components/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Format large numbers (UVM)
function formatUVM(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toString()
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Media type icon component
function MediaTypeIcon({ type, size = 16 }: { type: MediaType; size?: number }) {
  const icons: Record<MediaType, React.ReactNode> = {
    TV: <Tv size={size} />,
    PRINT: <Newspaper size={size} />,
    ONLINE: <Globe size={size} />,
    PODCAST: <Mic size={size} />,
    RADIO: <Radio size={size} />,
    SOCIAL: <Share2 size={size} />,
  }
  return icons[type] || <Globe size={size} />
}

// Award status icon component
function AwardStatusIcon({ status, size = 16 }: { status: AwardStatus; size?: number }) {
  const icons: Record<AwardStatus, React.ReactNode> = {
    APPLIED: <FileText size={size} />,
    NOMINATED: <Award size={size} />,
    SEMIFINALIST: <Medal size={size} />,
    FINALIST: <Trophy size={size} />,
    WON: <Crown size={size} />,
    NOT_SELECTED: <XCircle size={size} />,
  }
  return icons[status] || <Award size={size} />
}

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

// Media Mentions Table Component
function MediaMentionsTable({ onSelectMention }: { onSelectMention: (mention: MediaMention) => void }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [highlightFilter, setHighlightFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'publishedAt',
    direction: 'desc',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const filteredMentions = useMemo(() => {
    let filtered = [...mockMediaMentions]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.headline.toLowerCase().includes(searchLower) ||
          m.outlet.toLowerCase().includes(searchLower) ||
          m.journalistName?.toLowerCase().includes(searchLower)
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((m) => m.outletType === typeFilter)
    }

    // Highlight filter
    if (highlightFilter === 'highlighted') {
      filtered = filtered.filter((m) => m.isHighlight)
    } else if (highlightFilter === 'not-highlighted') {
      filtered = filtered.filter((m) => !m.isHighlight)
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter((m) => m.publishedAt >= dateRange.start)
    }
    if (dateRange.end) {
      filtered = filtered.filter((m) => m.publishedAt <= dateRange.end)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sort.key as keyof MediaMention]
      let bVal = b[sort.key as keyof MediaMention]

      // Handle nulls
      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })

    return filtered
  }, [search, typeFilter, highlightFilter, dateRange, sort])

  const totalPages = Math.ceil(filteredMentions.length / pageSize)
  const paginatedMentions = filteredMentions.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
            <CardTitle>Media Mentions</CardTitle>
            <CardDescription>{filteredMentions.length} mentions tracked</CardDescription>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
              <Download className="h-4 w-4" />
              Template
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Mention
            </button>
          </div>
        </div>
        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search headlines, outlets..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Types</option>
            <option value="TV">TV</option>
            <option value="PRINT">Print</option>
            <option value="ONLINE">Online</option>
            <option value="PODCAST">Podcast</option>
            <option value="RADIO">Radio</option>
            <option value="SOCIAL">Social</option>
          </select>
          <select
            value={highlightFilter}
            onChange={(e) => {
              setHighlightFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Mentions</option>
            <option value="highlighted">Highlighted Only</option>
            <option value="not-highlighted">Not Highlighted</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
                setCurrentPage(1)
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
                setCurrentPage(1)
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 pr-2 font-medium w-8"></th>
                <th className="pb-3 px-2 font-medium w-20">Media</th>
                <th className="pb-3 px-2 font-medium">
                  <SortableHeader label="Date" sortKey="publishedAt" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="pb-3 px-2 font-medium">Type</th>
                <th className="pb-3 px-2 font-medium">
                  <SortableHeader label="Outlet" sortKey="outlet" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="pb-3 px-2 font-medium">Headline</th>
                <th className="pb-3 px-2 font-medium">
                  <SortableHeader label="UVM" sortKey="uvm" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="pb-3 px-2 font-medium">
                  <SortableHeader label="AVE" sortKey="ave" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="pb-3 pl-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedMentions.map((mention) => (
                <tr
                  key={mention.id}
                  className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelectMention(mention)}
                >
                  <td className="py-3 pr-2">
                    {mention.isHighlight && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                  </td>
                  <td className="py-3 px-2">
                    {mention.imageUrl ? (
                      <div className="relative w-16 h-10 rounded overflow-hidden bg-muted">
                        <img
                          src={mention.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {(mention.outletType === 'TV' || mention.link?.includes('youtube')) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="h-4 w-4 text-white fill-white" />
                          </div>
                        )}
                      </div>
                    ) : mention.link ? (
                      <div className="w-16 h-10 rounded bg-muted flex items-center justify-center">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="w-16 h-10 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-sm text-muted-foreground tabular-nums">
                    {new Date(mention.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-2">
                    <Badge
                      style={{
                        backgroundColor: mediaTypeConfig[mention.outletType].bgColor,
                        color: mediaTypeConfig[mention.outletType].color,
                      }}
                      className="gap-1"
                    >
                      <MediaTypeIcon type={mention.outletType} size={12} />
                      {mediaTypeConfig[mention.outletType].name}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 font-medium">{mention.outlet}</td>
                  <td className="py-3 px-2 max-w-[250px]">
                    <span className="line-clamp-1">{mention.headline}</span>
                  </td>
                  <td className="py-3 px-2 tabular-nums text-muted-foreground">
                    {mention.uvm ? formatUVM(mention.uvm) : '—'}
                  </td>
                  <td className="py-3 px-2 tabular-nums font-medium">
                    {mention.ave ? formatCurrency(mention.ave) : '—'}
                  </td>
                  <td className="py-3 pl-2">
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
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredMentions.length)}{' '}
              of {filteredMentions.length} mentions
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

// Mention Detail Drawer
function MentionDetailDrawer({
  mention,
  onClose,
}: {
  mention: MediaMention | null
  onClose: () => void
}) {
  if (!mention) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-background shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2">
                {mention.isHighlight && <Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
                <Badge
                  style={{
                    backgroundColor: mediaTypeConfig[mention.outletType].bgColor,
                    color: mediaTypeConfig[mention.outletType].color,
                  }}
                  className="gap-1"
                >
                  <MediaTypeIcon type={mention.outletType} size={12} />
                  {mediaTypeConfig[mention.outletType].name}
                </Badge>
              </div>
              <h2 className="text-lg font-semibold">{mention.headline}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mention.outlet} •{' '}
                {new Date(mention.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image/Video Preview */}
          {mention.imageUrl && (
            <div className="mb-6">
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img
                  src={mention.imageUrl.replace('w=120&h=80', 'w=480&h=270')}
                  alt={mention.headline}
                  className="w-full h-auto object-cover"
                />
                {(mention.outletType === 'TV' || mention.link?.includes('youtube')) && (
                  <a
                    href={mention.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
                      <Play className="h-6 w-6 text-primary fill-primary ml-1" />
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">UVM</p>
              <p className="text-2xl font-bold mt-1">{mention.uvm ? formatUVM(mention.uvm) : '—'}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">AVE</p>
              <p className="text-2xl font-bold mt-1">{mention.ave ? formatCurrency(mention.ave) : '—'}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Engagement</p>
              <p className="text-2xl font-bold mt-1">
                {mention.totalEngagement ? mention.totalEngagement.toLocaleString() : '—'}
              </p>
            </div>
          </div>

          {/* Description */}
          {mention.description && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{mention.description}</p>
            </div>
          )}

          {/* Link */}
          {mention.link && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Link</h3>
              <a
                href={mention.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Article
              </a>
            </div>
          )}

          {/* Journalist Info */}
          {(mention.journalistName || mention.journalistEmail) && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Journalist</h3>
              <div className="rounded-lg border p-3">
                {mention.journalistName && <p className="text-sm font-medium">{mention.journalistName}</p>}
                {mention.journalistEmail && (
                  <a href={`mailto:${mention.journalistEmail}`} className="text-sm text-primary hover:underline">
                    {mention.journalistEmail}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Topics */}
          {mention.topics.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {mention.topics.map((topic) => (
                  <Badge key={topic} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {mention.internalNotes && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Internal Notes</h3>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm">{mention.internalNotes}</p>
              </div>
            </div>
          )}

          {/* Import Source */}
          <div className="text-sm text-muted-foreground">
            Source: {mention.importSource === 'CSV_IMPORT' ? 'CSV Import' : 'Manual Entry'}
          </div>
        </div>
      </div>
    </div>
  )
}

// Awards Section Component
function AwardsSection() {
  // Group awards by year
  const awardsByYear = useMemo(() => {
    const grouped = mockAwards.reduce(
      (acc, award) => {
        if (!acc[award.year]) {
          acc[award.year] = []
        }
        acc[award.year].push(award)
        return acc
      },
      {} as Record<number, AwardType[]>
    )

    // Sort years descending
    return Object.entries(grouped)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, awards]) => ({
        year: Number(year),
        awards: awards.sort((a, b) => {
          // Sort by status priority
          const statusOrder: AwardStatus[] = ['WON', 'FINALIST', 'SEMIFINALIST', 'NOMINATED', 'APPLIED', 'NOT_SELECTED']
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
        }),
      }))
  }, [])

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Awards & Accolades</CardTitle>
            <CardDescription>{mockAwards.length} awards tracked</CardDescription>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Award
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {awardsByYear.map(({ year, awards }) => (
            <div key={year}>
              <h3 className="text-lg font-semibold mb-4">{year}</h3>
              <div className="space-y-3">
                {awards.map((award) => (
                  <div
                    key={award.id}
                    className={cn(
                      'flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50',
                      award.isFeatured && 'border-primary/30 bg-primary/5'
                    )}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: awardStatusConfig[award.status].bgColor }}
                    >
                      <span style={{ color: awardStatusConfig[award.status].color }}>
                        <AwardStatusIcon status={award.status} size={20} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium">{award.name}</h4>
                          <p className="text-sm text-muted-foreground">{award.organization}</p>
                        </div>
                        <Badge
                          style={{
                            backgroundColor: awardStatusConfig[award.status].bgColor,
                            color: awardStatusConfig[award.status].color,
                          }}
                        >
                          {awardStatusConfig[award.status].name}
                        </Badge>
                      </div>
                      {award.category && <p className="text-sm text-muted-foreground mt-1">{award.category}</p>}
                      {award.recipientName && (
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">Recipient:</span> {award.recipientName}
                        </p>
                      )}
                      {award.description && <p className="text-sm text-muted-foreground mt-2">{award.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Page Component
export default function PRPage() {
  const { currentLocation, isAllLocations } = useLocation()
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')
  const [selectedMention, setSelectedMention] = useState<MediaMention | null>(null)

  // Get health score for PR
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
          <h1 className="text-3xl font-bold tracking-tight">PR & Marketing</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Media coverage and awards across all locations'
              : `Media coverage and awards for ${currentLocation?.name}`}
          </p>
        </div>
        <PeriodSelector
          currentPeriod={currentPeriod}
          periodType={periodType}
          onPeriodChange={setCurrentPeriod}
          onPeriodTypeChange={setPeriodType}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Media Mentions"
          value={mockPRStats.totalMentions.toString()}
          change={{
            value: `+${mockPRStats.mentionsChange} this month`,
            type: 'positive',
          }}
          icon="Newspaper"
          healthScore={getMetricScore('PR Mentions')}
        />
        <MetricCard
          title="Total Reach"
          value={formatUVM(mockPRStats.totalReach)}
          change={{
            value: `+${mockPRStats.reachChange}%`,
            type: 'positive',
          }}
          icon="Users"
          info="Combined unique monthly visitors across all outlet coverage"
        />
        <MetricCard
          title="Total AVE"
          value={formatCurrency(mockPRStats.totalAVE)}
          change={{
            value: `+${mockPRStats.aveChange}%`,
            type: 'positive',
          }}
          icon="DollarSign"
          info="Advertising Value Equivalent — estimated cost of equivalent paid media"
        />
        <MetricCard
          title="Total Engagement"
          value={mockPRStats.totalEngagement.toLocaleString()}
          change={{
            value: `+${mockPRStats.engagementChange}%`,
            type: 'positive',
          }}
          icon="TrendingUp"
          info="Social shares, comments, and interactions on coverage"
        />
      </div>

      {/* Charts Section */}
      <SectionHeader title="Coverage Analytics" description="Media mentions and reach over time" />

      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleBarChart
          title="Mentions Over Time"
          description="Monthly media coverage (12 months)"
          data={mockMentionsOverTime}
          color="#7C3AED"
          goalLine={{ value: 12, label: 'Target' }}
          trendLine={{ show: true, color: '#F97316' }}
          healthScore={getMetricScore('PR Mentions')}
          healthScorePosition="header"
        />

        <DonutChart
          title="Reach by Media Type"
          description="Total UVM by coverage type"
          data={mockReachByType}
          centerValue={formatUVM(mockPRStats.totalReach)}
          centerLabel="Total Reach"
        />
      </div>

      <div className="grid gap-6">
        <TimeSeriesLine
          title="AVE Trend"
          description="Advertising Value Equivalent over 12 months"
          data={mockAVETrend}
          format="currency"
          color="#10B981"
          healthScorePosition="header"
        />
      </div>

      {/* Media Mentions Table */}
      <SectionHeader title="Media Mentions" description="Individual press coverage and media appearances" />

      <MediaMentionsTable onSelectMention={setSelectedMention} />

      {/* Awards Section */}
      <SectionHeader title="Awards & Recognition" description="Nominations, accolades, and achievements" />

      <AwardsSection />

      {/* Mention Detail Drawer */}
      <MentionDetailDrawer mention={selectedMention} onClose={() => setSelectedMention(null)} />
    </div>
  )
}
