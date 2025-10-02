// services/apis/cohost.api.ts - Updated for EventParticipant system

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

// Updated interfaces to match new EventParticipant system
export interface CoHost {
  user_id: string;
  user_info: {
    name: string;
    email: string;
    profile_pic?: string;
  };
  status: 'active' | 'pending' | 'blocked' | 'removed';
  permissions: {
    can_view: boolean;
    can_upload: boolean;
    can_download: boolean;
    can_invite_others: boolean;
    can_moderate_content: boolean;
    can_manage_participants: boolean;
    can_edit_event: boolean;
    can_delete_event: boolean;
    can_approve_content: boolean;
    can_export_data: boolean;
    can_view_analytics: boolean;
    can_manage_settings: boolean;
  };
  invited_by?: {
    id: string;
    name: string;
  };
  invited_at?: string;
  joined_at: string;
  last_activity_at: string;
  stats: {
    uploads_count: number;
    downloads_count: number;
    views_count: number;
    invites_sent: number;
  };
}

export interface CoHostInvite {
  invitation_id: string;
  token: string;
  invite_link: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  event_title: string;
  created_by?: {
    name: string;
    email: string;
  };
  personal_message?: string;
}

export interface CoHostData {
  event_id: string;
  event_title: string;
  event_creator: string; // ObjectId
  co_hosts: CoHost[];
  total_count: number;
}

/**
 * Create a co-host invite
 */
export const createCoHostInvite = async (
  eventId: string,
  options: {
    maxUses?: number;
    expiresInHours?: number;
    personalMessage?: string;
  } = {},
  authToken: string
): Promise<{ status: boolean; message: string; data: CoHostInvite | null }> => {
  try {
    console.log(`Creating co-host invite for event: ${eventId}`);

    const response = await axios.post(
      `${API_BASE_URL}/event/${eventId}/cohost-invite`,
      {
        max_uses: options.maxUses || 10,
        expires_in_hours: options.expiresInHours || 168,
        personal_message: options.personalMessage
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000
      }
    );

    console.log('Co-host invite created:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error creating co-host invite for event ${eventId}:`, error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error('You don\'t have permission to create co-host invites');
      } else if (error.response?.status === 404) {
        throw new Error('Event not found');
      }
    }

    throw error;
  }
};

/**
 * Get co-host invite details
 */
export const getCoHostInviteDetails = async (
  eventId: string,
  authToken: string
): Promise<{ status: boolean; message: string; data: any }> => {
  try {
    console.log(`Getting co-host invite details for event: ${eventId}`);

    const response = await axios.get(
      `${API_BASE_URL}/event/${eventId}/cohost-invite`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000
      }
    );

    console.log('Co-host invite details:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error getting co-host invite details for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Revoke co-host invite
 */
export const revokeCoHostInvite = async (
  eventId: string,
  invitationId: string,
  authToken: string
): Promise<{ status: boolean; message: string; data: any }> => {
  try {
    console.log(`Revoking co-host invite ${invitationId} for event: ${eventId}`);

    const response = await axios.delete(
      `${API_BASE_URL}/event/${eventId}/cohost-invite/${invitationId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000
      }
    );

    console.log('Co-host invite revoked:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error revoking co-host invite for event ${eventId}:`, error);
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
 * Manage co-host (remove, block, unblock)
 */
export const manageCoHost = async (
  eventId: string,
  userId: string,
  action: 'remove' | 'block' | 'unblock',
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