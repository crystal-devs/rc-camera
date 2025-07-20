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
  Loader2, CheckCircle, AlertTriangle, Lock, Shield, ArrowRight, LogIn
} from 'lucide-react';
import { toast } from 'sonner';
import { getTokenInfo } from '@/services/apis/sharing.api';

/* ------------------------------------------------------------------ */
/* ---------- 1.  local helpers & types ----------------------------- */
type Visibility = 'anyone_with_link' | 'invited_only' | 'private';

interface EventPreview {
  _id: string;
  title: string;
  visibility: Visibility;
  share_settings?: { expires_at?: string; password?: string };
}

/* fake “password header” version – real implementation lives in your
   `@/services/apis/sharing.api` file */
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
  /* backend returns { event: EventPreview } */
  return (await res.json()) as { event: EventPreview };
}

/* ------------------------------------------------------------------ */
/* ---------- 2.  PAGE COMPONENT ------------------------------------ */
export default function JoinPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  /* ------- local state ------- */
  const [loading, setLoading] = useState(true);
  const [passwordUI, setPasswordUI] = useState(false);
  const [password, setPassword]   = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState('');
  const [eventInfo, setEventInfo] = useState<EventPreview | null>(null);

  /* pick up existing session token (if any) */
  const [auth] = useState<string | null>(() => localStorage.getItem('authToken'));

  /* helper: build URL where user is finally sent */
  const buildRedirectUrl = (id: string) =>
    `/events/${id}?via=share_token&token=${token}`;

  /* core validator -------------------------------------------------- */
  const validate = async (pwd?: string) => {
    try {
      const res = pwd
        ? await getTokenInfoWithPassword(token, auth, pwd)
        : await getTokenInfo(token, auth);

      const ev = 'event' in res ? res.event : (res as any).data.event;
      setEventInfo(ev);
      toast.success('Access granted – redirecting …');
      setTimeout(() => router.push(buildRedirectUrl(ev._id)), 1500);
    } catch (e: any) {
      /* password-required error comes from backend with special message */
      if (e.message?.includes('password_required')) {
        setPasswordUI(true);
        setLoading(false);
      } else {
        setError(
          e.message?.includes('expired')
            ? 'This invite link has expired.'
            : e.message?.includes('private')
            ? 'This is a private event – please login first.'
            : e.message || 'Unable to access this event.'
        );
        setLoading(false);
      }
    }
  };

  /* run once on mount */
  useEffect(() => { validate(); /* eslint-disable-next-line */ }, []);

  /* ------------------------------------------------------------------
     3.  RENDER LOGIC
  ------------------------------------------------------------------ */

  /* loading spinner ------------------------------------------------- */
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="flex flex-col items-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-6" />
            <p className="font-medium text-gray-700">Validating invitation…</p>
          </CardContent>
        </Card>
      </div>
    );

  /* password-required dialog ---------------------------------------- */
  if (passwordUI && eventInfo)
    return (
      <>
        {/* underlying page for nice blur */}
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
          <Card className="max-w-md w-full bg-white/90 border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-lg font-semibold">
                {eventInfo.title}
              </CardTitle>
              <CardDescription>
                This event is password protected.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-10 flex flex-col items-center gap-2">
              <Lock className="h-12 w-12 text-amber-600" />
              <p className="text-gray-600">Enter the password to continue.</p>
            </CardContent>
          </Card>
        </div>

        <Dialog open={passwordUI} onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Event Password
              </DialogTitle>
            </DialogHeader>

            <Input
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitPwd()}
            />

            <DialogFooter className="mt-4">
              <Button
                disabled={!password || passwordBusy}
                onClick={submitPwd}
                className="w-full"
              >
                {passwordBusy && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );

  async function submitPwd() {
    setPasswordBusy(true);
    await validate(password);
    setPasswordBusy(false);
  }

  /* error state ----------------------------------------------------- */
  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-lg border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Cannot join event</CardTitle>
            <CardDescription className="mt-2 text-red-700">
              {error}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button
              onClick={() =>
                router.push(`/login?redirect=${encodeURIComponent(location.href)}`)
              }
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Log in
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );

  /* fallback – should never reach here because success auto-redirects */
  return null;
}
