'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, ImageIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useOrganization } from '@/contexts/organization-context'
import { cn } from '@/lib/utils'
import { isValidHex, isLightColor } from '@/lib/utils/colors'

const COLOR_PRESETS = [
  { name: 'Navy', value: '#1e3a5f' },
  { name: 'Gold', value: '#c9a962' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#059669' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Purple', value: '#7c3aed' },
]

interface LogoUploadProps {
  label: string
  description: string
  currentUrl: string | null
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
  isUploading: boolean
}

function LogoUpload({ label, description, currentUrl, onUpload, onRemove, isUploading }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) {
        await onUpload(file)
      }
    },
    [onUpload]
  )

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await onUpload(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [onUpload]
  )

  return (
    <div className="space-y-3">
      <div>
        <Label className="font-medium">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'relative flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 bg-muted/50',
            currentUrl && 'border-solid border-border'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {currentUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUrl}
                alt={label}
                className="h-full w-full rounded-lg object-contain p-2"
              />
              <button
                onClick={onRemove}
                disabled={isUploading}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 disabled:opacity-50"
                title="Remove logo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP, or SVG. Max 2MB.
          </p>
          <p className="text-xs text-muted-foreground">
            Drag and drop supported.
          </p>
        </div>
      </div>
    </div>
  )
}

interface ColorPickerProps {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
}

function ColorPicker({ label, description, value, onChange }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value)

  // Sync input value when prop changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    if (isValidHex(newValue)) {
      onChange(newValue.startsWith('#') ? newValue : `#${newValue}`)
    }
  }

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="font-medium">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={handleColorPickerChange}
            className="h-10 w-14 cursor-pointer rounded-md border border-input"
          />
        </div>
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className="w-28 font-mono"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => {
              setInputValue(preset.value)
              onChange(preset.value)
            }}
            className={cn(
              'group relative h-8 w-8 rounded-md border-2 transition-all hover:scale-110',
              value.toLowerCase() === preset.value.toLowerCase()
                ? 'border-foreground ring-2 ring-offset-2 ring-foreground'
                : 'border-transparent'
            )}
            style={{ backgroundColor: preset.value }}
            title={preset.name}
          >
            {value.toLowerCase() === preset.value.toLowerCase() && (
              <Check
                className={cn(
                  'absolute inset-0 m-auto h-4 w-4',
                  isLightColor(preset.value) ? 'text-black' : 'text-white'
                )}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ColorPreviewProps {
  primaryColor: string
  accentColor: string
}

function ColorPreview({ primaryColor, accentColor }: ColorPreviewProps) {
  const isValidPrimary = isValidHex(primaryColor)
  const isValidAccent = isValidHex(accentColor)

  return (
    <div className="space-y-3">
      <Label className="font-medium">Live Preview</Label>
      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: isValidPrimary ? primaryColor : '#6366f1',
              color: isValidPrimary && isLightColor(primaryColor) ? '#000' : '#fff',
            }}
          >
            Primary Button
          </button>
          <button
            className="rounded-md border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: isValidPrimary ? primaryColor : '#6366f1',
              color: isValidPrimary ? primaryColor : '#6366f1',
            }}
          >
            Outline Button
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: isValidPrimary ? `${primaryColor}20` : '#6366f120',
              color: isValidPrimary ? primaryColor : '#6366f1',
            }}
          >
            Primary Badge
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: isValidAccent ? `${accentColor}20` : '#f59e0b20',
              color: isValidAccent ? accentColor : '#f59e0b',
            }}
          >
            Accent Badge
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-24 rounded-full"
            style={{
              backgroundColor: isValidPrimary ? primaryColor : '#6366f1',
            }}
          />
          <span className="text-xs text-muted-foreground">Progress Bar</span>
        </div>
      </div>
    </div>
  )
}

export function BrandingTab() {
  const { toast } = useToast()
  const { organization, isLoading: isOrgLoading, refetch } = useOrganization()

  // Local state for form values
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [accentColor, setAccentColor] = useState('#f59e0b')
  const [darkMode, setDarkMode] = useState(false)

  // Loading states
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync state with organization data when loaded
  useEffect(() => {
    if (organization) {
      setLogoUrl(organization.logoUrl)
      setPrimaryColor(organization.primaryColor || '#6366f1')
      setAccentColor(organization.accentColor || '#f59e0b')
      setDarkMode(organization.darkMode || false)
    }
  }, [organization])

  const handleLogoUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PNG, JPG, WebP, or SVG file.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 2MB.',
        variant: 'destructive',
      })
      return
    }

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      const response = await fetch('/api/organizations/logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload logo')
      }

      const data = await response.json()
      setLogoUrl(data.url)
      await refetch()

      toast({
        title: 'Logo uploaded',
        description: 'Your organization logo has been updated.',
      })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload logo',
        variant: 'destructive',
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleLogoRemove = async () => {
    setIsUploadingLogo(true)
    try {
      const response = await fetch('/api/organizations/logo?type=logo', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove logo')
      }

      setLogoUrl(null)
      await refetch()

      toast({
        title: 'Logo removed',
        description: 'Your organization logo has been removed.',
      })
    } catch (error) {
      toast({
        title: 'Removal failed',
        description: error instanceof Error ? error.message : 'Failed to remove logo',
        variant: 'destructive',
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    // Validate colors
    if (!isValidHex(primaryColor)) {
      toast({
        title: 'Invalid primary color',
        description: 'Please enter a valid hex color code.',
        variant: 'destructive',
      })
      return
    }

    if (!isValidHex(accentColor)) {
      toast({
        title: 'Invalid accent color',
        description: 'Please enter a valid hex color code.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/organizations/branding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryColor,
          accentColor,
          darkMode,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save branding')
      }

      await refetch()

      toast({
        title: 'Branding saved',
        description: 'Your organization branding has been updated.',
      })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save branding',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isOrgLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-24 w-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-10 w-48 animate-pulse rounded bg-muted" />
            <div className="h-10 w-48 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Logo</CardTitle>
          <CardDescription>
            Upload your organization&apos;s logo for white-label branding across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload
            label="Main Logo"
            description="Used in the sidebar and login pages. Recommended size: 200x50px."
            currentUrl={logoUrl}
            onUpload={handleLogoUpload}
            onRemove={handleLogoRemove}
            isUploading={isUploadingLogo}
          />
        </CardContent>
      </Card>

      {/* Colors Section */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
          <CardDescription>
            Customize the primary and accent colors to match your brand identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ColorPicker
              label="Primary Color"
              description="Used for buttons, links, and key UI elements."
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorPicker
              label="Accent Color"
              description="Used for highlights, badges, and secondary elements."
              value={accentColor}
              onChange={setAccentColor}
            />
          </div>
          <ColorPreview primaryColor={primaryColor} accentColor={accentColor} />
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Configure additional appearance settings for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable dark mode as the default theme for all users.
              </p>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Branding'}
        </Button>
      </div>
    </div>
  )
}
