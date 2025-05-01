// components/events/EventGrid.tsx

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  CalendarIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  Images
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Event } from '@/types/events';

interface EventGridProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
}

export const EventGrid = ({ events, onEventClick }: EventGridProps) => {
  const router = useRouter();

  // Get event icon based on template
  const getEventIcon = (template?: string) => {
    switch (template) {
      case 'wedding': return <span className="text-4xl">💍</span>;
      case 'birthday': return <span className="text-4xl">🎂</span>;
      case 'concert': return <span className="text-4xl">🎵</span>;
      case 'corporate': return <span className="text-4xl">👔</span>;
      case 'vacation': return <span className="text-4xl">🏖️</span>;
      default: return <span className="text-4xl">📸</span>;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="relative rounded-xl overflow-hidden cursor-pointer h-48 md:h-52 shadow-sm hover:shadow-md transition-shadow"
          onClick={() => onEventClick(event.id)}
        >
          {/* Card Background Image */}
          <div className="absolute inset-0">
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

            {/* Gradient Overlay for Text Visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          </div>

          {/* Top Actions Row */}
          <div className="absolute top-2 flex justify-between w-full px-2 z-10">
            {/* Photo Count */}
            <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full py-1 px-2 text-white text-xs">
              <Images className="h-3 w-3" />
              <span>{event.photoCount ?? 0}</span>
            </div>
          </div>

          {/* Menu (More Options) */}
          <div className="absolute top-2 right-2 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/30 backdrop-blur-sm hover:bg-white/50 text-white">
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
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/events/${event.id}/edit`);
                  }}
                >
                  Edit Event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Past Event Indicator */}
          {!event.isActive && (
            <div className="absolute top-2 left-2 bg-gray-900/70 text-white text-xs py-1 px-2 rounded-full">
              Past Event
            </div>
          )}

          {/* Bottom Text Content */}
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white z-10">
            <h3 className="font-medium text-lg line-clamp-1">{event.name}</h3>
            <div className="flex items-center text-sm">
              <CalendarIcon className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              {format(new Date(event.date), 'MMM d, yyyy')}
            </div>
            {event.location && (
              <div className="flex items-center text-sm">
                <MapPinIcon className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};