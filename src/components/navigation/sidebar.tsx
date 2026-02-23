'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  LayoutGrid,
  Target,
  Brain,
  DollarSign,
  Receipt,
  Users,
  Star,
  Search,
  Share2,
  Newspaper,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { LocationSwitcher } from './location-switcher'
import { useLocation } from '@/hooks/use-location'
import { useOrganization } from '@/contexts'

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  LayoutGrid,
  Target,
  Brain,
  DollarSign,
  Receipt,
  Users,
  Star,
  Search,
  Share2,
  Newspaper,
  Settings,
  HelpCircle,
}

type NavLinkItem = {
  type?: never
  name: string
  href: string
  icon: string
  singleLocationOnly?: boolean
}

type NavSeparatorItem = {
  type: 'separator'
  label: string
}

type NavItem = NavLinkItem | NavSeparatorItem

function isNavLink(item: NavItem): item is NavLinkItem {
  return !('type' in item) || item.type !== 'separator'
}

const navigation: NavItem[] = [
  { name: 'Overview', href: '/dashboard/overview', icon: 'LayoutGrid' },
  { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', singleLocationOnly: true },
  { name: 'Health Score', href: '/dashboard/health-score', icon: 'Target' },
  { name: 'Intelligence', href: '/dashboard/intelligence', icon: 'Brain' },
  { type: 'separator', label: 'Operations' },
  { name: 'Sales', href: '/dashboard/sales', icon: 'DollarSign' },
  { name: 'Costs', href: '/dashboard/costs', icon: 'Receipt' },
  { name: 'Customers', href: '/dashboard/customers', icon: 'Users' },
  { type: 'separator', label: 'Marketing' },
  { name: 'Reviews', href: '/dashboard/reviews', icon: 'Star' },
  { name: 'Visibility', href: '/dashboard/visibility', icon: 'Search' },
  { name: 'Social', href: '/dashboard/social', icon: 'Share2' },
  { name: 'PR', href: '/dashboard/pr', icon: 'Newspaper' },
]

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
  { name: 'Help', href: '/dashboard/help', icon: 'HelpCircle' },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { locations } = useLocation()
  const { organization } = useOrganization()

  // Filter navigation based on whether this is a multi-location account
  const isMultiLocation = locations.length > 1
  const filteredNavigation = navigation.filter((item) => {
    if (isNavLink(item) && item.singleLocationOnly && isMultiLocation) {
      return false
    }
    return true
  })

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-full flex-col border-r bg-sidebar transition-all duration-200',
          collapsed ? 'w-[72px]' : 'w-64',
          className
        )}
      >
        {/* Logo & Collapse Button */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              {organization?.logoUrl ? (
                <Image
                  src={organization.logoUrl}
                  alt={organization.name}
                  width={160}
                  height={40}
                  className="h-10 w-auto max-w-[160px] object-contain"
                />
              ) : organization ? (
                <span
                  className="text-lg font-semibold"
                  style={{ color: 'hsl(var(--brand-primary, var(--primary)))' }}
                >
                  {organization.name}
                </span>
              ) : (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <span className="text-sm font-bold text-primary-foreground">P</span>
                  </div>
                  <span className="font-semibold">Prometheus</span>
                </>
              )}
            </Link>
          )}
          {collapsed && organization?.logoIconUrl && (
            <Link href="/dashboard" className="mx-auto">
              <Image
                src={organization.logoIconUrl}
                alt={organization.name}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn('h-8 w-8', collapsed && !organization?.logoIconUrl && 'mx-auto')}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Location Switcher */}
        <div className="border-b p-3">
          <LocationSwitcher collapsed={collapsed} />
        </div>

        {/* Main Navigation */}
        <ScrollArea className="flex-1">
          <nav className="space-y-1 p-3">
            {filteredNavigation.map((item, index) => {
              if (!isNavLink(item)) {
                return (
                  <div key={`sep-${index}`} className="py-2">
                    {!collapsed && (
                      <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </p>
                    )}
                    {collapsed && <div className="mx-3 h-px bg-border" />}
                  </div>
                )
              }

              const Icon = iconMap[item.icon]
              // Dashboard should only match exactly, other routes match children too
              const isActive = item.href === '/dashboard'
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/')

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return <div key={item.name}>{linkContent}</div>
            })}
          </nav>
        </ScrollArea>

        {/* Powered by Prometheus */}
        {!collapsed && (
          <div className="border-t px-3 py-2">
            <a
              href="https://prometheus.restaurant"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded bg-primary/10">
                <span className="text-[10px] font-bold text-primary">P</span>
              </div>
              <span>Powered by Prometheus</span>
            </a>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="border-t p-3">
          {bottomNavigation.map((item) => {
            const Icon = iconMap[item.icon]
            const isActive = pathname === item.href

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.name}>{linkContent}</div>
          })}
        </div>
      </aside>
    </TooltipProvider>
  )
}
