// utils/helpers.ts

import { EventFormData } from "@/types/events";

export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    return { isValid: false, error: "Image size should be less than 10MB" };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: "Please select a valid image file (JPEG, PNG, WebP)" };
  }

  return { isValid: true };
};

export const createObjectUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

export const revokeObjectUrl = (url: string): void => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().slice(0, 16);
};

export const convertEventDataToFormData = (eventData: any): EventFormData => {
  return {
    title: eventData.title || '',
    description: eventData.description || '',
    start_date: eventData.start_date ? formatDateForInput(eventData.start_date) : '',
    end_date: eventData.end_date ? formatDateForInput(eventData.end_date) : '',
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
};

export const prepareSubmitData = (formData: EventFormData) => {
  // Transform EventFormData to API-compatible format
  const submitData: any = {
    title: formData.title,
    description: formData.description,
    start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
    end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
    location: formData.location,
    template: formData.template,
    cover_image: formData.cover_image,
    visibility: formData.visibility,
    permissions: formData.permissions,
    share_settings: formData.share_settings,
  };

  // Only include share_token if it exists
  if (formData.share_token) {
    submitData.share_token = formData.share_token;
  }

  // Only include co_host_invite_token fields that are safe to update
  if (formData.co_host_invite_token?.token) {
    submitData.co_host_invite_token = {
      token: formData.co_host_invite_token.token,
      expires_at: formData.co_host_invite_token.expires_at,
      is_active: formData.co_host_invite_token.is_active,
      // Don't include created_by, created_at, max_uses, used_count as these are server-managed
    };
  }

  return submitData;
};

export const getUserIdFromToken = (token: string): string => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.user_id || payload.id || '';
  } catch (error) {
    console.error('Error decoding token:', error);
    return '';
  }
};
