// app/join-cohost/[token]/page.tsx - Using existing joinAsCoHost API

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, XCircle, AlertTriangle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { joinAsCoHost } from '@/services/apis/cohost.api';
import { toast } from 'sonner';

const JoinCoHostPage = () => {
  const params = useParams();
  const router = useRouter();
  const { token } = params;

  const isAuthenticated = useStore(state => state.isAuthenticated);
  const hydrated = useStore(state => state.hydrated);

  const [isProcessing, setIsProcessing] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [eventId, setEventId] = useState<string | null>(null);

  // Handle the co-host join flow
  useEffect(() => {
    if (!hydrated || !token) return;

    if (isAuthenticated) {
      // User is authenticated, try to join as co-host
      handleCoHostJoin();
    } else {
      // User not authenticated, redirect to login with context
      redirectToLogin();
    }
  }, [hydrated, isAuthenticated, token]);

  const redirectToLogin = () => {
    // Store context for login page - we'll get event details after successful join
    localStorage.setItem('inviteContext', JSON.stringify({
      token: token as string,
      type: 'cohost'
    }));

    // IMPORTANT: Clear any existing redirect to prioritize invite flow
    localStorage.removeItem('redirectAfterLogin');

    // Use URL parameters to maintain invite context (like Kululu)
    router.push(`/login?invite=${token}&type=cohost&action=join`);
  };

  const handleCoHostJoin = async () => {
    if (!token) return;

    setIsProcessing(true);
    setJoinStatus('idle');

    try {
      // Get auth token from localStorage
      const authToken = localStorage.getItem('rc-token');
      
      if (!authToken) {
        // No auth token, redirect to login
        redirectToLogin();
        return;
      }

      // Use your existing joinAsCoHost API
      const response = await joinAsCoHost(token as string, authToken);

      if (response.status) {
        setJoinStatus('success');
        
        // Extract event ID from response if available
        if (response.data?.event_id) {
          setEventId(response.data.event_id);
        }
        
        toast.success(response.message || 'Successfully joined as co-host!');
        
        // Redirect to event page after a short delay
        setTimeout(() => {
          if (response.data?.event_id) {
            router.push(`/events/${response.data.event_id}`);
          } else {
            router.push('/events'); // Fallback to events list
          }
        }, 2000);
        
      } else {
        setJoinStatus('error');
        setErrorMessage(response.message || 'Failed to join as co-host');
      }

    } catch (error: any) {
      console.error('Error joining as co-host:', error);
      setJoinStatus('error');

      // Handle specific error cases
      if (error.message?.includes('Invalid or expired')) {
        setErrorMessage('This invitation link is invalid or has expired');
      } else if (error.message?.includes('already a co-host')) {
        setErrorMessage('You are already a co-host for this event');
        // Still consider this a success case for UX
        setJoinStatus('success');
        setTimeout(() => {
          router.push('/events');
        }, 2000);
      } else if (error.message?.includes('logged in')) {
        // Auth token might be invalid, redirect to login
        localStorage.removeItem('rc-token');
        redirectToLogin();
        return;
      } else {
        setErrorMessage(error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    if (isAuthenticated) {
      handleCoHostJoin();
    } else {
      redirectToLogin();
    }
  };

  const handleGoToLogin = () => {
    redirectToLogin();
  };

  const handleGoToEvents = () => {
    if (eventId) {
      router.push(`/events/${eventId}`);
    } else {
      router.push('/events');
    }
  };

  // Loading state while checking authentication or processing
  if (!hydrated || isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <h2 className="text-lg font-semibold">
                {!hydrated ? 'Loading...' : 'Processing Invitation...'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {!hydrated 
                  ? 'Please wait while we check your authentication'
                  : 'Please wait while we add you as a co-host'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (joinStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to the Team!</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <UserPlus className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Congratulations! You've successfully joined as a co-host. 
                {errorMessage.includes('already a co-host') 
                  ? ' You already had co-host access to this event.'
                  : ' You can now help manage this event.'
                }
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button onClick={handleGoToEvents} className="w-full" size="lg">
                {eventId ? 'Go to Event' : 'View All Events'}
              </Button>
            </div>

            {/* Co-host Permissions Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">As a co-host, you can:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Upload and manage event content</li>
                <li>• Moderate and approve photos/videos</li>
                <li>• Help manage guest interactions</li>
                <li>• Access event analytics and insights</li>
              </ul>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Redirecting to the event page in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (joinStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Invitation Error</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errorMessage}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full" size="lg">
                Try Again
              </Button>
              <Button onClick={handleGoToLogin} variant="outline" className="w-full">
                Go to Login
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>If you continue having issues, please contact the event organizer for a new invitation link.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This shouldn't be reached due to useEffect redirects
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <h2 className="text-lg font-semibold">Processing...</h2>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinCoHostPage;