'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar } from 'lucide-react';
import { getEventById } from '@/services/apis/events.api';
import { useAuthToken } from '@/hooks/use-auth';
import { toast } from "sonner";

export default function JoinEventPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');
  const accessCode = searchParams.get('code');
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const token = useAuthToken();

  useEffect(() => {
    const findEvent = async () => {
      if (!eventId) {
        setError('No event ID provided');
        setLoading(false);
        return;
      }

      try {
        const authToken = token || localStorage.getItem('authToken');
        
        if (!authToken) {
          // Store intended destination for post-login redirect
          localStorage.setItem('redirectAfterLogin', window.location.href);
          router.push('/login');
          return;
        }
        
        // Try to fetch the event
        const eventData = await getEventById(eventId, authToken);
        
        if (!eventData) {
          setError('Event not found');
        } else {
          setEvent(eventData);
          
          // If the event is public or the user already has access, redirect to event page
          if (eventData.accessType === 'public' || 
             (eventData.accessType === 'restricted' && accessCode === eventData.accessCode)) {
            router.push(`/events/${eventId}`);
            return;
          } 
          // If the event is restricted but no code or incorrect code provided
          else if (eventData.accessType === 'restricted' && 
                  (!accessCode || accessCode !== eventData.accessCode)) {
            setError('Invalid access code for this event');
          }
        }
      } catch (error) {
        console.error('Error finding event:', error);
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    findEvent();
  }, [eventId, accessCode, router, token]);

  const joinEvent = async () => {
    if (!event || !eventId) return;
    
    setJoining(true);
    
    try {
      // If this is a restricted event, verify the access code
      if (event.accessType === 'restricted' && accessCode !== event.accessCode) {
        setError('Invalid access code');
        setJoining(false);
        return;
      }

      // No need to create an access record - the backend will handle this
      // Just redirect to the event page
      router.push(`/events/${eventId}`);
    } catch (error) {
      console.error('Error joining event:', error);
      setJoining(false);
      setError('Failed to join event');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Access Error</CardTitle>
            <CardDescription>There was a problem accessing this event</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => router.push('/events')}
              className="w-full"
            >
              Back to Events
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Join Event</CardTitle>
          <CardDescription>You've been invited to join this event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full mr-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{event.name}</h3>
              <p className="text-gray-500 text-sm">{new Date(event.date).toLocaleDateString()}</p>
            </div>
          </div>
          
          {event.description && (
            <p className="text-gray-700 text-sm mb-4">{event.description}</p>
          )}
          
          {event.accessType === 'restricted' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              This is a restricted event. The access code has been verified.
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={joinEvent} 
            disabled={joining} 
            className="w-full"
          >
            {joining ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {joining ? 'Joining...' : 'Join Event'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
