'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Lightbulb,
  FileText,
  Target,
  Sparkles,
  LayoutGrid,
  DollarSign,
  Package,
  Users,
  FileBarChart,
  Star,
  Search,
  Share2,
  Megaphone,
  Settings,
  Brain,
  Plug,
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
  Lightbulb,
  FileText,
  Target,
  Sparkles,
  LayoutGrid,
  DollarSign,
  Package,
  Users,
  FileBarChart,
  Star,
  Search,
  Share2,
  Megaphone,
  Settings,
  Brain,
  Plug,
}

type NavLinkItem = {
  type?: never
  name: string
  href: string
  icon: string
  disabled?: boolean
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
  { type: 'separator', label: 'Intelligence' },
  { name: 'Insights', href: '/dashboard/insights', icon: 'Lightbulb' },
  { name: 'Analysis', href: '/dashboard/intelligence', icon: 'FileText' },
  { name: 'Health Score', href: '/dashboard/health-score', icon: 'Target' },
  { name: 'Simulator', href: '/dashboard/simulator', icon: 'Sparkles', disabled: true },
  { type: 'separator', label: 'Operations' },
  { name: 'Overview', href: '/dashboard/overview', icon: 'LayoutGrid' },
  { name: 'Sales', href: '/dashboard/sales', icon: 'DollarSign' },
  { name: 'Costs', href: '/dashboard/costs', icon: 'Package' },
  { name: 'Customers', href: '/dashboard/customers', icon: 'Users' },
  { name: 'Reports', href: '/dashboard/reports', icon: 'FileBarChart' },
  { type: 'separator', label: 'Marketing' },
  { name: 'Reviews', href: '/dashboard/reviews', icon: 'Star' },
  { name: 'Visibility', href: '/dashboard/visibility', icon: 'Search' },
  { name: 'Social', href: '/dashboard/social', icon: 'Share2' },
  { name: 'PR', href: '/dashboard/pr', icon: 'Megaphone' },
]

const bottomNavigation: NavLinkItem[] = [
  { name: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
  { name: 'Intelligence Profile', href: '/dashboard/settings/intelligence', icon: 'Brain' },
  { name: 'Data Sources', href: '/dashboard/settings', icon: 'Plug' },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { organization } = useOrganization()

  const renderNavItem = (item: NavLinkItem) => {
    const Icon = iconMap[item.icon]
    // Match exact path or child paths
    const isActive = pathname === item.href ||
      (pathname.startsWith(item.href + '/') &&
       // Don't match parent if we're on a more specific child route that has its own nav item
       !bottomNavigation.some(nav => nav.href !== item.href && pathname.startsWith(nav.href)))

    // Disabled state (only Simulator)
    if (item.disabled) {
      const disabledContent = (
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium cursor-not-allowed',
            'text-muted-foreground/50',
            collapsed && 'justify-center px-2'
          )}
        >
          {Icon && <Icon className="h-5 w-5 flex-shrink-0 opacity-50" />}
          {!collapsed && (
            <div className="flex items-center justify-between flex-1">
              <span>{item.name}</span>
              <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                Soon
              </span>
            </div>
          )}
        </div>
      )

      if (collapsed) {
        return (
          <Tooltip key={item.name}>
            <TooltipTrigger asChild>{disabledContent}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.name} — Coming Soon
            </TooltipContent>
          </Tooltip>
        )
      }

      return <div key={item.name}>{disabledContent}</div>
    }

    // Active/enabled state
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
  }

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
            <Link href="/dashboard/overview" className="flex items-center gap-2">
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
            <Link href="/dashboard/overview" className="mx-auto">
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
            {navigation.map((item, index) => {
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

              return renderNavItem(item)
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

        {/* Bottom Navigation - Settings Section */}
        <div className="border-t p-3">
          {!collapsed && (
            <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Settings
            </p>
          )}
          {bottomNavigation.map((item) => renderNavItem(item))}
        </div>
      </aside>
    </TooltipProvider>
  )
}
