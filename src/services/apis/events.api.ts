// services/apis/events.api.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { ApiEvent } from '@/types/events';
import { useStore } from '@/lib/store';
import { Event } from '@/types/backend-types/event.type';

export interface ApiEventResponse {
  status: boolean;
  code: number;
  message: string;
  data: Event | null;
  error: { message: string; stack?: string } | null;
  other: any;
}

// Map API response to frontend Event format
const mapApiEventToEvent = (apiEvent: ApiEvent): Event => {
  const startDate = new Date(apiEvent.start_date);
  // Check if end_date is in the future
  const isActive = apiEvent.end_date
    ? new Date(apiEvent.end_date) > new Date()
    : startDate > new Date();

  return {
    ...apiEvent,
  };
};

// Fetch all events for the authenticated user
export const fetchEvents = async (authToken: string): Promise<Event[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/event`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.data && response.data.data) {
      console.log(response.data.data, 'apiEventsapiEvents')
      const apiEvents: ApiEvent[] = response.data.data.events; // Adjusted to match the API response structure
      // return apiEvents.map(mapApiEventToEvent);
      return response.data.data.events ?? [] ;
    }

    return [];
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

// Get a single event by ID
export const getEventById = async (eventId: string, authToken: string): Promise<Event | null> => {
  try {
    console.log(`Fetching event details for ID: ${eventId}`);
    const url = `${API_BASE_URL}/event/${eventId}`;
    console.log(`Making API request to: ${url}`);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 10000 // 10 seconds timeout for better UX
    });

    console.log(`API response status: ${response.data}`);

    if (response.data && response.data.data) {
      console.log('Event data received:', response.data.data);
      return mapApiEventToEvent(response.data.data);
    }

    console.warn('No event data found in API response:', response.data);
    return null;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);

    if (axios.isAxiosError(error)) {
      // Log more details about the error
      if (error.code === 'ERR_NETWORK') {
        console.error('Network error - API server may be down or not accessible');
        console.error('API_BASE_URL:', API_BASE_URL);
        throw new Error(`Network Error: Cannot connect to server at ${API_BASE_URL}. Make sure your API server is running.`);
      }

      if (error.response) {
        console.error('API error status:', error.response.status);
        console.error('API error data:', error.response.data);

        if (error.response.status === 401 || error.response.status === 403) {
          throw new Error('Authentication error. Please log in again.');
        } else if (error.response.status === 404) {
          throw new Error('Event not found. It may have been deleted or is not accessible.');
        } else if (error.response.status >= 500) {
          throw new Error(`Server error (${error.response.status}). Please try again later.`);
        }
      }

      if (error.message && error.message.includes('timeout')) {
        throw new Error('Request timed out. The server may be overloaded or unresponsive.');
      }
    }

    // If we get here, rethrow with a generic message
    throw error;
  }
};

// Track ongoing creation requests to prevent duplicates
let createEventInProgress = false;

// Create a new event
export const createEvent = async (eventData: Partial<Event>, authToken: string): Promise<Event> => {
  if (createEventInProgress) {
    console.warn('Event creation already in progress, preventing duplicate creation');
    throw new Error('Event creation already in progress. Please wait for the current operation to complete.');
  }

  createEventInProgress = true;

  try {
    console.log('Sending event data to API:', eventData);

    const response = await axios.post<ApiEventResponse>(`${API_BASE_URL}/event`, eventData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 15000, // 15 seconds timeout
    });

    console.log('Event created response:', response.data);

    if (!response.data.status || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to create event');
    }

    // Refresh usage data
    try {
      const { fetchUsage } = useStore.getState();
      await fetchUsage();
    } catch (usageError) {
      console.error('Error refreshing usage after event creation:', usageError);
      // Continue even if usage refresh fails
    }

    return response.data.data; // Return the created event
  } catch (error) {
    console.error('Error creating event:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error response:', error.response.data);
      throw new Error(error.response.data.error?.message || 'Failed to create event');
    }
    throw error;
  } finally {
    createEventInProgress = false;
  }
};

// Track ongoing update requests
const updateEventInProgress = new Set<string>();

// Update an existing event
export const updateEvent = async (
  eventId: string,
  eventData: Partial<Event>,
  authToken: string
): Promise<Event> => {
  // Check if this event is already being updated
  if (updateEventInProgress.has(eventId)) {
    console.warn(`Update for event ${eventId} already in progress, preventing duplicate update`);
    throw new Error('Update already in progress. Please wait for the current operation to complete.');
  }

  updateEventInProgress.add(eventId);

  console.log(eventData, 'asdfasdfasdfasdf')
  try {
    // Transform frontend event format to API format
    const apiEventData = {
      ...eventData
    };

    console.log(`Updating event ${eventId} with data:`, apiEventData);

    const response = await axios.patch(`${API_BASE_URL}/event/${eventId}`, apiEventData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 15000 // Increase timeout to 15 seconds for more reliable updates
    });

    // so refresh usage data to be safe
    try {
      const { fetchUsage } = useStore.getState();
      await fetchUsage();
    } catch (usageError) {
      console.error('Error refreshing usage after event update:', usageError);
      // Continue even if usage refresh fails
    }

    const updatedEvent = mapApiEventToEvent(response.data.data);
    return updatedEvent;
  } catch (error) {
    console.error(`Error updating event ${eventId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error response:', error.response.data);
    }
    throw error;
  } finally {
    // Always remove the event from the in-progress set
    updateEventInProgress.delete(eventId);
  }
};

// Track ongoing delete requests
const deleteEventInProgress = new Set<string>();

// Delete an event
export const deleteEvent = async (eventId: string, authToken: string, retryCount = 0, maxRetries = 3): Promise<boolean> => {
  // Check if this event is already being deleted
  if (deleteEventInProgress.has(eventId)) {
    console.warn(`Deletion for event ${eventId} already in progress, preventing duplicate deletion`);
    throw new Error('Deletion already in progress. Please wait for the current operation to complete.');
  }

  deleteEventInProgress.add(eventId);

  try {
    console.log(`Deleting event ${eventId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    const response = await axios.delete(`${API_BASE_URL}/event/${eventId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 15000 // 15 seconds timeout
    });

    console.log(`Delete event response:`, response.data);

    // Refresh usage data to update event count
    try {
      const { fetchUsage } = useStore.getState();
      await fetchUsage();
    } catch (usageError) {
      console.error('Error refreshing usage after event deletion:', usageError);
      // Continue even if usage refresh fails
    }

    return true;
  } catch (error) {
    console.error(`Error deleting event ${eventId}:`, error);

    // Handle rate limiting (429) with exponential backoff retry logic
    if (axios.isAxiosError(error) && error.response?.status === 429 && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s, etc.
      console.log(`Rate limited. Retrying in ${delay}ms...`);

      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry the request with incremented retry count
      return deleteEvent(eventId, authToken, retryCount + 1, maxRetries);
    }

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Authentication error. Please log in again.');
      } else if (error.response?.status === 404) {
        throw new Error('Event not found. It may have been deleted already.');
      } else if (error.response && error.response.status >= 500) {
        throw new Error(`Server error (${error.response.status}). Please try again later.`);
      }
    }

    throw error;
  } finally {
    // Always remove the event from the in-progress set
    deleteEventInProgress.delete(eventId);
  }
};

// Track in-progress update guest operations to prevent duplicates
const updateGuestsInProgress = new Set<string>();

/**
 * Get the guest list for an event
 * @param eventId Event ID
 * @param authToken Authentication token
 * @returns Array of guest objects
 */
export const getEventGuests = async (eventId: string, authToken: string): Promise<any[]> => {
  try {
    console.log(`Fetching guest list for event: ${eventId}`);
    const url = `${API_BASE_URL}/event/${eventId}/guests`;
    console.log(`Making API request to: ${url}`);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 10000 // 10 seconds timeout for better UX
    });

    console.log(`API response status: ${response.status}`);

    if (response.data && Array.isArray(response.data.data)) {
      console.log('Guest data received:', response.data.data);
      return response.data.data;
    }

    console.warn('No guest data found in API response:', response.data);
    return [];
  } catch (error) {
    console.error(`Error fetching guests for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Update the invited guests for an event
 * @param eventId Event ID
 * @param invitedGuests Array of email addresses/usernames
 * @param authToken Authentication token
 * @returns Updated event object
 */
export const updateInvitedGuests = async (
  eventId: string,
  invitedGuests: string[],
  authToken: string
): Promise<Event | null> => {
  // Prevent duplicate updates
  if (updateGuestsInProgress.has(eventId)) {
    console.log(`Already updating guests for event ${eventId}, skipping duplicate request`);
    return null;
  }

  updateGuestsInProgress.add(eventId);

  try {
    console.log(`Updating invited guests for event: ${eventId}`, invitedGuests);
    const url = `${API_BASE_URL}/event/${eventId}/guests`;

    const response = await axios.post(url, {
      invited_guests: invitedGuests
    }, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 10000
    });

    console.log(`API response status: ${response.status}`);

    if (response.data && response.data.data) {
      // Fetch the updated event to ensure we have the latest data
      return await getEventById(eventId, authToken);
    }

    return null;
  } catch (error) {
    console.error(`Error updating invited guests for event ${eventId}:`, error);
    throw error;
  } finally {
    updateGuestsInProgress.delete(eventId);
  }
};

/**
 * Invite guests to an event by creating a share token with invited guests
 * @param eventId Event ID
 * @param guests Array of guest invite objects
 * @param accessType Type of access to grant ('contributor' or 'viewer')
 * @param authToken Authentication token
 * @returns Share token object
 */
export const inviteGuestsToEvent = async (
  eventId: string,
  guests: { email: string, name?: string }[],
  accessType: 'contributor' | 'viewer',
  authToken: string
): Promise<any> => {
  try {
    console.log(`Inviting guests to event: ${eventId}`, guests);

    // First, get existing share token to avoid creating duplicates
    let shareToken = null;
    let tokenUrl = `${API_BASE_URL}/share/event/${eventId}`;

    try {
      const tokenResponse = await axios.get(tokenUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        timeout: 10000
      });

      if (tokenResponse.data && tokenResponse.data.data) {
        // Handle both array and single object responses
        if (Array.isArray(tokenResponse.data.data)) {
          shareToken = tokenResponse.data.data.length > 0 ? tokenResponse.data.data[0] : null;
        } else {
          shareToken = tokenResponse.data.data;
        }
        console.log('Retrieved existing share token:', shareToken);
      }
    } catch (err) {
      console.log('No existing token found, will create a new one');
    }

    // Extract just the email addresses for the API request
    const guestEmails = guests.map(g => g.email);

    // Combine with existing guests if there's a token already
    let allGuests = guestEmails;
    if (shareToken && shareToken.invited_guests && Array.isArray(shareToken.invited_guests)) {
      // Deduplicate the guest list
      const existingGuests = shareToken.invited_guests;
      allGuests = [...new Set([...existingGuests, ...guestEmails])];
      console.log('Combined guest list:', allGuests);
    }

    const permissions = {
      canView: true,
      canUpload: accessType === 'contributor',
      canDownload: accessType === 'contributor'
    };

    // If we have an existing token, update it
    if (shareToken) {
      const updateUrl = `${API_BASE_URL}/share/token/${shareToken._id || shareToken.id}`;

      const response = await axios.patch(updateUrl, {
        invited_guests: allGuests,
        permissions: {
          view: permissions.canView,
          upload: permissions.canUpload,
          download: permissions.canDownload
        },
        is_restricted_to_guests: true
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        timeout: 10000
      });

      console.log('Updated share token:', response.data);
      return response.data.data;
    }

    // Otherwise create a new token
    const createUrl = `${API_BASE_URL}/share/event/${eventId}/invite`;
    const response = await axios.post(createUrl, {
      invited_guests: allGuests,
      permissions: {
        view: permissions.canView,
        upload: permissions.canUpload,
        download: permissions.canDownload
      },
      view_permission: permissions.canView,
      upload_permission: permissions.canUpload,
      download_permission: permissions.canDownload,
      is_restricted_to_guests: true,
      accessMode: 'invited_only'
    }, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 10000
    });

    console.log(`API response status: ${response.status}`);

    if (response.data && response.data.data) {
      console.log('Share token created with invited guests:', response.data.data);
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error(`Error inviting guests to event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Update the share token with the invited guests list
 * This function is meant to be called after updating an event to ensure
 * the share token has the correct guest list
 * 
 * @param eventId Event ID
 * @param invitedGuests Array of email addresses/usernames
 * @param authToken Authentication token
 * @returns Updated share token object
 */
export const updateShareTokenWithGuests = async (
  eventId: string,
  invitedGuests: string[],
  authToken: string
): Promise<any> => {
  try {
    console.log(`Updating share token for event ${eventId} with guests:`, invitedGuests);

    // First, try to get the existing share token
    const url = `${API_BASE_URL}/share/event/${eventId}`;
    let existingToken = null;

    try {
      const tokenResponse = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        timeout: 10000
      });

      if (tokenResponse.data && tokenResponse.data.data) {
        // Handle both single token and array responses
        if (Array.isArray(tokenResponse.data.data)) {
          existingToken = tokenResponse.data.data[0];
        } else {
          existingToken = tokenResponse.data.data;
        }
        console.log('Retrieved existing share token:', existingToken);
      }
    } catch (err) {
      console.log('No existing token found, will create a new one');
    }

    // If we have a token, update it; otherwise create a new one
    if (existingToken) {
      // Update the existing token with the new guest list
      const updateUrl = `${API_BASE_URL}/share/token/${existingToken._id || existingToken.id}`;

      const response = await axios.patch(updateUrl, {
        invited_guests: invitedGuests
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        timeout: 10000
      });

      console.log('Updated share token with guests:', response.data);
      return response.data.data;
    } else {
      // Create a new share token with the invited guests
      const createUrl = `${API_BASE_URL}/share/event/${eventId}`;

      const response = await axios.post(createUrl, {
        invited_guests: invitedGuests,
        permissions: {
          view: true,
          upload: true,
          download: true
        },
        is_restricted_to_guests: true
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        timeout: 10000
      });

      console.log('Created new share token with guests:', response.data);
      return response.data.data;
    }
  } catch (error) {
    console.error(`Error updating share token with guests for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Generate a shareable URL for an event
 * If the event has a share token, it will be included in the URL
 * 
 * @param eventId The event ID
 * @param shareToken Optional share token object or string
 * @param baseUrl Optional base URL (defaults to window.location.origin)
 * @returns The shareable URL
 */
export const getEventShareableUrl = (
  eventId: string,
  shareToken?: string | { token: string } | null,
  baseUrl?: string
): string => {
  // Default to window location if available, otherwise use a placeholder
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://app.example.com');

  // If we have a token, include it in the URL
  if (shareToken) {
    const tokenString = typeof shareToken === 'string' ? shareToken : shareToken.token;
    return `${base}/join/${tokenString}`;
  }

  // Otherwise, use the event ID
  return `${base}/join?event=${eventId}`;
};

/**
 * Manage guest access for an event
 * This function adds, removes, or updates guest access for an event
 * 
 * @param eventId Event ID
 * @param guestEmails List of guest emails to manage
 * @param action Action to perform ('add', 'remove', or 'update')
 * @param permissions Optional permissions to apply when adding or updating guests
 * @param authToken Authentication token
 * @returns Updated share token data
 */
export const manageEventGuests = async (
  eventId: string,
  guestEmails: string[],
  action: 'add' | 'remove' | 'update',
  permissions?: {
    canView?: boolean;
    canUpload?: boolean;
    canDownload?: boolean;
  },
  authToken?: string
): Promise<any> => {
  if (!authToken) {
    throw new Error('Authentication token is required');
  }

  try {
    console.log(`Managing guests for event ${eventId}, action: ${action}`, guestEmails);

    // First, get the current share token and guest list
    let shareToken = null;
    try {
      const tokenUrl = `${API_BASE_URL}/share/event/${eventId}`;
      const tokenResponse = await axios.get(tokenUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (tokenResponse.data && tokenResponse.data.data) {
        if (Array.isArray(tokenResponse.data.data)) {
          shareToken = tokenResponse.data.data.length > 0 ? tokenResponse.data.data[0] : null;
        } else {
          shareToken = tokenResponse.data.data;
        }
      }
    } catch (err) {
      console.log('No existing share token found');
    }

    let currentGuests: string[] = [];
    if (shareToken && shareToken.invited_guests && Array.isArray(shareToken.invited_guests)) {
      currentGuests = shareToken.invited_guests;
    }

    // Prepare the updated guest list based on the action
    let updatedGuests: string[] = [];

    if (action === 'add') {
      // Add new guests without duplicates
      updatedGuests = [...new Set([...currentGuests, ...guestEmails])];
    } else if (action === 'remove') {
      // Remove specified guests
      updatedGuests = currentGuests.filter(email => !guestEmails.includes(email));
    } else if (action === 'update') {
      // Replace the entire guest list
      updatedGuests = [...guestEmails];
    }

    // Default permissions if not provided
    const defaultPermissions = {
      canView: true,
      canUpload: false,
      canDownload: true
    };

    const finalPermissions = permissions || defaultPermissions;

    // If we have an existing token, update it
    if (shareToken) {
      const updateUrl = `${API_BASE_URL}/share/token/${shareToken._id || shareToken.id}`;

      const response = await axios.patch(updateUrl, {
        invited_guests: updatedGuests,
        permissions: {
          view: finalPermissions.canView !== false,
          upload: finalPermissions.canUpload === true,
          download: finalPermissions.canDownload !== false
        }
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      return response.data.data;
    }

    // If we don't have a token yet but need to add guests, create a new one
    if (updatedGuests.length > 0) {
      const createUrl = `${API_BASE_URL}/share/event/${eventId}`;

      const response = await axios.post(createUrl, {
        invited_guests: updatedGuests,
        permissions: {
          view: finalPermissions.canView !== false,
          upload: finalPermissions.canUpload === true,
          download: finalPermissions.canDownload !== false
        },
        is_restricted_to_guests: true
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error(`Error managing guests for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Add guests to an event
 * This function adds guests to an event and updates the share token
 * 
 * @param eventId Event ID
 * @param guestEmails List of guest emails to add
 * @param authToken Authentication token
 * @returns Updated share token data
 */
export const addGuests = async (
  eventId: string,
  guestEmails: string[],
  authToken: string
): Promise<any> => {
  if (!guestEmails || guestEmails.length === 0) {
    console.log('No guests to add');
    return null;
  }

  try {
    console.log(`Adding guests to event ${eventId}:`, guestEmails);

    // Deduplicate emails and normalize them (trim whitespace, convert to lowercase)
    const normalizedEmails = guestEmails
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0); // Filter out empty strings

    if (normalizedEmails.length === 0) {
      console.log('No valid emails to add after normalization');
      return null;
    }

    // Use the existing manageEventGuests function with 'add' action
    return await manageEventGuests(
      eventId,
      normalizedEmails,
      'add',
      {
        canView: true,
        canUpload: true,
        canDownload: true
      },
      authToken
    );
  } catch (error) {
    console.error(`Error adding guests to event ${eventId}:`, error);
    throw error;
  }
};