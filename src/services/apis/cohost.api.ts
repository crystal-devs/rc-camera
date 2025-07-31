// services/apis/cohost.api.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

export interface CoHost {
  _id?: string;
  user_id: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  invited_by: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'removed';
  approved_by?: {
    _id: string;
    name: string;
    email: string;
  };
  permissions: {
    manage_content: boolean;
    manage_guests: boolean;
    manage_settings: boolean;
    approve_content: boolean;
  };
}

export interface CoHostInvite {
  token: string;
  created_by: {
    _id: string;
    name: string;
    email: string;
  };
  created_at: string;
  expires_at: string;
  is_active: boolean;
  max_uses: number;
  used_count: number;
  is_expired: boolean;
  is_max_used: boolean;
  is_usable: boolean;
  invite_link: string;
}

export interface CoHostData {
  event_id: string;
  event_title: string;
  event_creator: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  total_co_hosts: number;
  co_hosts_by_status: {
    approved: CoHost[];
    pending: CoHost[];
    rejected: CoHost[];
    removed: CoHost[];
    blocked: CoHost[];
  };
  summary: {
    approved: number;
    pending: number;
    rejected: number;
    removed: number;
  };
}

/**
 * Generate a co-host invite token
 */
export const generateCoHostInvite = async (
  eventId: string,
  expiresInHours: number = 24,
  maxUses: number = 10,
  authToken: string
): Promise<{ status: boolean; message: string; data: CoHostInvite | null }> => {
  try {
    console.log(`Generating co-host invite for event: ${eventId}`);

    const response = await axios.post(
      `${API_BASE_URL}/event/${eventId}/cohost-invite`,
      {
        expires_in_hours: expiresInHours,
        max_uses: maxUses
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000
      }
    );

    console.log('Co-host invite generated:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error generating co-host invite for event ${eventId}:`, error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('You don\'t have permission to generate co-host invites for this event');
      } else if (error.response?.status === 404) {
        throw new Error('Event not found');
      }
    }

    throw error;
  }
};

/**
 * Deactivate co-host invite token
 */
export const deactivateCoHostInvite = async (
  eventId: string,
  authToken: string
): Promise<{ status: boolean; message: string; data: any }> => {
  try {
    console.log(`Deactivating co-host invite for event: ${eventId}`);

    const response = await axios.delete(
      `${API_BASE_URL}/event/${eventId}/cohost-invite`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000
      }
    );

    console.log('Co-host invite deactivated:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error deactivating co-host invite for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Join as co-host using token
 */
export const joinAsCoHost = async (
  token: string,
  authToken: string
): Promise<{ status: boolean; message: string; data: any }> => {
  try {
    console.log(`Joining as co-host with token: ${token}`);

    const response = await axios.post(
      `${API_BASE_URL}/event/join-cohost/${token}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000
      }
    );

    console.log('Joined as co-host:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error joining as co-host with token ${token}:`, error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || 'Invalid or expired invite token';
        throw new Error(errorMessage);
      } else if (error.response?.status === 401) {
        throw new Error('You need to be logged in to join as co-host');
      }
    }

    throw error;
  }
};

/**
 * Get all co-hosts for an event
 */
export const getEventCoHosts = async (
  eventId: string,
  authToken: string
): Promise<{ status: boolean; message: string; data: CoHostData | null }> => {
  try {
    console.log(`Getting co-hosts for event: ${eventId}`);

    const response = await axios.get(
      `${API_BASE_URL}/event/${eventId}/cohosts`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000
      }
    );

    console.log('Event co-hosts:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error getting co-hosts for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Manage co-host (approve/reject/remove)
 */
export const manageCoHost = async (
  eventId: string,
  userId: string,
  action: 'approve' | 'block' | 'remove' | 'unblock',
  authToken: string
): Promise<{ status: boolean; message: string; data: any }> => {
  try {
    console.log(`Managing co-host for event ${eventId}, user ${userId}, action: ${action}`);

    const response = await axios.patch(
      `${API_BASE_URL}/event/${eventId}/cohosts/${userId}`,
      {
        action
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000
      }
    );

    console.log('Co-host management result:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error managing co-host for event ${eventId}:`, error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Co-host not found');
      } else if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || 'Invalid action';
        throw new Error(errorMessage);
      }
    }

    throw error;
  }
};

/**
 * Update co-host permissions
 */
export const updateCoHostPermissions = async (
  eventId: string,
  userId: string,
  permissions: {
    manage_content?: boolean;
    manage_guests?: boolean;
    manage_settings?: boolean;
    approve_content?: boolean;
  },
  authToken: string
): Promise<{ status: boolean; message: string; data: any }> => {
  try {
    console.log(`Updating co-host permissions for event ${eventId}, user ${userId}`, permissions);

    const response = await axios.patch(
      `${API_BASE_URL}/event/${eventId}/cohosts/${userId}/permissions`,
      {
        permissions
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000
      }
    );

    console.log('Co-host permissions updated:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error updating co-host permissions for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Get shareable co-host invite link
 */
export const getCoHostInviteLink = (token: string, baseUrl?: string): string => {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://app.example.com');
  return `${base}/event/join-cohost/${token}`;
};

/**
 * Check if co-host invite is valid
 */
export const validateCoHostInvite = (invite: CoHostInvite | null): {
  isValid: boolean;
  reason?: string;
} => {
  if (!invite) {
    return { isValid: false, reason: 'No invite found' };
  }

  if (!invite.invite_link) {
    return { isValid: false, reason: 'Invite has been deactivated' };
  }

  if (invite.is_expired) {
    return { isValid: false, reason: 'Invite has expired' };
  }

  if (invite.is_max_used) {
    return { isValid: false, reason: 'Invite usage limit reached' };
  }

  return { isValid: true };
};