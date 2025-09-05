// hooks/useEventSettings.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateEvent, deleteEvent } from '@/services/apis/events.api'
import { uploadCoverImage } from '@/services/apis/media.api'
import useEventStore, { Event } from '@/stores/useEventStore'

// Form data interface
interface EventFormData {
  title: string
  description: string
  start_date: string
  end_date: string
  location: {
    name: string
    address: string
  }
  template: string
  cover_image: {
    url: string
    public_id: string
  }
  visibility: 'private' | 'anyone_with_link' | 'public'
  permissions: any
  share_settings: {
    is_active: boolean
    password: string | null
    expires_at: string | null
  }
  share_token: string
  co_host_invite_token: {
    token: string
    expires_at: string
    is_active: boolean
  }
  photowall_settings: {
    isEnabled: boolean
    displayMode: 'slideshow' | 'grid' | 'mosaic'
    transitionDuration: number
    showUploaderNames: boolean
    autoAdvance: boolean
    newImageInsertion: 'immediate' | 'after_current' | 'end_of_queue' | 'smart_priority'
  }
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
}

// Helper function to convert Event to FormData
const convertEventToFormData = (event: Event): EventFormData => {
  return {
    title: event.title || '',
    description: event.description || '',
    start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
    end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
    location: {
      name: event.location?.name || '',
      address: event.location?.address || ''
    },
    template: event.template || 'custom',
    cover_image: {
      url: event.cover_image?.url || '',
      public_id: event.cover_image?.public_id || ''
    },
    visibility: event.visibility || 'private',
    permissions: event.permissions || {},
    share_settings: {
      is_active: event.share_settings?.is_active ?? true,
      password: event.share_settings?.password || null,
      expires_at: event.share_settings?.expires_at || null
    },
    share_token: event.share_token || '',
    co_host_invite_token: {
      token: event.co_host_invite_token?.token || '',
      expires_at: event.co_host_invite_token?.expires_at || '',
      is_active: event.co_host_invite_token?.is_active ?? true
    },
    photowall_settings: {
      isEnabled: event.photowall_settings?.isEnabled ?? true,
      displayMode: event.photowall_settings?.displayMode || 'slideshow',
      transitionDuration: event.photowall_settings?.transitionDuration || 5000,
      showUploaderNames: event.photowall_settings?.showUploaderNames ?? false,
      autoAdvance: event.photowall_settings?.autoAdvance ?? true,
      newImageInsertion: event.photowall_settings?.newImageInsertion || 'after_current'
    },
    styling_config: {
      cover: {
        template_id: event.styling_config?.cover?.template_id ?? 0,
        type: event.styling_config?.cover?.type ?? 0
      },
      gallery: {
        layout_id: event.styling_config?.gallery?.layout_id ?? 1,
        grid_spacing: event.styling_config?.gallery?.grid_spacing ?? 0,
        thumbnail_size: event.styling_config?.gallery?.thumbnail_size ?? 1
      },
      theme: {
        theme_id: event.styling_config?.theme?.theme_id ?? 8,
        fontset_id: event.styling_config?.theme?.fontset_id ?? 0
      },
      navigation: {
        style_id: event.styling_config?.navigation?.style_id ?? 0
      }
    }
  }
}

// Helper function to prepare data for API submission
const prepareSubmitData = (formData: EventFormData) => {
  return {
    title: formData.title,
    description: formData.description,
    start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
    end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
    location: {
      name: formData.location.name,
      address: formData.location.address
    },
    template: formData.template,
    cover_image: formData.cover_image,
    visibility: formData.visibility,
    permissions: formData.permissions,
    share_settings: formData.share_settings,
    photowall_settings: formData.photowall_settings,
    styling_config: formData.styling_config
  }
}

export const useEventSettings = (eventId: string) => {
  const router = useRouter()

  // Store hooks
  const {
    selectedEvent,
    isLoadingEvent,
    error,
    getEventFromCacheOrFetch,
    updateEventInStore,
    deleteEventFromStore,
    invalidateEventCache
  } = useEventStore()

  // Local state
  const [authToken, setAuthToken] = useState<string>('')
  const [formData, setFormData] = useState<EventFormData | null>(null)
  const [originalData, setOriginalData] = useState<EventFormData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize auth token
  useEffect(() => {
    const token = localStorage.getItem('authToken') || ''
    setAuthToken(token)
  }, [])

  // Load event data and convert to form data
  useEffect(() => {
    if (!authToken || !eventId) return

    const loadEventData = async () => {
      console.log(`⚙️ Loading event settings for ${eventId}`)

      let event = selectedEvent

      // If we don't have the event or it's different, fetch it
      if (!event || event._id !== eventId) {
        event = await getEventFromCacheOrFetch(eventId, authToken)
      }

      if (!event) {
        toast.error("Event not found")
        router.push('/events')
        return
      }

      // Convert to form data
      const convertedData = convertEventToFormData(event)

      setFormData(convertedData)
      setOriginalData(convertedData)
      setPreviewUrl(event.cover_image?.url || null)
      setIsInitialized(true)

      console.log(`✅ Event settings loaded for ${event.title}`)
    }

    loadEventData()
  }, [eventId, authToken, selectedEvent, getEventFromCacheOrFetch, router])

  // Memoized change detection
  const hasChanges = useMemo(() => {
    if (!originalData || !formData) return false
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }, [formData, originalData])

  // Handle input changes with deep nested support
  const handleInputChange = useCallback((field: string, value: any) => {
    if (!formData) return

    const fieldParts = field.split('.')
    setFormData(prev => {
      if (!prev) return prev

      let newData = { ...prev }
      let current: any = newData

      for (let i = 0; i < fieldParts.length - 1; i++) {
        current[fieldParts[i]] = { ...current[fieldParts[i]] }
        current = current[fieldParts[i]]
      }

      current[fieldParts[fieldParts.length - 1]] = value
      return newData
    })
  }, [formData])

  // Handle cover image changes
  const handleCoverImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setCoverImageFile(null)
      return
    }

    const selectedFile = e.target.files[0]
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (selectedFile.size > maxSize) {
      toast.error("Image size should be less than 10MB")
      e.target.value = ''
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, WebP)")
      e.target.value = ''
      return
    }

    setCoverImageFile(selectedFile)

    // Clean up previous preview URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)
  }, [previewUrl])

  // Clear cover image
  const handleClearImage = useCallback(() => {
    setCoverImageFile(null)
    setPreviewUrl(null)
    handleInputChange('cover_image.url', '')
  }, [handleInputChange])

  // Submit form
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!formData?.title.trim()) {
      toast.error("Event name is required")
      return
    }

    if (!authToken) {
      toast.error("Authentication required")
      return
    }

    setIsSubmitting(true)

    try {
      let updatedFormData = { ...formData }

      // Upload cover image if changed
      if (coverImageFile) {
        toast.info("Uploading cover image...")
        try {
          const imageUrl = await uploadCoverImage(
            coverImageFile,
            'event-covers',
            authToken,
            {
              compressionQuality: 'high',
              maxWidth: 1920,
              maxHeight: 1080
            }
          )

          updatedFormData.cover_image = {
            url: imageUrl,
            public_id: '',
          }

          toast.success("Cover image uploaded successfully!")
        } catch (uploadError: any) {
          console.error('Cover image upload failed:', uploadError)
          toast.error(uploadError.message || "Failed to upload cover image")
          return
        }
      }

      // Prepare and submit data
      const submitData = prepareSubmitData(updatedFormData)

      await updateEvent(eventId, submitData, authToken)

      // Update store cache
      updateEventInStore(eventId, submitData as any)

      // Update local state
      setFormData(updatedFormData)
      setOriginalData(updatedFormData)
      setCoverImageFile(null)

      if (updatedFormData.cover_image.url) {
        setPreviewUrl(updatedFormData.cover_image.url)
      }

      toast.success("Event updated successfully!")

    } catch (error: any) {
      console.error('Error updating event:', error)
      toast.error(error.message || "Failed to update event")

      // Invalidate cache on error to ensure fresh data on next load
      invalidateEventCache(eventId)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, authToken, eventId, coverImageFile, updateEventInStore, invalidateEventCache])

  // Delete event
  const handleDeleteEvent = useCallback(async () => {
    if (!authToken) return

    try {
      await deleteEvent(eventId, authToken)

      // Remove from store
      deleteEventFromStore(eventId)

      toast.success("Event deleted successfully!")
      router.push('/events')
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error("Failed to delete event")
    }
  }, [eventId, authToken, deleteEventFromStore, router])

  // Get user info
  const currentUserId = selectedEvent?.created_by
  const isEventCreator = currentUserId && selectedEvent?.created_by && currentUserId === selectedEvent.created_by

  return {
    // Form data
    formData,
    originalData,

    // Loading states
    isLoading: isLoadingEvent || !isInitialized,
    isSubmitting,
    hasChanges,

    // Error state
    error,

    // User info
    currentUserId,
    isEventCreator,

    // Form handlers
    handleInputChange,
    handleCoverImageChange,
    handleClearImage,
    handleSubmit,
    handleDeleteEvent,

    // Image preview
    previewUrl,

    // Auth token for child components
    authToken
  }
}