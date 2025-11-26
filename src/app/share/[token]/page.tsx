// app/share/[token]/page.tsx - Handle share token access for invited_only events
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, LogIn, AlertTriangle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getShareTokenInfo } from '@/services/apis/sharing.api';
import { toast } from 'sonner';

interface ShareTokenResponse {
  status: boolean;
  code: number;
  message: string;
  error?: { message: string };
  data?: {
    event: {
      _id: string;
      title: string;
      description: string;
      visibility: string;
      // ... other event fields
    };
    access: {
      canJoin: boolean;
      requiresAuth: boolean;
      role: string;
    };
  };
}

export default function ShareTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const isAuthenticated = useStore(state => state.isAuthenticated);
  const userData = useStore(state => state.userData);
  const hydrated = useStore(state => state.hydrated);

  const [isLoading, setIsLoading] = useState(true);
  const [tokenData, setTokenData] = useState<ShareTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !token) return;

    handleTokenAccess();
  }, [hydrated, token, isAuthenticated]);

  const handleTokenAccess = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get auth token if user is authenticated
      const authToken = isAuthenticated ? localStorage.getItem('rc-token') : null;

      const response = await getShareTokenInfo(token, authToken);
      setTokenData(response);

      // Handle different response scenarios
      if (response.status === false) {
        if (response.code === 401) {
          // Unauthenticated user - redirect to login
          handleUnauthenticatedAccess();
          return;
        } else if (response.code === 403) {
          // Authenticated but not invited
          setError('not_invited');
          return;
        } else {
          // Other errors
          setError(response.error?.message || response.message || 'Access denied');
          return;
        }
      }

      // Successfully invited - redirect to event
      if (response.data?.event && response.data?.access?.canJoin) {
        handleSuccessfulAccess(response.data);
      }

    } catch (err: any) {
      console.error('Error accessing share token:', err);

      if (err.code === 401) {
        handleUnauthenticatedAccess();
      } else if (err.code === 403) {
        setError('not_invited');
      } else {
        setError(err.error?.message || err.message || 'Failed to access event');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnauthenticatedAccess = () => {
    // Store context for after login
    localStorage.setItem('shareTokenContext', JSON.stringify({
      token: token,
      type: 'share_access'
    }));

    // Clear any existing redirect
    localStorage.removeItem('redirectAfterLogin');

    // Redirect to login with return URL
    router.push(`/login?redirect=/share/${token}&action=access_event`);
  };

  const handleSuccessfulAccess = (data: ShareTokenResponse['data']) => {
    if (!data?.event) return;

    toast.success('Access granted! Redirecting to event...');

    // Redirect based on role and permissions
    const eventId = data.event._id;
    const role = data.access?.role;

    if (role === 'owner' || role === 'co_host' || role === 'moderator') {
      // Owner/co-host access - go to event management
      router.push(`/events/${eventId}`);
    } else {
      // Guest access - go to guest interface
      router.push(`/events/${eventId}/guest?token=${token}`);
    }
  };

  const handleLoginRedirect = () => {
    handleUnauthenticatedAccess();
  };

  const handleBrowseEvents = () => {
    router.push('/events');
  };

  // Loading state
  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <h2 className="text-lg font-semibold">Checking Access...</h2>
              <p className="text-sm text-muted-foreground">
                Please wait while we verify your invitation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not invited error
  if (error === 'not_invited') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Not Invited</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                You are not invited to this event. Please contact the event host for access.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button onClick={handleLoginRedirect} className="w-full" size="lg">
                <LogIn className="mr-2 h-4 w-4" />
                Log in with different account
              </Button>
              <Button onClick={handleBrowseEvents} variant="outline" className="w-full">
                Browse other events
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              If you believe you should have access, contact the event organizer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generic error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Access Error</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button onClick={handleTokenAccess} className="w-full" size="lg">
                Try Again
              </Button>
              <Button onClick={handleBrowseEvents} variant="outline" className="w-full">
                Browse events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This shouldn't be reached
  return null;
}