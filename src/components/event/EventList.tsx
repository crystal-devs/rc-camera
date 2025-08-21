// components/events/EventList.tsx

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  CalendarIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  CameraIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Event } from '@/types/events';

interface EventListProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
}

export const EventList = ({ events, onEventClick }: EventListProps) => {
  const router = useRouter();

  // Get event icon based on template
  const getEventIcon = (template?: string) => {
    switch (template) {
      case 'wedding': return <span className="text-2xl">💍</span>;
      case 'birthday': return <span className="text-2xl">🎂</span>;
      case 'concert': return <span className="text-2xl">🎵</span>;
      case 'corporate': return <span className="text-2xl">👔</span>;
      case 'vacation': return <span className="text-2xl">🏖️</span>;
      default: return <span className="text-2xl">📸</span>;
    }
  };

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onEventClick(event.id)}
        >
          <div className="flex-1 p-4 flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="font-medium line-clamp-1">{event.name}</h3>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/events/${event.id}`);
                  }}>
                    View Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/events/${event.id}/settings`);
                  }}>
                    Edit Event
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
              <div className="flex items-center">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {format(new Date(event.date), 'MMM d, yyyy')}
              </div>

              {event.location && (
                <div className="flex items-center">
                  <MapPinIcon className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[120px]">{event.location}</span>
                </div>
              )}

              <div className="flex items-center">
                <CameraIcon className="h-3 w-3 mr-1" />
                {event.photoCount ?? 0} photos
              </div>
            </div>

            {event.description && (
              <p className="text-xs text-gray-600 line-clamp-1 mt-1">{event.description}</p>
            )}

            <div className="mt-auto pt-2 flex justify-between items-center text-xs">
              <div>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {event.albumCount ?? 0} {event.albumCount === 1 ? 'album' : 'albums'}
                </span>
              </div>

              <div className="text-gray-500">
                {event.accessType === 'public' ? 'Public' : 'Restricted'} event
              </div>
            </div>
          </div>="relative h-24 w-24 sm:h-32 sm:w-32 flex-shrink-0">
            {event.cover_image ? (
              <Image
                src={event.cover_image}
                alt={event.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100">
                {getEventIcon(event.template)}
              </div>
            )}

            {!event.isActive && (
              <div className="absolute bottom-0 left-0 right-0 bg-gray-900/70 text-white text-xs py-0.5 text-center">
                Past
              </div>
            )}
          </div>

          <div className="absolute top-0 left-0 right-0 bg-gray-900/70 text-white text-xs py-0.5 text-center">
            {event.template}
          </div>
        </div>
      ))}
    </div>
  )
}}
