// hooks/useEventData.ts
import useEventStore from '@/stores/useEventStore'
import { useState, useEffect, useCallback } from 'react'

export const useEventData = (eventId: string) => {
  const [authToken, setAuthToken] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  
  const {
    selectedEvent,
    currentEventAlbums,
    isLoadingEvent,
    isLoadingAlbums,
    error,
    getEventFromCacheOrFetch,
    getAlbumsFromCacheOrFetch,
    setSelectedEvent,
    clearExpiredCache,
    invalidateAlbumsCache
  } = useEventStore()
  
  // Initialize auth token
  useEffect(() => {
    const token = localStorage.getItem('authToken') || ''
    setAuthToken(token)
    setIsInitialized(true)
    
    // Clear expired cache on initialization
    clearExpiredCache()
  }, [clearExpiredCache])
  
  // Load event data when eventId changes or component mounts
  useEffect(() => {
    if (!isInitialized || !authToken || !eventId) return
    
    const loadEventData = async () => {
      console.log(`🔄 Loading event data for ${eventId}`)
      const event = await getEventFromCacheOrFetch(eventId, authToken)
      
      if (event && (!selectedEvent || selectedEvent._id !== eventId)) {
        setSelectedEvent(event, event.user_role)
        console.log(`✅ Event ${eventId} set as selected`)
      }
    }
    
    loadEventData()
  }, [eventId, authToken, isInitialized, getEventFromCacheOrFetch, selectedEvent, setSelectedEvent])
  
  // Load albums data
  const loadAlbums = useCallback(async () => {
    if (!authToken || !eventId) {
      console.log('❌ Cannot load albums: missing authToken or eventId')
      return []
    }
    
    console.log(`🔄 Loading albums for event ${eventId}`)
    return await getAlbumsFromCacheOrFetch(eventId, authToken)
  }, [eventId, authToken, getAlbumsFromCacheOrFetch])
  
  // Auto-load albums when event is selected
  useEffect(() => {
    if (selectedEvent?._id === eventId && authToken && isInitialized) {
      loadAlbums()
    }
  }, [selectedEvent?._id, eventId, authToken, isInitialized, loadAlbums])
  
  // Refresh albums function (invalidates cache first)
  const refreshAlbums = useCallback(async () => {
    console.log(`🔄 Refreshing albums for event ${eventId}`)
    // Invalidate cache first to force fresh fetch
    invalidateAlbumsCache(eventId)
    return await loadAlbums()
  }, [eventId, invalidateAlbumsCache, loadAlbums])
  
  // Check if we have the right event loaded
  const isCurrentEvent = selectedEvent?._id === eventId
  
  return {
    // Event data
    event: isCurrentEvent ? selectedEvent : null,
    albums: currentEventAlbums,
    
    // Loading states
    isLoadingEvent,
    isLoadingAlbums,
    isLoading: isLoadingEvent || isLoadingAlbums,
    
    // Error state
    error,
    
    // Utility functions
    refreshAlbums,
    
    // Auth token for components that need it
    authToken,
    
    // Initialization state
    isInitialized
  }
}