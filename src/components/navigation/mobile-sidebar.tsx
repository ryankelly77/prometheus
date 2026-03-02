'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LocationSwitcher } from './location-switcher'

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

export function MobileSidebar() {
  const pathname = usePathname()

  const renderNavItem = (item: NavLinkItem) => {
    const Icon = iconMap[item.icon]
    // Match exact path or child paths
    const isActive = pathname === item.href ||
      (pathname.startsWith(item.href + '/') &&
       // Don't match parent if we're on a more specific child route that has its own nav item
       !bottomNavigation.some(nav => nav.href !== item.href && pathname.startsWith(nav.href)))

    // Disabled state (only Simulator)
    if (item.disabled) {
      return (
        <div
          key={item.name}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium cursor-not-allowed',
            'text-muted-foreground/50'
          )}
        >
          {Icon && <Icon className="h-5 w-5 flex-shrink-0 opacity-50" />}
          <div className="flex items-center justify-between flex-1">
            <span>{item.name}</span>
            <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              Soon
            </span>
          </div>
        </div>
      )
    }

    // Active/enabled state
    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
        <span>{item.name}</span>
      </Link>
    )
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard/overview" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">P</span>
          </div>
          <span className="font-semibold">Prometheus</span>
        </Link>
      </div>

      {/* Location Switcher */}
      <div className="border-b p-3">
        <LocationSwitcher />
      </div>

      {/* Main Navigation */}
      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-3">
          {navigation.map((item, index) => {
            if (!isNavLink(item)) {
              return (
                <div key={`sep-${index}`} className="py-2">
                  <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              )
            }

            return renderNavItem(item)
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation - Settings Section */}
      <div className="border-t p-3">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Settings
        </p>
        {bottomNavigation.map((item) => renderNavItem(item))}
      </div>
    </div>
  )
}
