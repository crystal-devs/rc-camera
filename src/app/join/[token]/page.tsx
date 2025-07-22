/*  app/join/[token]/page.tsx  */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Loader2, CheckCircle, AlertTriangle, Lock, Shield, ArrowRight, LogIn,
  Calendar, MapPin, Clock, Users, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { getTokenInfo } from '@/services/apis/sharing.api';
import { isValidRedirectUrl, storeRedirectUrl } from '@/lib/redirects';

/* ------------------------------------------------------------------ */
/* ---------- 2. Local helpers & types ----------------------------- */
type Visibility = 'anyone_with_link' | 'invited_only' | 'private';

interface EventPreview {
  _id: string;
  title: string;
  visibility: Visibility;
  share_settings?: { expires_at?: string; password?: string };
  description?: string;
  start_date: string;
  cover_image?: { url: string };
}

async function getTokenInfoWithPassword(
  token: string,
  auth?: string | null,
  password?: string,
) {
  const headers: Record<string, string> = {};
  if (auth) headers['Authorization'] = `Bearer ${auth}`;
  if (password) headers['X-Event-Password'] = password;

  const res = await fetch(`/api/events/share/${token}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return (await res.json()) as { event: EventPreview };
}

/* ------------------------------------------------------------------ */
/* ---------- 3. PAGE COMPONENT ------------------------------------ */
export default function JoinPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  /* ------- local state ------- */
  const [loading, setLoading] = useState(true);
  const [passwordUI, setPasswordUI] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState('');
  const [eventInfo, setEventInfo] = useState<EventPreview | null>(null);

  /* pick up existing session token (if any) */
  const [auth] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  });

  /* helper: build URL where user is finally sent */
  const buildRedirectUrl = () => `/guest/${token}`;

  /* helper: handle login redirect */
  const handleLoginRedirect = () => {
    const guestUrl = `/guest/${token}`;
    storeRedirectUrl(guestUrl);
    router.push('/login');
  };

  /* core validator -------------------------------------------------- */
  const validate = async (pwd?: string) => {
    try {
      const res = pwd
        ? await getTokenInfoWithPassword(token, auth, pwd)
        : await getTokenInfo(token);

      const ev = 'event' in res ? res.event : (res as any).data?.event || res;
      setEventInfo(ev);
      setLoading(false);
      
      // Don't show success toast here, let user see the event preview
    } catch (e: any) {
      console.error('Validation error:', e);
      
      // Handle different types of errors
      if (e.status === 401 || e.code === 'ERR_BAD_REQUEST' && e.status === 401) {
        // 401 means authentication required - redirect to login
        handleLoginRedirect();
        return;
      }
      
      if (e.message?.includes('password_required')) {
        setPasswordUI(true);
        setLoading(false);
        return;
      }
      
      // Handle other errors
      let errorMessage = 'Unable to access this event.';
      
      if (e.message?.includes('expired')) {
        errorMessage = 'This invite link has expired.';
      } else if (e.message?.includes('private') || e.message?.includes('authentication')) {
        errorMessage = 'This is a private event – please login first.';
      } else if (e.message?.includes('not found')) {
        errorMessage = 'Event not found or link is invalid.';
      } else if (e.status === 403) {
        errorMessage = 'You don\'t have permission to access this event.';
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  /* run once on mount */
  useEffect(() => { 
    validate(); 
    /* eslint-disable-next-line */ 
  }, []);

  /* helper functions for formatting */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const submitPwd = async () => {
    setPasswordBusy(true);
    await validate(password);
    setPasswordBusy(false);
  };

  /* ------------------------------------------------------------------
     4. RENDER LOGIC
  ------------------------------------------------------------------ */

  /* loading spinner ------------------------------------------------- */
  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="flex flex-col items-center py-12">
              <div className="mb-6 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Opening your invitation
              </h3>
              <p className="text-sm text-gray-600 text-center">
                Please wait while we prepare everything for you...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );

  /* password-required dialog ---------------------------------------- */
  if (passwordUI && eventInfo)
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <div className="relative">
              {eventInfo.cover_image?.url && (
                <div className="h-32 w-full rounded-t-lg bg-gradient-to-r from-amber-400 to-orange-500 overflow-hidden">
                  <img
                    src={eventInfo.cover_image.url}
                    alt={eventInfo.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="bg-white rounded-full p-3 shadow-lg border-4 border-white">
                  <Lock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>

            <CardHeader className="text-center pt-10 pb-4">
              <CardTitle className="text-xl font-bold text-gray-800 mb-2">
                {eventInfo.title}
              </CardTitle>
              <CardDescription className="text-gray-600">
                This event is password protected
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <div className="text-center text-sm text-gray-600 mb-4">
                Enter the password provided by the host to join this exclusive event.
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={passwordUI} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-center justify-center">
                <Shield className="h-5 w-5 text-amber-600" />
                Event Password Required
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <Input
                type="password"
                placeholder="Enter event password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitPwd()}
                className="text-center text-lg tracking-wider"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                disabled={!password || passwordBusy}
                onClick={submitPwd}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                size="lg"
              >
                {passwordBusy && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Join Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );

  /* error state ----------------------------------------------------- */
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
        <div className="flex min-h-screen items-center justify-center px-4">
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
              {(error.includes('private event') || error.includes('please login') || error.includes('permission')) ? (
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
      </div>
    );
  }

  /* success state - event preview ---------------------------------- */
  if (eventInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-2xl">
            {/* Success indicator */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                You're invited!
              </h1>
            </div>

            {/* Event card */}
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 overflow-hidden">
              {/* Cover image or gradient header */}
              <div className="relative h-48 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
                {eventInfo.cover_image?.url ? (
                  <img
                    src={eventInfo.cover_image.url}
                    alt={eventInfo.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-500 opacity-90" />
                )}
                <div className="absolute inset-0 bg-black/20" />

                {/* Floating event type badge */}
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700 backdrop-blur-sm">
                    <Users className="w-3 h-3 mr-1" />
                    {eventInfo.visibility === 'private' ? 'Private Event' : 'Public Event'}
                  </span>
                </div>
              </div>

              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-3">
                    {eventInfo.title}
                  </h2>
                  {eventInfo.description && (
                    <p className="text-gray-600 text-lg leading-relaxed">
                      {eventInfo.description}
                    </p>
                  )}
                </div>

                {/* Event details */}
                <div className="grid gap-4 mb-8">
                  <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Calendar className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <div className="text-center">
                      <p className="font-semibold text-gray-800">
                        {formatDate(eventInfo.start_date)}
                      </p>
                      <p className="text-sm text-gray-600">
                        at {formatTime(eventInfo.start_date)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="text-center">
                  <Button
                    onClick={() => router.push(buildRedirectUrl())}
                    size="lg"
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <ArrowRight className="mr-2 h-5 w-5" />
                    Join the Event
                  </Button>

                  <p className="text-sm text-gray-500 mt-4">
                    You'll be taken to the event page where you can see all the details
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-sm text-gray-500">
                Can't join right now? No worries – your invitation will be waiting for you.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* fallback – should never reach here */
  return null;
}