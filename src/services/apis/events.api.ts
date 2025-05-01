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
    cover_image: apiEvent.thumbnail_pic || undefined,
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
    const response = await axios.get(`${API_BASE_URL}/event/${eventId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.data && response.data.data) {
      return mapApiEventToEvent(response.data.data[0]);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
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

    const response = await axios.put(`${API_BASE_URL}/event/${eventId}`, apiEventData, {
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