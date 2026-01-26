import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface SectionHeaderProps {
  title: string
  description?: string
  badge?: string
  className?: string
}

export function SectionHeader({ title, description, badge, className }: SectionHeaderProps) {
  return (
    <div className={cn('relative py-4', className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <div className="bg-background px-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {title}
            </h2>
            {badge && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {badge}
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground/70">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
