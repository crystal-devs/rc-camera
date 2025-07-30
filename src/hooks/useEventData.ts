// hooks/useEventData.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getEventById } from '@/services/apis/events.api';
import { EventFormData } from '@/types/events';
import { INITIAL_FORM_DATA } from '@/constants/constants';

export const useEventData = (eventId: string, authToken: string | null) => {
  const [formData, setFormData] = useState<EventFormData>(INITIAL_FORM_DATA);
  const [originalData, setOriginalData] = useState<EventFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [eventCreatorId, setEventCreatorId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleInputChange = useCallback((field: string, value: any) => {
    const fieldParts = field.split('.');
    setFormData(prev => {
      let newData = { ...prev };
      let current: any = newData;

      for (let i = 0; i < fieldParts.length - 1; i++) {
        current[fieldParts[i]] = { ...current[fieldParts[i]] };
        current = current[fieldParts[i]];
      }

      current[fieldParts[fieldParts.length - 1]] = value;
      return newData;
    });
  }, []);

  const loadEventData = useCallback(async () => {
    if (!authToken || !eventId) return;

    try {
      setIsLoading(true);
      const eventData = await getEventById(eventId, authToken);
      
      if (!eventData) {
        toast.error("Event not found");
        router.push('/events');
        return;
      }

      setEventCreatorId(eventData.created_by);

      const convertedData: EventFormData = {
        title: eventData.title || '',
        description: eventData.description || '',
        start_date: eventData.start_date ? new Date(eventData.start_date).toISOString().slice(0, 16) : '',
        end_date: eventData.end_date ? new Date(eventData.end_date).toISOString().slice(0, 16) : '',
        location: {
          name: eventData.location?.name || '',
          address: eventData.location?.address || ''
        },
        template: eventData.template || 'custom',
        cover_image: {
          url: eventData.cover_image?.url || '',
          public_id: eventData.cover_image?.public_id || ''
        },
        visibility: eventData.visibility || 'private',
        permissions: {
          can_view: eventData.permissions?.can_view ?? true,
          can_upload: eventData.permissions?.can_upload ?? true,
          can_download: eventData.permissions?.can_download ?? true,
          allowed_media_types: {
            images: eventData.permissions?.allowed_media_types?.images ?? true,
            videos: eventData.permissions?.allowed_media_types?.videos ?? true
          },
          require_approval: eventData.permissions?.require_approval ?? false
        },
        share_settings: {
          is_active: eventData.share_settings?.is_active ?? true,
          password: eventData.share_settings?.password || null,
          expires_at: eventData.share_settings?.expires_at || null
        },
        share_token: eventData.share_token || '',
        co_host_invite_token: {
          token: eventData.co_host_invite_token?.token || '',
          expires_at: eventData.co_host_invite_token?.expires_at || '',
          is_active: eventData.co_host_invite_token?.is_active ?? true
        }
      };

      setFormData(convertedData);
      setOriginalData(convertedData);
      setPreviewUrl(eventData.cover_image?.url || null);
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error("Failed to load event");
    } finally {
      setIsLoading(false);
    }
  }, [eventId, authToken, router]);

  // Check for changes
  useEffect(() => {
    if (!originalData) return;
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(hasChanges);
  }, [formData, originalData]);

  return {
    formData,
    setFormData,
    originalData,
    setOriginalData,
    isLoading,
    hasChanges,
    eventCreatorId,
    previewUrl,
    setPreviewUrl,
    handleInputChange,
    loadEventData
  };
};