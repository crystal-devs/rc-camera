// components/event/EventHeader.tsx - Clean version
'use client';
import React from 'react';
import { Calendar, MapPin, Users, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventDetails } from '@/types/events';

interface EventHeaderProps {
  eventDetails: EventDetails | null;
  photosCount: number;
  loading: boolean;
  onDownloadAll?: () => void;
}

export const EventHeader: React.FC<EventHeaderProps> = ({
  eventDetails,
  photosCount,
  loading,
  onDownloadAll
}) => {
  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {eventDetails?.title || 'Event Photos'}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              {eventDetails?.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(eventDetails.start_date).toLocaleDateString()}
                </span>
              )}
              {eventDetails?.location?.name && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {eventDetails.location.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {loading ? 'Loading...' : `${photosCount} photos`}
              </span>
            </div>
          </div>
          
          {eventDetails?.permissions?.can_download && photosCount > 0 && (
            <Button
              variant="outline"
              onClick={onDownloadAll}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download All
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};