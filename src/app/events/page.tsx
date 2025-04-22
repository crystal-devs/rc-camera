// app/events/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  CalendarIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  Filter,
  MoreHorizontalIcon,
  ArrowUpDown,
  CameraIcon,
  UsersIcon,
  HeartIcon,
  Images
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/db';
import { toast } from "sonner"

interface Event {
  id: string;
  name: string;
  description?: string;
  date: Date;
  endDate?: Date;
  location?: string;
  coverImage?: string;
  createdAt: Date;
  createdById: number;
  accessType: 'public' | 'restricted';
  accessCode?: string;
  template?: string;
  isActive: boolean;
  photoCount?: number;
  albumCount?: number;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'past'>('all');
  const [activeTab, setActiveTab] = useState<'grid' | 'list'>('grid');

  // User ID would come from auth in a real app
  const userId = 1;

  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Get all events for this user
        let allEvents = await db.events
          .where('createdById')
          .equals(userId)
          .toArray();

        // Add photo and album counts
        const eventsWithCounts = await Promise.all(
          allEvents.map(async (event) => {
            // Get albums for this event
            const albums = await db.albums
              .where('eventId')
              .equals(event.id)
              .toArray();

            // Get total photo count across all albums
            let totalPhotos = 0;
            for (const album of albums) {
              const photoCount = await db.photos
                .where('albumId')
                .equals(album.id)
                .count();

              totalPhotos += photoCount;
            }

            return {
              ...event,
              albumCount: albums.length,
              photoCount: totalPhotos
            };
          })
        );

        setEvents(eventsWithCounts);
      } catch (error) {
        console.error('Error loading events:', error);
        toast.error("Failed to load your events. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [userId, toast]);

  // Filter and sort events
  const filteredAndSortedEvents = events
    .filter(event => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          event.name.toLowerCase().includes(query) ||
          (event.description && event.description.toLowerCase().includes(query)) ||
          (event.location && event.location.toLowerCase().includes(query))
        );
      }

      // Filter by type
      if (filterType === 'active') {
        return event.isActive;
      } else if (filterType === 'past') {
        return !event.isActive;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by selected order
      switch (sortOrder) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

  const navigateToEvent = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  const createNewEvent = () => {
    router.push('/events/create');
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Events</h1>
          <p className="text-gray-500">
            Manage and organize your photo collections
          </p>
        </div>

        <Button
          onClick={createNewEvent}
          className="mt-4 md:mt-0"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create New Event
        </Button>
      </div>

      {/* Single line filter controls that work on all screen sizes */}
      <div className="flex items-center gap-2 mb-6">
        {/* Search Input - Flexible width */}
        <div className="relative flex-1 min-w-0">
          <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(value: 'all' | 'active' | 'past') => setFilterType(value)}
        >
          <SelectTrigger className="w-10 sm:w-24 h-9 px-2 hide-chevron-mobile">
            <Filter className="h-4 w-4" />
            <SelectValue className="hidden sm:block" placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="active">Active Events</SelectItem>
            <SelectItem value="past">Past Events</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Dropdown - Fixed compact width with hidden arrow on mobile */}
        <Select
          value={sortOrder}
          onValueChange={(value: 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc') => setSortOrder(value)}
        >
          <SelectTrigger className="w-10 sm:w-24 h-9 px-2 hide-chevron-mobile">
            <ArrowUpDown className="h-4 w-4" />
            <SelectValue className="hidden sm:block" placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle - Always visible */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'grid' | 'list')}
          className="hidden md:flex"
        >
          <TabsList className="h-9">
            <TabsTrigger value="grid" className="px-2 h-7">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-grid">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </TabsTrigger>
            <TabsTrigger value="list" className="px-2 h-7">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list">
                <line x1="8" x2="21" y1="6" y2="6" />
                <line x1="8" x2="21" y1="12" y2="12" />
                <line x1="8" x2="21" y1="18" y2="18" />
                <line x1="3" x2="3.01" y1="6" y2="6" />
                <line x1="3" x2="3.01" y1="12" y2="12" />
                <line x1="3" x2="3.01" y1="18" y2="18" />
              </svg>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        activeTab === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        )
      ) : filteredAndSortedEvents.length === 0 ? (
        searchQuery || filterType !== 'all' ? (
          // No results from search or filter
          <div className="text-center py-12">
            <div className="bg-gray-100 mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <SearchIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No events found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              We couldn't find any events matching your search criteria. Try adjusting your filters or search terms.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          // No events at all
          <div className="text-center py-12">
            <div className="bg-gray-100 mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No events yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              You haven't created any events yet. Create your first event to start collecting photos!
            </p>
            <Button onClick={createNewEvent}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First Event
            </Button>
          </div>
        )
      ) : (
        activeTab === 'grid' ? (
          // Grid view
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredAndSortedEvents.map((event) => (
              <div
                key={event.id}
                className="relative rounded-xl overflow-hidden cursor-pointer h-48 md:h-52 shadow-sm hover:shadow-md transition-shadow"
                onClick={() => navigateToEvent(event.id)}
              >
                {/* Card Background Image */}
                <div className="absolute inset-0">
                  {event.coverImage ? (
                    <Image
                      src={event.coverImage}
                      alt={event.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      {event.template === 'wedding' && <span className="text-4xl">💍</span>}
                      {event.template === 'birthday' && <span className="text-4xl">🎂</span>}
                      {event.template === 'concert' && <span className="text-4xl">🎵</span>}
                      {event.template === 'corporate' && <span className="text-4xl">👔</span>}
                      {event.template === 'vacation' && <span className="text-4xl">🏖️</span>}
                      {(!event.template || event.template === 'custom') && <span className="text-4xl">📸</span>}
                    </div>
                  )}

                  {/* Gradient Overlay for Text Visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                </div>

                {/* Top Actions Row */}
                <div className="absolute top-2 flex justify-between w-full px-2 z-10">
                  {/* Heart/Favorite Button */}
                  {/* <button className="h-8 w-8 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-white/50 text-white transition-colors">
                    <HeartIcon className="h-4 w-4" />
                  </button> */}

                  {/* Photo Count */}
                  <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full py-1 px-2 text-white text-xs">
                    <Images className="h-3 w-3" />
                    <span>{event.photoCount}</span>
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
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/events/${event.id}/edit`);
                      }}>
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
        ) : (
          // List view
          <div className="space-y-3">
            {filteredAndSortedEvents.map((event) => (
              <div
                key={event.id}
                className="flex border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigateToEvent(event.id)}
              >
                <div className="relative h-24 w-24 sm:h-32 sm:w-32 flex-shrink-0">
                  {event.coverImage ? (
                    <Image
                      src={event.coverImage}
                      alt={event.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      {event.template === 'wedding' && <span className="text-2xl">💍</span>}
                      {event.template === 'birthday' && <span className="text-2xl">🎂</span>}
                      {event.template === 'concert' && <span className="text-2xl">🎵</span>}
                      {event.template === 'corporate' && <span className="text-2xl">👔</span>}
                      {event.template === 'vacation' && <span className="text-2xl">🏖️</span>}
                      {(!event.template || event.template === 'custom') && <span className="text-2xl">📸</span>}
                    </div>
                  )}

                  {!event.isActive && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/70 text-white text-xs py-0.5 text-center">
                      Past
                    </div>
                  )}
                </div>

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
                          router.push(`/events/${event.id}/edit`);
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
                      {event.photoCount} photos
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-xs text-gray-600 line-clamp-1 mt-1">{event.description}</p>
                  )}

                  <div className="mt-auto pt-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {event.albumCount} {event.albumCount === 1 ? 'album' : 'albums'}
                      </span>
                    </div>

                    <div className="text-gray-500">
                      {event.accessType === 'public' ? 'Public' : 'Restricted'} event
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}