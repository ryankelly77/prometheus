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
  X,
  BarChart3,
  Table2,
} from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import { mockGuests, mockGuestTags, formatCurrency, type Guest } from '@/lib/mock-data'
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

type SortField =
  | 'name'
  | 'lastVisitDate'
  | 'visitsThisPeriod'
  | 'coversThisPeriod'
  | 'totalSpendThisPeriod'
  | 'lifetimeVisits'
  | 'lifetimeCovers'
  | 'lifetimeTotalSpend'

type SortDirection = 'asc' | 'desc'

type VisitFilter = 'all' | 'first-timers' | '2-9' | '10+'

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

// Tag color mapping
function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    'VIP': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    'Regular': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Birthday': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    'Anniversary': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Wine Club': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Allergies': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Gluten-Free': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Vegetarian': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Corporate': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
    'Celebration': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
    'First-Timer': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    'Influencer': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    'Local': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    'Tourist': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
    'Brunch Regular': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  }
  return colors[tag] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
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

export default function CustomersDataPage() {
  const router = useRouter()
  const { currentLocation, isAllLocations } = useLocation()
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')

  const handleTabChange = (value: string) => {
    if (value === 'charts') {
      router.push('/dashboard/customers')
    }
  }

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [visitFilter, setVisitFilter] = useState<VisitFilter>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('lastVisitDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Filtering and sorting
  const filteredGuests = useMemo(() => {
    let result = [...mockGuests]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(guest =>
        guest.name.toLowerCase().includes(query) ||
        guest.email.toLowerCase().includes(query)
      )
    }

    // Visit frequency filter
    if (visitFilter !== 'all') {
      result = result.filter(guest => {
        switch (visitFilter) {
          case 'first-timers':
            return guest.lifetimeVisits === 1
          case '2-9':
            return guest.lifetimeVisits >= 2 && guest.lifetimeVisits <= 9
          case '10+':
            return guest.lifetimeVisits >= 10
          default:
            return true
        }
      })
    }

    // Tag filter
    if (tagFilter !== 'all') {
      result = result.filter(guest => guest.tags.includes(tagFilter))
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'lastVisitDate':
          aVal = a.lastVisitDate
          bVal = b.lastVisitDate
          break
        case 'visitsThisPeriod':
          aVal = a.visitsThisPeriod
          bVal = b.visitsThisPeriod
          break
        case 'coversThisPeriod':
          aVal = a.coversThisPeriod
          bVal = b.coversThisPeriod
          break
        case 'totalSpendThisPeriod':
          aVal = a.totalSpendThisPeriod
          bVal = b.totalSpendThisPeriod
          break
        case 'lifetimeVisits':
          aVal = a.lifetimeVisits
          bVal = b.lifetimeVisits
          break
        case 'lifetimeCovers':
          aVal = a.lifetimeCovers
          bVal = b.lifetimeCovers
          break
        case 'lifetimeTotalSpend':
          aVal = a.lifetimeTotalSpend
          bVal = b.lifetimeTotalSpend
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [searchQuery, visitFilter, tagFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredGuests.length / pageSize)
  const paginatedGuests = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredGuests.slice(start, start + pageSize)
  }, [filteredGuests, currentPage, pageSize])

  // Reset page when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
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
    setVisitFilter('all')
    setTagFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery || visitFilter !== 'all' || tagFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Page Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Guest data from OpenTable across all locations'
              : `Guest data from OpenTable for ${currentLocation?.name}`}
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
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Visit Frequency Filter */}
        <Select
          value={visitFilter}
          onValueChange={(v) => handleFilterChange(setVisitFilter as (value: string) => void)(v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Visit frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Guests</SelectItem>
            <SelectItem value="first-timers">First-Timers (1)</SelectItem>
            <SelectItem value="2-9">Regulars (2-9)</SelectItem>
            <SelectItem value="10+">VIPs (10+)</SelectItem>
          </SelectContent>
        </Select>

        {/* Tag Filter */}
        <Select
          value={tagFilter}
          onValueChange={(v) => handleFilterChange(setTagFilter)(v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {mockGuestTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 gap-1"
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filteredGuests.length} of {mockGuests.length} guests</span>
          <span>Last synced: Jan 25, 2025 6:00 AM</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  field="name"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  Guest
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  field="lastVisitDate"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  Last Visit
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  field="visitsThisPeriod"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  Visits
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  field="coversThisPeriod"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  Covers
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  field="totalSpendThisPeriod"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  Spend
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  field="lifetimeVisits"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  LT Visits
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  field="lifetimeCovers"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  LT Covers
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  field="lifetimeTotalSpend"
                  currentSort={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  LT Spend
                </SortableHeader>
              </TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No guests found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedGuests.map((guest) => (
                <TableRow key={guest.id} className="group">
                  <TableCell>
                    <div>
                      <div className="font-medium">{guest.name}</div>
                      <div className="text-xs text-muted-foreground">{guest.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{formatDate(guest.lastVisitDate)}</div>
                      <div className="text-xs text-muted-foreground">{guest.lastVisitTime}</div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {guest.visitsThisPeriod || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {guest.coversThisPeriod || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {guest.totalSpendThisPeriod > 0
                      ? formatCurrency(guest.totalSpendThisPeriod)
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {guest.lifetimeVisits}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {guest.lifetimeCovers}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatCurrency(guest.lifetimeTotalSpend)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {guest.tags.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        guest.tags.slice(0, 3).map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className={`text-xs ${getTagColor(tag)}`}
                          >
                            {tag}
                          </Badge>
                        ))
                      )}
                      {guest.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{guest.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
