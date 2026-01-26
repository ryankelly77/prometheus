'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Target,
  DollarSign,
  Star,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Health', href: '/dashboard/health-score', icon: Target },
  { name: 'Sales', href: '/dashboard/sales', icon: DollarSign },
  { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { name: 'More', href: '/dashboard/more', icon: MoreHorizontal },
]

interface MobileNavProps {
  className?: string
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t bg-background safe-area-inset-bottom',
        className
      )}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = tab.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive && 'fill-primary/20'
                )}
              />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
