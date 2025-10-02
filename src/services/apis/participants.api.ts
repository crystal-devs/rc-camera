// services/apis/participants.api.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { setHeader } from '../common/api.fetch';

export interface UserInfo {
  name: string;
  email: string;
  profile_pic?: string;
}

export interface GuestInfo {
  name?: string;
  email?: string;
}

export interface InvitedBy {
  id: string;
  name: string;
  email: string;
}

export interface Permissions {
  can_view: boolean;
  can_upload: boolean;
  can_download: boolean;
  can_invite_others: boolean;
  can_moderate_content: boolean;
  can_manage_participants: boolean;
  can_edit_event: boolean;
  can_delete_event: boolean;
  can_transfer_ownership: boolean;
  can_approve_content: boolean;
  can_export_data: boolean;
  can_view_analytics: boolean;
  can_manage_settings: boolean;
}

export interface ParticipantStats {
  uploads_count: number;
  downloads_count: number;
  views_count: number;
  invites_sent: number;
  total_file_size_mb: number;
  last_upload_at: string | null;
  engagement_score: number;
}

export interface Participant {
  participant_id: string;
  user_id: string;
  guest_session_id: string | null;
  role: 'creator' | 'co_host' | 'viewer' | 'guest';
  status: 'active' | 'inactive' | 'pending' | 'removed';
  join_method: 'created_event' | 'co_host_invite' | 'guest_invite' | 'public_join';
  user_info: UserInfo | null;
  guest_info: GuestInfo | null;
  invited_by: InvitedBy | null;
  invited_at: string | null;
  joined_at: string | null;
  last_activity_at: string | null;
  removed_at: string | null;
  permissions: Permissions;
  stats: ParticipantStats;
}

export interface ParticipantsPagination {
  current_page: number;
  total_pages: number;
  total_count: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ParticipantsResponse {
  participants: Participant[];
  pagination: ParticipantsPagination;
  filters_applied: Record<string, any>;
}

export interface AggregatedStats {
  totalParticipants: number;
  activeParticipants: number;
  joinedParticipants: number;
  pendingInvites: number;
  creatorCount: number;
  coHostCount: number;
  viewerCount: number;
  guestCount: number;
  totalUploads: number;
  totalDownloads: number;
  totalViews: number;
  averageEngagementScore: number;
  participationRate: number;
}

export interface ParticipantFilters {
  role?: 'creator' | 'co_host' | 'viewer' | 'guest' | 'all';
  status?: 'active' | 'inactive' | 'pending' | 'removed' | 'all';
  join_method?: 'created_event' | 'co_host_invite' | 'guest_invite' | 'public_join' | 'all';
  search?: string;
  sort_by?: 'name' | 'joined_at' | 'last_activity_at' | 'uploads_count' | 'engagement_score';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface InviteParticipantRequest {
  email: string;
  name?: string;
  role: 'co_host' | 'viewer';
  send_email?: boolean;
  custom_message?: string;
}

/**
 * Get event participants with filtering and pagination
 */
export const getEventParticipants = async (
  eventId: string,
  filters: ParticipantFilters = {},
  authToken: string
): Promise<ParticipantsResponse & { stats: AggregatedStats }> => {
  try {
    console.log(`Fetching participants for event: ${eventId}`, filters);
    
    const params = new URLSearchParams();
    
    // Add filter parameters
    if (filters.role && filters.role !== 'all') params.append('role', filters.role);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.join_method && filters.join_method !== 'all') params.append('join_method', filters.join_method);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const url = `${API_BASE_URL}/event/${eventId}/participants?${params.toString()}`;
    console.log(`Making API request to: ${url}`);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 10000,
    });

    console.log('Participants API response:', response.data);

    if (response.data && response.data.data) {
      const data = response.data.data;
      
      // Calculate aggregated stats from participants
      const stats = calculateAggregatedStats(data.participants || []);

      return {
        participants: data.participants || [],
        pagination: data.pagination || {
          current_page: 1,
          total_pages: 1,
          total_count: 0,
          has_next: false,
          has_prev: false,
        },
        filters_applied: data.filters_applied || {},
        stats,
      };
    }

    // Return empty response if no data
    return {
      participants: [],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_count: 0,
        has_next: false,
        has_prev: false,
      },
      filters_applied: {},
      stats: {
        totalParticipants: 0,
        activeParticipants: 0,
        joinedParticipants: 0,
        pendingInvites: 0,
        creatorCount: 0,
        coHostCount: 0,
        viewerCount: 0,
        guestCount: 0,
        totalUploads: 0,
        totalDownloads: 0,
        totalViews: 0,
        averageEngagementScore: 0,
        participationRate: 0,
      },
    };
  } catch (error) {
    console.error(`Error fetching participants for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Get participant statistics for an event
 */
export const getParticipantStats = async (
  eventId: string,
  authToken: string
): Promise<AggregatedStats> => {
  try {
    console.log(`Fetching participant stats for event: ${eventId}`);
    
    // Use the participants endpoint but request stats only
    const url = `${API_BASE_URL}/event/${eventId}/participants?stats_only=true`;
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 5000,
    });

    if (response.data && response.data.data && response.data.data.stats) {
      return response.data.data.stats;
    }

    // Fallback: get full participant data and calculate stats
    const fullData = await getEventParticipants(eventId, {}, authToken);
    return fullData.stats;
  } catch (error) {
    console.error(`Error fetching participant stats for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Invite participants to an event
 */
export const inviteParticipants = async (
  eventId: string,
  invites: InviteParticipantRequest[],
  authToken: string
): Promise<{ success: boolean; invitedCount: number; errors?: string[] }> => {
  try {
    console.log(`Inviting participants to event: ${eventId}`, invites);
    
    const url = `${API_BASE_URL}/event/${eventId}/participants/invite`;
    
    const response = await axios.post(url, {
      invites,
      send_emails: true,
    }, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 15000,
    });

    console.log('Invite participants response:', response.data);

    if (response.data && response.data.data) {
      return {
        success: true,
        invitedCount: response.data.data.invitedCount || invites.length,
        errors: response.data.data.errors || [],
      };
    }

    return {
      success: false,
      invitedCount: 0,
      errors: ['Unknown error occurred'],
    };
  } catch (error) {
    console.error(`Error inviting participants to event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Update participant permissions/role
 */
export const updateParticipant = async (
  eventId: string,
  participantId: string,
  updates: {
    role?: 'co_host' | 'viewer';
    permissions?: Partial<Permissions>;
    status?: 'active' | 'inactive' | 'pending' | 'removed';
  },
  authToken: string
): Promise<Participant> => {
  try {
    console.log(`Updating participant ${participantId} in event ${eventId}:`, updates);
    
    const url = `${API_BASE_URL}/event/${eventId}/participants/${participantId}`;
    
    const response = await axios.patch(url, updates, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 10000,
    });

    console.log('Update participant response:', response.data);

    if (response.data && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to update participant');
  } catch (error) {
    console.error(`Error updating participant ${participantId}:`, error);
    throw error;
  }
};

/**
 * Remove participant from an event
 */
export const removeParticipant = async (
  eventId: string,
  participantId: string,
  authToken: string
): Promise<boolean> => {
  try {
    console.log(`Removing participant ${participantId} from event ${eventId}`);
    
    const url = `${API_BASE_URL}/event/${eventId}/participants/${participantId}`;
    
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 10000,
    });

    console.log('Remove participant response:', response.data);
    return true;
  } catch (error) {
    console.error(`Error removing participant ${participantId}:`, error);
    throw error;
  }
};

/**
 * Calculate aggregated statistics from participant array
 */
const calculateAggregatedStats = (participants: Participant[]): AggregatedStats => {
  const stats: AggregatedStats = {
    totalParticipants: participants.length,
    activeParticipants: participants.filter(p => p.status === 'active').length,
    joinedParticipants: participants.filter(p => p.joined_at !== null).length,
    pendingInvites: participants.filter(p => p.status === 'pending').length,
    creatorCount: participants.filter(p => p.role === 'creator').length,
    coHostCount: participants.filter(p => p.role === 'co_host').length,
    viewerCount: participants.filter(p => p.role === 'viewer').length,
    guestCount: participants.filter(p => p.role === 'guest').length,
    totalUploads: participants.reduce((sum, p) => sum + p.stats.uploads_count, 0),
    totalDownloads: participants.reduce((sum, p) => sum + p.stats.downloads_count, 0),
    totalViews: participants.reduce((sum, p) => sum + p.stats.views_count, 0),
    averageEngagementScore: 0,
    participationRate: 0,
  };

  // Calculate average engagement score
  if (stats.activeParticipants > 0) {
    const totalEngagement = participants
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.stats.engagement_score, 0);
    stats.averageEngagementScore = Math.round((totalEngagement / stats.activeParticipants) * 100) / 100;
  }

  // Calculate participation rate
  if (stats.totalParticipants > 0) {
    stats.participationRate = Math.round((stats.joinedParticipants / stats.totalParticipants) * 100);
  }

  return stats;
};