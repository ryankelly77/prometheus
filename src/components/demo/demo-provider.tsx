'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { pageContexts, PageContext } from '@/lib/demo-content'

interface DemoContextType {
  isWalkthroughOpen: boolean
  toggleWalkthrough: () => void
  openWalkthrough: () => void
  closeWalkthrough: () => void
  isFeedbackOpen: boolean
  openFeedback: () => void
  closeFeedback: () => void
  currentPageContext: PageContext | null
  currentPath: string
}

const DemoContext = createContext<DemoContextType | undefined>(undefined)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const pathname = usePathname()

  const currentPageContext = pageContexts[pathname] || null

  return (
    <DemoContext.Provider
      value={{
        isWalkthroughOpen,
        toggleWalkthrough: () => setIsWalkthroughOpen(!isWalkthroughOpen),
        openWalkthrough: () => setIsWalkthroughOpen(true),
        closeWalkthrough: () => setIsWalkthroughOpen(false),
        isFeedbackOpen,
        openFeedback: () => setIsFeedbackOpen(true),
        closeFeedback: () => setIsFeedbackOpen(false),
        currentPageContext,
        currentPath: pathname,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const context = useContext(DemoContext)
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider')
  }
  return context
}
