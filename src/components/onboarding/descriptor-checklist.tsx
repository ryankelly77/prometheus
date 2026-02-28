'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Descriptor {
  id: string
  label: string
  context: string
}

interface DescriptorCategory {
  id: string
  label: string
  descriptors: Descriptor[]
}

interface DescriptorChecklistProps {
  restaurantType: string
  selectedDescriptors: string[]
  onDescriptorsChange: (descriptors: string[]) => void
  conceptDescription: string
  onConceptDescriptionChange: (description: string) => void
  className?: string
}

export function DescriptorChecklist({
  restaurantType,
  selectedDescriptors,
  onDescriptorsChange,
  conceptDescription,
  onConceptDescriptionChange,
  className,
}: DescriptorChecklistProps) {
  const [categories, setCategories] = useState<DescriptorCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [totalDescriptors, setTotalDescriptors] = useState(0)

  // Fetch descriptors when restaurant type changes
  useEffect(() => {
    async function fetchDescriptors() {
      if (!restaurantType) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/restaurant/descriptors?type=${restaurantType}`)
        const data = await response.json()

        if (data.categories) {
          setCategories(data.categories)
          // Expand all categories by default
          setExpandedCategories(new Set(data.categories.map((c: DescriptorCategory) => c.id)))
          // Calculate total descriptors
          const total = data.categories.reduce(
            (sum: number, cat: DescriptorCategory) => sum + cat.descriptors.length,
            0
          )
          setTotalDescriptors(total)
        }
      } catch (error) {
        console.error('Failed to fetch descriptors:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDescriptors()
  }, [restaurantType])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const toggleDescriptor = (descriptorId: string) => {
    if (selectedDescriptors.includes(descriptorId)) {
      onDescriptorsChange(selectedDescriptors.filter((id) => id !== descriptorId))
    } else {
      onDescriptorsChange([...selectedDescriptors, descriptorId])
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading descriptors...</span>
      </div>
    )
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Concept description input */}
      <div className="space-y-2">
        <Label htmlFor="concept-description" className="text-sm font-medium">
          How would you describe your concept in a few words? (optional)
        </Label>
        <Input
          id="concept-description"
          value={conceptDescription}
          onChange={(e) => onConceptDescriptionChange(e.target.value)}
          placeholder="e.g., French brasserie with active wine program"
          className="max-w-xl"
        />
      </div>

      {/* Descriptor categories */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Select what applies to your restaurant (optional):
        </p>

        {categories.map((category) => (
          <div
            key={category.id}
            className="border rounded-lg overflow-hidden"
          >
            {/* Category header */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => toggleCategory(category.id)}
            >
              <span className="font-medium text-sm">{category.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {selectedDescriptors.filter((id) =>
                    category.descriptors.some((d) => d.id === id)
                  ).length} / {category.descriptors.length}
                </span>
                {expandedCategories.has(category.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Descriptors */}
            {expandedCategories.has(category.id) && (
              <div className="p-4 space-y-3 bg-background">
                {category.descriptors.map((descriptor) => (
                  <div
                    key={descriptor.id}
                    className="flex items-start space-x-3"
                  >
                    <Checkbox
                      id={descriptor.id}
                      checked={selectedDescriptors.includes(descriptor.id)}
                      onCheckedChange={() => toggleDescriptor(descriptor.id)}
                      className="mt-0.5"
                    />
                    <div className="grid gap-0.5 leading-none">
                      <Label
                        htmlFor={descriptor.id}
                        className="text-sm cursor-pointer"
                      >
                        {descriptor.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {descriptor.context}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selection count */}
      <div className="text-sm text-muted-foreground">
        {selectedDescriptors.length} of {totalDescriptors} selected
      </div>
    </div>
  )
}
