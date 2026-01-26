'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { type Location } from '@/lib/mock-data'

interface LocationContextType {
  locations: Location[]
  currentLocation: Location | null
  setCurrentLocation: (location: Location | null) => void
  isAllLocations: boolean
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

interface LocationProviderProps {
  children: ReactNode
  locations: Location[]
  defaultLocation?: Location | null
}

export function LocationProvider({
  children,
  locations,
  defaultLocation = null,
}: LocationProviderProps) {
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(defaultLocation)

  const setCurrentLocation = useCallback((location: Location | null) => {
    setCurrentLocationState(location)
  }, [])

  const isAllLocations = currentLocation === null

  return (
    <LocationContext.Provider
      value={{
        locations,
        currentLocation,
        setCurrentLocation,
        isAllLocations,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
