// lib/event-mappers.ts

import { ApiEvent, Event } from "@/types/events";


// Convert API event to frontend event format
export const mapApiEventToEvent = (apiEvent: ApiEvent): Event => {
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
    photoCount: 0,  // Default values that can be updated if needed
    albumCount: 0
  };
};