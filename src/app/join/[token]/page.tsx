'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, CheckCircle, AlertTriangle, Lock, ArrowRight, LogIn,
  Calendar, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { getTokenInfo } from '@/services/apis/sharing.api';

/* ------------------------------------------------------------------ */
/* ---------- TYPES ------------------------------------------------- */
interface EventAccess {
  canJoin: boolean;
  requiresAuth: boolean;
  role: 'guest' | 'owner' | 'co_host';
}

interface EventData {
  _id: string;
  title: string;
  description: string;
  start_date: string;
  visibility: 'anyone_with_link' | 'invited_only' | 'private';
  cover_image?: { url: string };
  location?: { name: string };
  permissions?: {
    can_upload: boolean;
    can_download: boolean;
  };
}

interface TokenResponse {
  event: EventData;
  access: EventAccess;
}

/* ------------------------------------------------------------------ */
/* ---------- MAIN COMPONENT ---------------------------------------- */
export default function JoinPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);

  // Get auth token with better debugging
  const [auth] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      console.log('🔍 Auth token from localStorage:', {
        exists: !!token,
        length: token?.length || 0,
        preview: token ? token.substring(0, 20) + '...' : 'none'
      });
      return token;
    }
    return null;
  });

  /* ---------------------------------------------------------------- */
  /* ---------- CORE VALIDATION ------------------------------------- */
  const validateToken = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Starting token validation');
      console.log('🔑 Auth token available:', {
        exists: !!auth,
        length: auth?.length || 0,
        preview: auth ? auth.substring(0, 20) + '...' : 'none'
      });
      
      // Pass auth token if available (null/undefined if not authenticated)
      const response = await getTokenInfo(token, auth);
      
      console.log('📋 Token validation response:', {
        hasResponse: !!response,
        hasData: !!response?.data,
        dataKeys: response?.data ? Object.keys(response.data) : []
      });
      
      if (!response.data?.event) {
        throw new Error('Invalid response format');
      }

      const { event, access } = response.data;
      setTokenData({ event, access });

      console.log('📋 Token validation result:', {
        canJoin: access.canJoin,
        requiresAuth: access.requiresAuth,
        role: access.role,
        visibility: event.visibility,
        eventTitle: event.title
      });

      // Only redirect for public events that can be joined immediately
      if (access.canJoin && event.visibility === 'anyone_with_link') {
        // Public events: direct redirect to guest page
        console.log('🟢 Public event - direct redirect');
        router.push(`/guest/${token}`);
        return;
      }

      // For all other cases, show the event preview or error on this page
      setLoading(false);
      
      if (access.requiresAuth) {
        console.log('🔐 Authentication required - showing login prompt');
        setError('This event requires you to sign in first.');
        return;
      }

      if (!access.canJoin) {
        console.log('❌ Cannot join event - showing error');
        setError(getAccessDeniedMessage(event.visibility, access.role));
        return;
      }

      // Show preview for events where user has access
      console.log('📄 Showing event preview');
      
    } catch (e: any) {
      console.error('❌ Token validation error:', e);
      setLoading(false);
      
      // Always show error on this page, don't redirect
      if (e.status === 401) {
        console.log('🔐 401 error - showing auth required message');
        setError('This event requires you to sign in first.');
      } else if (e.status === 403) {
        console.log('🔒 403 error - showing access denied message'); 
        setError(e.message || 'You don\'t have permission to access this event.');
      } else if (e.status === 404) {
        console.log('🔍 404 error - showing not found message');
        setError('Event not found. The link may be invalid or expired.');
      } else {
        console.log('❌ Other error - showing generic message');
        setError(e.message || 'Unable to access this event. Please try again.');
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* ---------- HELPER FUNCTIONS ------------------------------------ */
  const handleLoginRedirect = () => {
    const redirectUrl = `/guest/${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirectAfterLogin', redirectUrl);
    }
    router.push('/login');
  };

  const handleJoinEvent = () => {
    router.push(`/guest/${token}`);
  };

  const getAccessDeniedMessage = (visibility: string, role: string): string => {
    switch (visibility) {
      case 'private':
        return 'This event is private and only accessible to the event creator and co-hosts.';
      case 'invited_only':
        return 'This event requires you to sign in first.';
      default:
        return 'You don\'t have permission to access this event.';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'anyone_with_link': return 'Public Event';
      case 'invited_only': return 'Invited Event';
      case 'private': return 'Private Event';
      default: return 'Event';
    }
  };

  /* ---------------------------------------------------------------- */
  /* ---------- EFFECTS --------------------------------------------- */
  useEffect(() => {
    if (token) {
      // Debug auth token storage
      if (typeof window !== 'undefined') {
        console.log('🔍 Debugging auth token storage:');
        const authToken = localStorage.getItem('authToken');
        const accessToken = localStorage.getItem('accessToken'); 
        const user = localStorage.getItem('user');
        
        console.log('📦 Storage check:', {
          authToken: authToken ? `exists (${authToken.length} chars)` : 'missing',
          accessToken: accessToken ? `exists (${accessToken.length} chars)` : 'missing',
          user: user ? 'exists' : 'missing',
          allKeys: Object.keys(localStorage)
        });
      }
      
      validateToken();
    }
  }, [token]);

  /* ---------------------------------------------------------------- */
  /* ---------- RENDER STATES --------------------------------------- */

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="flex flex-col items-center py-12">
            <div className="mb-6 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 p-4">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Checking your invitation
            </h3>
            <p className="text-sm text-gray-600 text-center">
              Validating access to this event...
            </p>
            <div className="mt-4 text-xs text-gray-500 text-center">
              Token: {token?.substring(0, 8)}...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-0">
          <CardHeader className="text-center pt-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-red-800 mb-2">
              Unable to Join Event
            </CardTitle>
            <CardDescription className="text-red-700 text-base">
              {error}
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex flex-col gap-3 pt-6 pb-8">
            {error.includes('sign in') ? (
              <Button
                onClick={handleLoginRedirect}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                size="lg"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Continue
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full border-gray-300"
                size="lg"
              >
                Return Home
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success State - Event Preview
  if (tokenData) {
    const { event, access } = tokenData;

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-2xl">
            {/* Success indicator */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                You're invited!
              </h1>
              <p className="text-gray-600">
                {access.role === 'owner' 
                  ? 'Welcome back! This is your event.'
                  : access.role === 'co_host'
                  ? 'Welcome back! You\'re a co-host of this event.'
                  : 'You have access to this event.'
                }
              </p>
            </div>

            {/* Event Card */}
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 overflow-hidden">
              {/* Cover Image */}
              <div className="relative h-48 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
                {event.cover_image?.url ? (
                  <img
                    src={event.cover_image.url}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-500 opacity-90" />
                )}
                <div className="absolute inset-0 bg-black/20" />

                {/* Event Type Badge */}
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700 backdrop-blur-sm">
                    <Users className="w-3 h-3 mr-1" />
                    {getVisibilityLabel(event.visibility)}
                  </span>
                </div>
              </div>

              <CardContent className="p-8">
                {/* Event Details */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-3">
                    {event.title}
                  </h2>
                  {event.description && (
                    <p className="text-gray-600 text-lg leading-relaxed mb-4">
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Event Info */}
                <div className="grid gap-4 mb-8">
                  <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Calendar className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <div className="text-center">
                      <p className="font-semibold text-gray-800">
                        {formatDate(event.start_date)}
                      </p>
                    </div>
                  </div>
                  
                  {event.location?.name && (
                    <div className="text-center text-gray-600">
                      📍 {event.location.name}
                    </div>
                  )}
                </div>

                {/* Join Button */}
                <div className="text-center">
                  <Button
                    onClick={handleJoinEvent}
                    size="lg"
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <ArrowRight className="mr-2 h-5 w-5" />
                    {access.role === 'owner' ? 'Manage Event' : 'Join the Event'}
                  </Button>

                  <p className="text-sm text-gray-500 mt-4">
                    You'll be taken to the event gallery where you can view and share memories
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-sm text-gray-500">
                {access.role === 'guest' 
                  ? "Can't join right now? Your invitation will be waiting for you."
                  : "Thanks for being part of this event!"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}