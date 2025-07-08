// ================================================================
// Updated services/apis/sharing.api.ts
// ================================================================

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

export interface ShareToken {
  _id: string;
  token: string;
  eventId: string;
  albumId?: string;
  tokenType: 'invite' | 'view_only' | 'collaborate';
  name?: string;
  description?: string;
  permissions: {
    view: boolean;
    upload: boolean;
    download: boolean;
    share: boolean;
    comment: boolean;
  };
  restrictions: {
    maxUses?: number;
    expiresAt?: Date;
    allowedEmails: string[];
    requiresApproval: boolean;
  };
  usage: {
    count: number;
    lastUsedAt?: Date;
  };
  createdBy: string;
  createdAt: Date;
  revoked: boolean;
}

export interface Participant {
  id: string;
  eventId: string;
  userId?: string;
  identity: {
    email: string;
    name: string;
    avatarUrl?: string;
    isRegisteredUser: boolean;
    isAnonymous: boolean;
  };
  participation: {
    status: 'invited' | 'pending' | 'active' | 'inactive' | 'removed' | 'banned' | 'declined';
    role: 'owner' | 'co_host' | 'moderator' | 'guest' | 'viewer';
    invitedAt?: Date;
    joinedAt?: Date;
    lastSeenAt?: Date;
  };
  permissions: {
    view: { enabled: boolean; albums: string[] };
    upload: { enabled: boolean; albums: string[] };
    download: { enabled: boolean; albums: string[] };
    comment: { enabled: boolean };
    share: { enabled: boolean };
    moderate: {
      canApproveContent: boolean;
      canRemoveContent: boolean;
      canManageGuests: boolean;
    };
  };
  invitedBy?: string;
  shareTokenUsed?: string;
}

// ============= SHARE TOKEN MANAGEMENT =============

export const createShareToken = async (
  eventId: string,
  tokenData: {
    tokenType?: 'invite' | 'view_only' | 'collaborate';
    name?: string;
    description?: string;
    permissions?: Partial<ShareToken['permissions']>;
    restrictions?: Partial<ShareToken['restrictions']>;
    albumId?: string;
  },
  authToken: string
): Promise<ShareToken> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/token/event/${eventId}/tokens`,
      {
        token_type: tokenData.tokenType || 'invite',
        name: tokenData.name,
        description: tokenData.description,
        permissions: {
          view: true,
          upload: false,
          download: false,
          share: false,
          comment: true,
          ...tokenData.permissions
        },
        restrictions: {
          max_uses: null,
          expires_at: null,
          allowed_emails: [],
          requires_approval: false,
          ...tokenData.restrictions
        },
        album_id: tokenData.albumId
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.status) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to create share token');
    }
  } catch (error) {
    console.error('Error creating share token:', error);
    throw error;
  }
};

export const getEventShareTokens = async (
  eventId: string,
  authToken: string,
  filters?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }
): Promise<{ tokens: ShareToken[]; pagination: any }> => {
  try {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);

    const response = await axios.get(
      `${API_BASE_URL}/event/${eventId}/tokens?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    if (response.data?.status) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to fetch share tokens');
    }
  } catch (error) {
    console.error('Error fetching share tokens:', error);
    throw error;
  }
};

export const updateShareToken = async (
  eventId: string,
  tokenId: string,
  updateData: Partial<ShareToken>,
  authToken: string
): Promise<ShareToken> => {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/event/${eventId}/tokens/${tokenId}`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.status) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to update share token');
    }
  } catch (error) {
    console.error('Error updating share token:', error);
    throw error;
  }
};

export const revokeShareToken = async (
  eventId: string,
  tokenId: string,
  reason: string,
  authToken: string
): Promise<boolean> => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/event/${eventId}/tokens/${tokenId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        data: { reason }
      }
    );

    return response.data?.status || false;
  } catch (error) {
    console.error('Error revoking share token:', error);
    return false;
  }
};

// ============= PARTICIPANT MANAGEMENT =============

export const inviteParticipants = async (
  eventId: string,
  inviteData: {
    participants: Array<{
      email: string;
      name: string;
      role?: string;
      permissions?: any;
    }>;
    message?: string;
    sendImmediately?: boolean;
    defaultRole?: string;
    customPermissions?: any;
  },
  authToken: string
): Promise<{
  invited: Participant[];
  skippedExisting: number;
  shareToken: string;
  invitationLink: string;
}> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/event/${eventId}/participants/invite`,
      inviteData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.status) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to invite participants');
    }
  } catch (error) {
    console.error('Error inviting participants:', error);
    throw error;
  }
};

export const getEventParticipants = async (
  eventId: string,
  authToken: string,
  filters?: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
    search?: string;
  }
): Promise<{
  participants: Participant[];
  pagination: any;
  stats: any;
}> => {
  try {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.role) params.append('role', filters.role);
    if (filters?.search) params.append('search', filters.search);

    const response = await axios.get(
      `${API_BASE_URL}/event/${eventId}/participants?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    if (response.data?.status) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to fetch participants');
    }
  } catch (error) {
    console.error('Error fetching participants:', error);
    throw error;
  }
};

export const updateParticipant = async (
  eventId: string,
  participantId: string,
  updateData: {
    permissions?: any;
    role?: string;
    status?: string;
  },
  authToken: string
): Promise<Participant> => {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/event/${eventId}/participants/${participantId}`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.status) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to update participant');
    }
  } catch (error) {
    console.error('Error updating participant:', error);
    throw error;
  }
};

export const removeParticipant = async (
  eventId: string,
  participantId: string,
  reason: string,
  authToken: string
): Promise<boolean> => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/event/${eventId}/participants/${participantId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        data: { reason }
      }
    );

    return response.data?.status || false;
  } catch (error) {
    console.error('Error removing participant:', error);
    return false;
  }
};

// ============= PUBLIC TOKEN ACCESS =============

export const getTokenInfo = async (token: string): Promise<{
  invitation_link: string;
  token: any;
}> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/token/${token}`);

    if (response.data?.status) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Invalid token');
    }
  } catch (error) {
    console.error('Error getting token info:', error);
    throw error;
  }
};

export const joinEventViaToken = async (
  token: string,
  guestInfo: {
    name: string;
    email: string;
    avatarUrl?: string;
  },
  userId?: string
): Promise<{
  participant: Participant;
  eventId: string;
  requiresApproval: boolean;
  redirectUrl: string;
}> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/share/join/${token}`,
      {
        guest_info: {
          name: guestInfo.name,
          email: guestInfo.email,
          avatar_url: guestInfo.avatarUrl || '',
          is_anonymous: !userId
        },
        user_id: userId
      }
    );

    if (response.data?.status) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to join event');
    }
  } catch (error) {
    console.error('Error joining event via token:', error);
    throw error;
  }
};
