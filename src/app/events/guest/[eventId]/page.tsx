'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use } from 'react';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  QrCodeIcon,
  ShareIcon,
  CameraIcon,
  FolderIcon,
  UserIcon,
  LogInIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import PhotoGallery from '@/components/album/PhotoGallery';
import { Event } from '@/types/events';
import { toast } from 'sonner';
import { getEventByShareToken } from '@/services/apis/sharing.api';

export default function GuestEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const shareToken = searchParams.get('token');
  
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');

  useEffect(() => {
    const loadEvent = async () => {
      if (!shareToken) {
        toast.error("Invalid share link");
        router.push('/');
        return;
      }

      try {
        console.log(`Loading event data for ID: ${eventId} with share token`);
        
        // Use the share token to fetch the event (guest access)
        const eventData = await getEventByShareToken(shareToken);
        
        if (eventData) {
          console.log('Event data fetched successfully via share token:', eventData.name);
          setEvent(eventData as Event);
        } else {
          console.error('No event data returned from API');
          toast.error("Event not found. It may have been deleted or the share link has expired.");
        }
      } catch (error) {
        console.error('Error loading event with share token:', error);
        toast.error("Unable to access event. The share link may be invalid or expired.");
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [eventId, shareToken, router]);

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/join?token=${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="h-64 w-full" />
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-2/3 mt-6 mb-2" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          <Skeleton className="h-10 w-full mb-6" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-2 py-8 sm:px-4 sm:py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
        <p className="text-gray-500 mb-6">
          This shared content is no longer available or the link has expired.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => router.push('/')}>Go Home</Button>
          <Button variant="outline" onClick={() => router.push('/login')}>
            <LogInIcon className="h-4 w-4 mr-2" />
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 sm:pb-20">
      {/* Header with Guest Banner */}
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container mx-auto px-2 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium">{event.name}</h1>
              <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
              <LogInIcon className="h-4 w-4 mr-2" />
              Log In
            </Button>
          </div>
          <div className="bg-yellow-50 text-yellow-800 text-xs px-2 py-1 mt-2 rounded-md">
            <p className="flex items-center">
              <UserIcon className="h-3 w-3 mr-1" />
              You're viewing as a guest
            </p>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      {event.cover_image && (
        <div className="w-full h-40 sm:h-56 overflow-hidden relative">
          <img
            src={event.cover_image}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      <div className="mx-auto px-2 py-4 sm:px-2 sm:py-2">
        {/* Event Info */}
        <div className="flex flex-wrap gap-3 mb-4 sm:mb-6">
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-1.5" />
            {new Date(event.date).toLocaleDateString()}
          </div>

          {event.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPinIcon className="h-4 w-4 mr-1.5" />
              {event.location}
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-gray-700 mb-4 sm:mb-6">{event.description}</p>
        )}

        {/* Share Button */}
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
          <Button variant="outline" className="sm:flex items-center" onClick={copyShareLink}>
            <ShareIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>

        {/* Photos Tab */}
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-4">Photos</h2>
          <PhotoGallery
            eventId={eventId}
            albumId={null}
            canUpload={false}
            guestToken={shareToken || undefined}
          />
        </div>
      </div>
    </div>
  );
}
