// app/events/join-cohost/[token]/page.tsx - Updated for your auth system

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Calendar,
  MapPin,
  Crown,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { joinAsCoHost } from '@/services/apis/cohost.api';
import { getEventById } from '@/services/apis/events.api';
import { loginUser, getUserData, type UserData } from '@/services/apis/auth.api'; // Your custom auth

interface EventDetails {
  _id: string;
  title: string;
  description: string;
  start_date: string;
  location: {
    name: string;
  };
  cover_image: {
    url: string;
  };
  created_by: {
    _id: string;
    name: string;
    email: string;
  };
  template: string;
}

const JoinCoHostPage = () => {
  const params = useParams();
  const router = useRouter();
  const { token } = params;
  const { data: session, status } = useSession();

  const [isJoining, setIsJoining] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'success' | 'error' | 'already_joined'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUserData = getUserData();
      
      if (storedToken && storedUserData) {
        setAuthToken(storedToken);
        setUserData(storedUserData);
      }
    };

    checkAuth();
  }, []);

  // Handle NextAuth session changes
  useEffect(() => {
    const handleSessionAuth = async () => {
      if (status === 'authenticated' && session?.user && !authToken) {
        try {
          setIsSigningIn(true);
          
          // Convert NextAuth session to your backend auth
          const userDataForBackend: Omit<UserData, 'id'> = {
            name: session.user.name || 'User',
            email: session.user.email || '',
            avatar: session.user.image || undefined,
            provider: (session.user as any).provider || 'google',
            profile_pic: session.user.image || undefined,
          };

          const response = await loginUser(userDataForBackend);
          
          if (response.token) {
            setAuthToken(response.token);
            const userData = getUserData();
            setUserData(userData);
            toast.success('Successfully authenticated!');
          }
        } catch (error) {
          console.error('Error authenticating with backend:', error);
          toast.error('Failed to complete authentication');
        } finally {
          setIsSigningIn(false);
        }
      }
    };

    handleSessionAuth();
  }, [status, session, authToken]);

  // Auto-join when authenticated
  useEffect(() => {
    const handleAutoJoin = async () => {
      if (authToken && token && joinStatus === 'idle' && !isJoining && !isSigningIn) {
        await attemptJoin();
      }
    };

    handleAutoJoin();
  }, [authToken, token, joinStatus, isJoining, isSigningIn]);

  const attemptJoin = async () => {
    if (!authToken || !token) return;

    setIsJoining(true);
    try {
      const response = await joinAsCoHost(token as string, authToken);
      
      if (response.status && response.data) {
        setJoinStatus('success');
        toast.success(response.message);
        
        // Get event details if we have event_id
        if (response.data.event_id) {
          try {
            const eventData = await getEventById(response.data.event_id, authToken);
            setEventDetails(eventData);
          } catch (eventError) {
            console.error('Error fetching event details:', eventError);
          }
        }
      }
    } catch (error: any) {
      console.error('Error with co-host invite:', error);
      
      if (error.message?.includes('already a co-host')) {
        setJoinStatus('already_joined');
        setErrorMessage('You are already a co-host for this event');
      } else if (error.message?.includes('Invalid or expired')) {
        setJoinStatus('error');
        setErrorMessage('This invite link is invalid or has expired');
      } else if (error.message?.includes('usage limit')) {
        setJoinStatus('error');
        setErrorMessage('This invite link has reached its usage limit');
      } else {
        setJoinStatus('error');
        setErrorMessage(error.message || 'Failed to join as co-host');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      // Store the current URL for redirect after sign-in
      const callbackUrl = window.location.href;
      await signIn('google', { callbackUrl });
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in');
      setIsSigningIn(false);
    }
  };

  const handleRetryJoin = async () => {
    if (!authToken) {
      await handleGoogleSignIn();
      return;
    }
    
    setJoinStatus('idle');
    await attemptJoin();
  };

  const handleGoToEvent = () => {
    if (eventDetails) {
      router.push(`/events/${eventDetails._id}`);
    } else {
      router.push('/events');
    }
  };

  const handleGoToDashboard = () => {
    router.push('/events');
  };

  // Loading state while checking authentication or signing in
  if (status === 'loading' || isSigningIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <h2 className="text-lg font-semibold">
                {isSigningIn ? 'Authenticating...' : 'Checking Authentication...'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSigningIn 
                  ? 'Please wait while we complete your authentication'
                  : 'Please wait while we verify your session'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing invitation
  if (isJoining && authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <h2 className="text-lg font-semibold">Processing Invitation...</h2>
              <p className="text-sm text-muted-foreground">
                Please wait while we add you as a co-host
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated - show sign in prompt
  if (!authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Co-host Invitation</CardTitle>
            <p className="text-muted-foreground">
              You've been invited to be a co-host for an event
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Sign in with Google to accept this co-host invitation and start collaborating on the event.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleGoogleSignIn} 
              className="w-full" 
              size="lg"
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            {/* Co-host Benefits */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">As a co-host, you'll be able to:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Upload and manage event content</li>
                <li>• Moderate and approve photos/videos</li>
                <li>• Help manage guest interactions</li>
                <li>• Access event analytics and insights</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated and showing results
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {joinStatus === 'success' ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            ) : joinStatus === 'error' ? (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            ) : joinStatus === 'already_joined' ? (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Crown className="h-8 w-8 text-blue-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-blue-600" />
              </div>
            )}
          </div>

          <CardTitle className="text-2xl">
            {joinStatus === 'success' && 'Welcome to the Team!'}
            {joinStatus === 'error' && 'Invitation Error'}
            {joinStatus === 'already_joined' && 'Already a Co-host'}
            {joinStatus === 'idle' && 'Co-host Invitation'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Event Details */}
          {eventDetails && (
            <div className="space-y-4">
              {eventDetails.cover_image?.url && (
                <div className="w-full h-32 rounded-lg bg-gray-100 overflow-hidden">
                  <img
                    src={eventDetails.cover_image.url}
                    alt={eventDetails.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{eventDetails.title}</h3>
                {eventDetails.description && (
                  <p className="text-sm text-muted-foreground">{eventDetails.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(eventDetails.start_date).toLocaleDateString()}</span>
                </div>
                
                {eventDetails.location?.name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{eventDetails.location.name}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Crown className="h-4 w-4" />
                  <span>Created by {eventDetails.created_by.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {joinStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Congratulations! You've successfully joined as a co-host. Your request is pending approval from the event creator.
              </AlertDescription>
            </Alert>
          )}

          {joinStatus === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {joinStatus === 'already_joined' && (
            <Alert className="border-blue-200 bg-blue-50">
              <Crown className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                You're already a co-host for this event! You can access the event management features.
              </AlertDescription>
            </Alert>
          )}

          {/* User Info */}
          {userData && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {userData.avatar && (
                <img
                  src={userData.avatar}
                  alt={userData.name}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-sm">{userData.name}</p>
                <p className="text-xs text-muted-foreground">{userData.email}</p>
                <p className="text-xs text-blue-600 capitalize">{userData.provider}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {(joinStatus === 'success' || joinStatus === 'already_joined') && (
              <>
                <Button onClick={handleGoToEvent} className="w-full" size="lg">
                  Go to Event
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  onClick={handleGoToDashboard} 
                  variant="outline" 
                  className="w-full"
                >
                  View All Events
                </Button>
              </>
            )}

            {joinStatus === 'error' && (
              <div className="space-y-2">
                <Button 
                  onClick={handleRetryJoin} 
                  disabled={isJoining || isSigningIn}
                  className="w-full"
                  size="lg"
                >
                  {(isJoining || isSigningIn) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSigningIn ? 'Signing in...' : 'Retrying...'}
                    </>
                  ) : (
                    'Try Again'
                  )}
                </Button>
                <Button 
                  onClick={handleGoToDashboard} 
                  variant="outline" 
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>

          {/* Co-host Permissions Info */}
          {(joinStatus === 'success' || joinStatus === 'idle') && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">As a co-host, you'll be able to:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Upload and manage event content</li>
                <li>• Moderate and approve photos/videos</li>
                <li>• Help manage guest interactions</li>
                <li>• Access event analytics and insights</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2">
                <strong>Note:</strong> Your co-host access requires approval from the event creator.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinCoHostPage;