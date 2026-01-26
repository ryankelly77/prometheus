'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Table2,
} from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import {
  mockReviews,
  mockReviewSources,
  type Review,
  type ReviewSource,
  type ReviewStatus,
} from '@/lib/mock-data'
import { PeriodSelector } from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type SortField = 'datePosted' | 'rating' | 'source' | 'reviewerName'
type SortDirection = 'asc' | 'desc'
type RatingFilter = 'all' | '5' | '4' | 'negative'

// Format date for display
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Star rating display
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
          size={14}
        />
      ))}
    </div>
  )
}

// Source badge with color
function SourceBadge({ source }: { source: ReviewSource }) {
  const colors: Record<ReviewSource, string> = {
    'Google': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Yelp': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Facebook': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    'TripAdvisor': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    'OpenTable': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  }

  return (
    <Badge variant="secondary" className={`text-xs ${colors[source]}`}>
      {source}
    </Badge>
  )
}

// Status badge
function StatusBadge({ status }: { status: ReviewStatus }) {
  const colors: Record<ReviewStatus, string> = {
    'Active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Flagged': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <Badge variant="secondary" className={`text-xs ${colors[status]}`}>
      {status}
    </Badge>
  )
}

// Sort header component
function SortableHeader({
  children,
  field,
  currentSort,
  currentDirection,
  onSort,
}: {
  children: React.ReactNode
  field: SortField
  currentSort: SortField
  currentDirection: SortDirection
  onSort: (field: SortField) => void
}) {
  const isActive = currentSort === field

  return (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      {children}
      {isActive ? (
        currentDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  )
}

export default function ReviewsDataPage() {
  const router = useRouter()
  const { currentLocation, isAllLocations } = useLocation()
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')

  const handleTabChange = (value: string) => {
    if (value === 'charts') {
      router.push('/dashboard/reviews')
    }
  }

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('datePosted')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Toggle row expansion
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // Filtering and sorting
  const filteredReviews = useMemo(() => {
    let result = [...mockReviews]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(review =>
        review.reviewerName.toLowerCase().includes(query) ||
        review.reviewText.toLowerCase().includes(query)
      )
    }

    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter(review => review.source === sourceFilter)
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      result = result.filter(review => {
        switch (ratingFilter) {
          case '5':
            return review.rating === 5
          case '4':
            return review.rating === 4
          case 'negative':
            return review.rating <= 3
          default:
            return true
        }
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(review => review.status === statusFilter)
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortField) {
        case 'datePosted':
          aVal = a.datePosted
          bVal = b.datePosted
          break
        case 'rating':
          aVal = a.rating
          bVal = b.rating
          break
        case 'source':
          aVal = a.source
          bVal = b.source
          break
        case 'reviewerName':
          aVal = a.reviewerName.toLowerCase()
          bVal = b.reviewerName.toLowerCase()
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [searchQuery, sourceFilter, ratingFilter, statusFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / pageSize)
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredReviews.slice(start, start + pageSize)
  }, [filteredReviews, currentPage, pageSize])

  // Reset page when filters change
  const handleFilterChange = <T extends string>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setCurrentPage(1)
  }

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setSourceFilter('all')
    setRatingFilter('all')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery || sourceFilter !== 'all' || ratingFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Page Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Individual reviews from BrightLocal across all locations'
              : `Individual reviews from BrightLocal for ${currentLocation?.name}`}
          </p>
        </div>
        <PeriodSelector
          currentPeriod={currentPeriod}
          periodType={periodType}
          onPeriodChange={setCurrentPeriod}
          onPeriodTypeChange={setPeriodType}
        />
      </div>

      {/* View Tabs */}
      <Tabs value="data" onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Source Filter */}
        <Select
          value={sourceFilter}
          onValueChange={handleFilterChange(setSourceFilter)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {mockReviewSources.map(source => (
              <SelectItem key={source} value={source}>{source}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Rating Filter */}
        <Select
          value={ratingFilter}
          onValueChange={handleFilterChange(setRatingFilter as (v: string) => void)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Star</SelectItem>
            <SelectItem value="4">4 Star</SelectItem>
            <SelectItem value="negative">Negative (1-3)</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={handleFilterChange(setStatusFilter)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9"
          >
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filteredReviews.length} of {mockReviews.length} reviews</span>
          <span>Last synced: Jan 24, 2025 12:00 PM</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[120px]">
                <SortableHeader
                  field="datePosted"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  Date
                </SortableHeader>
              </TableHead>
              <TableHead className="w-[120px]">
                <SortableHeader
                  field="source"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  Source
                </SortableHeader>
              </TableHead>
              <TableHead className="w-[100px]">
                <SortableHeader
                  field="rating"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  Rating
                </SortableHeader>
              </TableHead>
              <TableHead className="w-[140px]">
                <SortableHeader
                  field="reviewerName"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  Reviewer
                </SortableHeader>
              </TableHead>
              <TableHead>Review</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No reviews found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedReviews.map((review) => {
                const isExpanded = expandedRows.has(review.id)
                const truncatedText = review.reviewText.length > 80
                  ? review.reviewText.substring(0, 80) + '...'
                  : review.reviewText

                return (
                  <TableRow
                    key={review.id}
                    className="group cursor-pointer"
                    onClick={() => toggleRow(review.id)}
                  >
                    <TableCell className="text-muted-foreground">
                      {review.reviewText.length > 80 && (
                        isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(review.datePosted)}
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={review.source} />
                    </TableCell>
                    <TableCell>
                      <StarRating rating={review.rating} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {review.reviewerName}
                    </TableCell>
                    <TableCell>
                      <p className={`text-sm ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {isExpanded ? review.reviewText : truncatedText}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={review.status} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => {
              setPageSize(Number(v))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
              <span className="sr-only">First page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronsRight className="h-4 w-4" />
              <span className="sr-only">Last page</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
