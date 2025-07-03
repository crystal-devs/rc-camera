// services/apis/events.api.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { Event, ApiEvent } from '@/types/events';

// Map API response to frontend Event format
const mapApiEventToEvent = (apiEvent: ApiEvent): Event => {
  const startDate = new Date(apiEvent.start_date);
  // Check if end_date is in the future
  const isActive = apiEvent.end_date
    ? new Date(apiEvent.end_date) > new Date()
    : startDate > new Date();

  return {
    id: apiEvent._id,
    name: apiEvent.title,
    description: apiEvent.description,
    date: startDate,
    endDate: apiEvent.end_date ? new Date(apiEvent.end_date) : undefined,
    location: apiEvent.location,
    cover_image: apiEvent.cover_image || undefined,
    createdAt: new Date(apiEvent.created_at),
    createdById: apiEvent.created_by,
    accessType: apiEvent.is_private ? 'restricted' : 'public',
    accessCode: apiEvent.access_code,
    template: apiEvent.template || 'custom',
    isActive,
    photoCount: 0,  // Will be populated later if available
    albumCount: 0   // Will be populated later if available
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
      const apiEvents: ApiEvent[] = response.data.data;
      return apiEvents.map(mapApiEventToEvent);
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

    console.log(`API response status: ${response.status}`);

    if (response.data && response.data.data) {
      console.log('Event data received:', response.data.data);
      return mapApiEventToEvent(response.data.data[0]);
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

// Create a new event
export const createEvent = async (eventData: Partial<Event>, authToken: string): Promise<Event> => {
  try {
    // Transform frontend event format to API format - based on backend requirements
    const apiEventData = {
      title: eventData.name,
      description: eventData.description || '',
      start_date: eventData.date?.toISOString(),
      end_date: eventData.endDate?.toISOString() || null,
      is_private: eventData.accessType === 'restricted',
      location: eventData.location || '',
      cover_image: eventData.cover_image || '',
      access_code: eventData.accessCode || '',
      template: eventData.template || 'custom'
    };

    console.log('Sending event data to API:', apiEventData);

    const response = await axios.post(`${API_BASE_URL}/event`, apiEventData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log('Event created response:', response.data);
    return mapApiEventToEvent(response.data.data);
  } catch (error) {
    console.error('Error creating event:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error response:', error.response.data);
    }
    throw error;
  }
};

// Update an existing event
export const updateEvent = async (
  eventId: string, 
  eventData: Partial<Event>, 
  authToken: string
): Promise<Event> => {
  try {
    // Transform frontend event format to API format
    const apiEventData = {
      title: eventData.name,
      description: eventData.description || '',
      start_date: eventData.date?.toISOString(),
      end_date: eventData.endDate?.toISOString() || null,
      location: eventData.location || '',
      thumbnail_pic: eventData.cover_image || '',
      is_private: eventData.accessType === 'restricted',
      access_code: eventData.accessCode || '',
      template: eventData.template || 'custom'
    };

    const response = await axios.patch(`${API_BASE_URL}/event/${eventId}`, apiEventData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    return mapApiEventToEvent(response.data.data);
  } catch (error) {
    console.error(`Error updating event ${eventId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error response:', error.response.data);
    }
    throw error;
  }
};

// Delete an event
export const deleteEvent = async (eventId: string, authToken: string): Promise<boolean> => {
  try {
    await axios.delete(`${API_BASE_URL}/event/${eventId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return true;
  } catch (error) {
    console.error(`Error deleting event ${eventId}:`, error);
    throw error;
  }
};