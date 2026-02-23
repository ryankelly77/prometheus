'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LocationSwitcher } from './location-switcher'

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
  { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
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

export function MobileSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
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

            const Icon = iconMap[item.icon]
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="border-t p-3">
        {bottomNavigation.map((item) => {
          const Icon = iconMap[item.icon]
          const isActive = pathname === item.href

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
