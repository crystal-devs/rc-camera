// stores/eventStore.ts - Updated for Subscription Pattern
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getEventById, updateEvent, deleteEvent } from '@/services/apis/events.api'
import { fetchEventAlbums } from '@/services/apis/albums.api'
import { useWebSocketStore } from '@/stores/webSocketStore'

// Event interface remains the same
interface Event {
  _id: string
  title: string
  description: string
  created_by: string
  visibility: 'private' | 'anyone_with_link' | 'public'
  start_date: string
  end_date: string | null
  timezone: string
  template: string
  stats: {
    participants: number
    photos: number
    videos: number
    total_size_mb: number
    pending_approval: number
  }
  archived_at: string | null
  share_settings: {
    is_active: boolean
    password: string | null
    expires_at: string | null
  }
  permissions: any[]
  co_host_invite_token: {
    created_by: string | null
    created_at: string
    expires_at: string
    is_active: boolean
    max_uses: number
    used_count: number
    token: string
  }
  co_hosts: Array<{
    user_id: string
    invited_by: string
    status: string
    permissions: {
      manage_content: boolean
      manage_guests: boolean
      manage_settings: boolean
      approve_content: boolean
    }
    invited_at: string
    approved_at: string
  }>
  location: {
    name: string
    address: string
    coordinates: any[]
  }
  cover_image: {
    url: string
    public_id: string
    uploaded_by: string | null
    thumbnail_url: string
  }
  photowall_settings: {
    isEnabled: boolean
    displayMode: 'slideshow' | 'grid' | 'mosaic'
    transitionDuration: number
    showUploaderNames: boolean
    autoAdvance: boolean
    newImageInsertion: 'immediate' | 'after_current' | 'end_of_queue' | 'smart_priority'
  },
  styling_config: {
    cover: {
      template_id: number
      type: number
    }
    gallery: {
      layout_id: number
      grid_spacing: number
      thumbnail_size: number
    }
    theme: {
      theme_id: number
      fontset_id: number
    }
    navigation: {
      style_id: number
    }
  }
  created_at: string
  updated_at: string
  share_token: string
  __v: number
  user_role: 'creator' | 'co_host' | 'participant'
  participant_count: number
  active_participants: number
  last_activity: string | null
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface EventStore {
  // Persistent data
  selectedEvent: Event | null
  lastEventId: string | null
  userRole: string | null

  // Cache data (in memory only)
  eventsCache: Map<string, CacheEntry<Event>>
  albumsCache: Map<string, CacheEntry<any[]>>

  // Transient data
  events: Event[]
  currentEventAlbums: any[]
  isLoadingEvent: boolean
  isLoadingAlbums: boolean
  error: string | null

  // Cache settings
  CACHE_DURATION: number

  // Actions
  setSelectedEvent: (event: Event, role?: string) => void
  clearSelectedEvent: () => void
  setEvents: (events: Event[]) => void

  // Cache-first API methods
  getEventFromCacheOrFetch: (eventId: string, authToken: string) => Promise<Event | null>
  getAlbumsFromCacheOrFetch: (eventId: string, authToken: string) => Promise<any[]>

  // Store management
  updateEventInStore: (eventId: string, updates: Partial<Event>) => void
  deleteEventFromStore: (eventId: string) => void

  // Cache management
  clearExpiredCache: () => void
  invalidateEventCache: (eventId: string) => void
  invalidateAlbumsCache: (eventId: string) => void

  // Loading states
  setLoadingEvent: (loading: boolean) => void
  setLoadingAlbums: (loading: boolean) => void
  setError: (error: string | null) => void
}

// Default PhotoWall settings factory
const createDefaultPhotowallSettings = () => ({
  isEnabled: false,
  displayMode: 'slideshow' as const,
  transitionDuration: 5000,
  showUploaderNames: true,
  autoAdvance: true,
  newImageInsertion: 'after_current' as const
})

// Helper function to ensure event has complete photowall_settings
const ensurePhotowallSettings = (event: any): Event => {
  if (!event) return event

  if (!event.photowall_settings) {
    console.log('Adding missing photowall_settings to event:', event._id)
    return {
      ...event,
      photowall_settings: createDefaultPhotowallSettings()
    }
  }

  const defaults = createDefaultPhotowallSettings()
  const currentSettings = event.photowall_settings

  let needsUpdate = false
  const mergedSettings = { ...defaults }

  Object.keys(defaults).forEach(key => {
    if (currentSettings.hasOwnProperty(key)) {
      mergedSettings[key] = currentSettings[key]
    } else {
      needsUpdate = true
    }
  })

  if (needsUpdate) {
    console.log('Merging incomplete photowall_settings for event:', event._id)
    return {
      ...event,
      photowall_settings: mergedSettings
    }
  }

  return event
}

// Migration function to handle version changes
const migrateEventStore = (persistedState: any, version: number) => {
  console.log(`Migrating event store from version ${version} to version 4`)

  if (version < 4) {
    if (persistedState.selectedEvent) {
      persistedState.selectedEvent = ensurePhotowallSettings(persistedState.selectedEvent)
      console.log('Migrated selectedEvent photowall_settings')
    }
  }

  return persistedState
}

const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      // Persistent state
      selectedEvent: null,
      lastEventId: null,
      userRole: null,

      // Cache state (not persisted)
      eventsCache: new Map(),
      albumsCache: new Map(),
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

      // Transient state
      events: [],
      currentEventAlbums: [],
      isLoadingEvent: false,
      isLoadingAlbums: false,
      error: null,

      // UPDATED: Enhanced setSelectedEvent with WebSocket subscription management
      setSelectedEvent: (event: Event, role = 'participant') => {
        console.log('Setting selected event:', event.title, 'Role:', role)

        const previousEvent = get().selectedEvent;

        // NEW: Handle WebSocket subscription switching
        if (typeof window !== 'undefined') {
          const webSocketStore = useWebSocketStore.getState();

          // Only handle subscription switching if WebSocket is connected and authenticated
          if (webSocketStore.isAuthenticated && webSocketStore.isConnected && previousEvent?._id !== event._id) {
            // In your eventStore.ts setSelectedEvent method, add this before switchSubscription:
            console.log('🔍 SUBSCRIPTION DEBUG:', {
              previousEventId: previousEvent?._id,
              newEventId: event._id,
              shareToken: event.share_token,
              userInfo: webSocketStore.userInfo,
              isAuthenticated: webSocketStore.isAuthenticated
            });
            // Use the new subscription pattern instead of room switching
            webSocketStore.switchSubscription(
              previousEvent?._id || '',
              event._id,
              event.share_token
            )
              .then(() => {
                console.log(`✅ Switched WebSocket subscriptions: ${previousEvent?.title || 'none'} → ${event.title}`);
              })
              .catch((error) => {
                console.error('❌ Failed to switch WebSocket subscriptions:', error);
                // Don't block the UI update on subscription failure
              });
          } else if (webSocketStore.isAuthenticated && webSocketStore.isConnected && !previousEvent) {
            // First time selecting an event - just subscribe
            console.log('Initial WebSocket subscription...');
            webSocketStore.subscribe(event._id, event.share_token)
              .then(() => {
                console.log(`✅ Initial WebSocket subscription: ${event.title}`);
              })
              .catch((error) => {
                console.error('❌ Failed initial WebSocket subscription:', error);
              });
          }
        }

        // Ensure complete photowall_settings
        const eventWithSettings = ensurePhotowallSettings(event)

        set({
          selectedEvent: eventWithSettings,
          lastEventId: event._id,
          userRole: role,
          error: null
        })

        // Update cache
        const cache = get().eventsCache
        cache.set(event._id, { data: eventWithSettings, timestamp: Date.now() })
        set({ eventsCache: cache })
      },

      // UPDATED: Enhanced clearSelectedEvent with WebSocket subscription cleanup
      clearSelectedEvent: () => {
        console.log('Clearing selected event')

        const currentEvent = get().selectedEvent;

        // NEW: Unsubscribe from WebSocket when clearing selected event
        if (currentEvent && typeof window !== 'undefined') {
          const webSocketStore = useWebSocketStore.getState();

          if (webSocketStore.isAuthenticated && webSocketStore.isSubscribed(currentEvent._id)) {
            webSocketStore.unsubscribe(currentEvent._id)
              .then(() => {
                console.log(`✅ Unsubscribed from WebSocket for: ${currentEvent.title}`);
              })
              .catch((error) => {
                console.error('❌ Failed to unsubscribe from WebSocket:', error);
              });
          }
        }

        set({
          selectedEvent: null,
          lastEventId: null,
          userRole: null,
          currentEventAlbums: []
        })
      },

      setEvents: (events: Event[]) => {
        const eventsWithSettings = events.map(ensurePhotowallSettings)
        set({ events: eventsWithSettings, error: null })
      },

      // Cache-first event fetching with proper error handling
      getEventFromCacheOrFetch: async (eventId: string, authToken: string): Promise<Event | null> => {
        const { eventsCache, CACHE_DURATION } = get()

        if (!eventId || !authToken) {
          console.error('Invalid parameters: eventId or authToken missing')
          set({ error: 'Invalid request parameters', isLoadingEvent: false })
          return null
        }

        const cached = eventsCache.get(eventId)

        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log(`Using cached event data for ${eventId}`)
          return cached.data
        }

        console.log(`Fetching fresh event data for ${eventId}`)
        set({ isLoadingEvent: true, error: null })

        try {
          const event = await getEventById(eventId, authToken)
          set({ isLoadingEvent: false })

          if (event) {
            const eventWithSettings = ensurePhotowallSettings(event)

            const newCache = new Map(eventsCache)
            newCache.set(eventId, { data: eventWithSettings, timestamp: Date.now() })
            set({ eventsCache: newCache })

            const currentSelected = get().selectedEvent
            if (currentSelected?._id === eventId) {
              set({ selectedEvent: eventWithSettings })
            }

            console.log(`Event ${eventId} fetched and cached successfully`)
            return eventWithSettings
          } else {
            console.warn(`No event data returned for ${eventId}`)
            set({ error: 'Event not found' })
            return null
          }
        } catch (error) {
          console.error('Error fetching event:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch event',
            isLoadingEvent: false
          })
          return null
        }
      },

      // Cache-first albums fetching with proper error handling
      getAlbumsFromCacheOrFetch: async (eventId: string, authToken: string): Promise<any[]> => {
        const { albumsCache, CACHE_DURATION } = get()

        if (!eventId || !authToken) {
          console.error('Invalid parameters: eventId or authToken missing for albums')
          set({ error: 'Invalid request parameters', isLoadingAlbums: false })
          return []
        }

        const cached = albumsCache.get(eventId)

        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log(`Using cached albums data for ${eventId}`)
          set({ currentEventAlbums: cached.data })
          return cached.data
        }

        console.log(`Fetching fresh albums data for ${eventId}`)
        set({ isLoadingAlbums: true, error: null })

        try {
          const albums = await fetchEventAlbums(eventId, authToken)
          set({ isLoadingAlbums: false })

          if (albums && Array.isArray(albums)) {
            albums.sort((a, b) => {
              if (a.isDefault && !b.isDefault) return -1
              if (!a.isDefault && b.isDefault) return 1
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            })

            const newCache = new Map(albumsCache)
            newCache.set(eventId, { data: albums, timestamp: Date.now() })

            set({
              albumsCache: newCache,
              currentEventAlbums: albums
            })

            console.log(`Albums for ${eventId} fetched and cached (${albums.length} albums)`)
            return albums
          } else {
            console.warn(`No albums data returned for ${eventId}`)
            set({ currentEventAlbums: [] })
            return []
          }
        } catch (error) {
          console.error('Error fetching albums:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch albums',
            isLoadingAlbums: false,
            currentEventAlbums: []
          })
          return []
        }
      },

      // Update event in store and cache
      updateEventInStore: (eventId: string, updates: Partial<Event>) => {
        console.log(`Updating event ${eventId} in store`)
        const { eventsCache, selectedEvent } = get()

        const cached = eventsCache.get(eventId)
        if (cached) {
          const updatedEvent = { ...cached.data, ...updates } as Event
          const eventWithSettings = ensurePhotowallSettings(updatedEvent)

          const newCache = new Map(eventsCache)
          newCache.set(eventId, { data: eventWithSettings, timestamp: Date.now() })
          set({ eventsCache: newCache })

          if (selectedEvent?._id === eventId) {
            set({ selectedEvent: eventWithSettings })
          }

          console.log(`Event ${eventId} updated in store`)
        }
      },

      // UPDATED: Enhanced deleteEventFromStore with WebSocket cleanup
      deleteEventFromStore: (eventId: string) => {
        console.log(`Deleting event ${eventId} from store`)
        const { eventsCache, albumsCache, selectedEvent } = get()

        // NEW: Unsubscribe from WebSocket if deleting the currently selected event
        if (selectedEvent?._id === eventId && typeof window !== 'undefined') {
          const webSocketStore = useWebSocketStore.getState();

          if (webSocketStore.isAuthenticated && webSocketStore.isSubscribed(eventId)) {
            webSocketStore.unsubscribe(eventId)
              .then(() => {
                console.log(`✅ Unsubscribed from WebSocket for deleted event: ${eventId}`);
              })
              .catch((error) => {
                console.error('❌ Failed to unsubscribe from WebSocket for deleted event:', error);
              });
          }
        }

        // Remove from caches
        const newEventsCache = new Map(eventsCache)
        const newAlbumsCache = new Map(albumsCache)
        newEventsCache.delete(eventId)
        newAlbumsCache.delete(eventId)

        set({
          eventsCache: newEventsCache,
          albumsCache: newAlbumsCache
        })

        // Clear selected event if it was the deleted one
        if (selectedEvent?._id === eventId) {
          set({
            selectedEvent: null,
            lastEventId: null,
            userRole: null,
            currentEventAlbums: []
          })
        }

        console.log(`Event ${eventId} deleted from store`)
      },

      // Cache management utilities
      clearExpiredCache: () => {
        const { eventsCache, albumsCache, CACHE_DURATION } = get()
        const now = Date.now()
        let eventsCleared = 0
        let albumsCleared = 0

        const newEventsCache = new Map()
        for (const [key, value] of eventsCache) {
          if ((now - value.timestamp) < CACHE_DURATION) {
            newEventsCache.set(key, value)
          } else {
            eventsCleared++
          }
        }

        const newAlbumsCache = new Map()
        for (const [key, value] of albumsCache) {
          if ((now - value.timestamp) < CACHE_DURATION) {
            newAlbumsCache.set(key, value)
          } else {
            albumsCleared++
          }
        }

        set({
          eventsCache: newEventsCache,
          albumsCache: newAlbumsCache
        })

        if (eventsCleared > 0 || albumsCleared > 0) {
          console.log(`Cache cleanup: ${eventsCleared} events, ${albumsCleared} albums expired`)
        }
      },

      invalidateEventCache: (eventId: string) => {
        console.log(`Invalidating event cache for ${eventId}`)
        const { eventsCache } = get()
        const newCache = new Map(eventsCache)
        newCache.delete(eventId)
        set({ eventsCache: newCache })
      },

      invalidateAlbumsCache: (eventId: string) => {
        console.log(`Invalidating albums cache for ${eventId}`)
        const { albumsCache } = get()
        const newCache = new Map(albumsCache)
        newCache.delete(eventId)
        set({ albumsCache: newCache })
      },

      // Loading state setters
      setLoadingEvent: (loading: boolean) => set({ isLoadingEvent: loading }),
      setLoadingAlbums: (loading: boolean) => set({ isLoadingAlbums: loading }),
      setError: (error: string | null) => set({ error })
    }),
    {
      name: 'event-app-storage',
      version: 4, // UPDATED: Bumped version for subscription integration
      migrate: migrateEventStore,
      partialize: (state) => ({
        selectedEvent: state.selectedEvent,
        lastEventId: state.lastEventId,
        userRole: state.userRole
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.selectedEvent) {
          console.log('Rehydrated event data:', state.selectedEvent.title)

          if (state.selectedEvent) {
            state.selectedEvent = ensurePhotowallSettings(state.selectedEvent)
            console.log('Verified photowall_settings during rehydration')
          }
        }
      }
    }
  )
)

export default useEventStore
export type { Event }