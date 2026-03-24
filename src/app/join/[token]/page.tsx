'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Loader2, CheckCircle, AlertTriangle, ArrowRight, LogIn,
  Calendar, MapPin, Users, Sparkles, Lock
} from 'lucide-react';
import { getTokenInfo } from '@/services/apis/sharing.api';
import { useToken } from '@/hooks/useToken';
import { getSignedUrlForKey } from '@/services/apis/media.api';

// In-memory cache for cover signed URLs
const joinCoverUrlCache = new Map<string, string>();

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
  cover_image?: { public_id: string };
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
  const authToken = useToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');

  // Extract S3 key from cover data
  const getS3Key = (cover: any): string | null => {
    if (cover?.public_id && cover.public_id.includes('events/')) {
      return cover.public_id;
    }
    if (cover?.url) {
      try {
        const url = new URL(cover.url);
        const pathParts = url.pathname.split('/');
        if (pathParts[1] === 'events') {
          return pathParts.slice(1).join('/');
        }
      } catch (error) {
        console.error('Failed to parse URL for S3 key:', error);
      }
    }
    return null;
  };

  const validateToken = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      // Get PIN from URL if present
      let pin = new URLSearchParams(window.location.search).get('pin');
      
      const savedPinKey = `event_pin_${token}`;
      if (!pin && typeof window !== 'undefined') {
        pin = localStorage.getItem(savedPinKey);
      }
      
      const response = await getTokenInfo(token, authToken, pin);

      if (!response.data?.event) {
        throw new Error('Invalid response format');
      }

      const { event, access } = response.data;

      // Check if user has already joined this event
      const joinedKey = `joined_${token}`;
      if (typeof window !== 'undefined' && localStorage.getItem(joinedKey) === 'true' && access.canJoin) {
        setIsRedirecting(true);
        router.push(pin ? `/guest/${token}?pin=${pin}` : `/guest/${token}`);
        return;
      }

      // --- AUTO-REDIRECTION LOGIC ---
      if (authToken && access.canJoin && !access.requiresAuth) {
        setIsRedirecting(true);
        router.push(pin ? `/guest/${token}?pin=${pin}` : `/guest/${token}`);
        return;
      }

      if (typeof window !== 'undefined' && pin) {
        localStorage.setItem(savedPinKey, pin);
      }

      setTokenData({ event, access });
      setLoading(false);

      if (access.requiresAuth) {
        setError('This event requires you to sign in first.');
        return;
      }

      if (!access.canJoin) {
        setError(getAccessDeniedMessage(event.visibility, access.role));
        return;
      }

    } catch (e: any) {
      console.error('❌ Token validation error:', e);
      setLoading(false);

      const errMsg = e?.error?.message || e?.message || '';
      const isPasswordRequired = (e?.code === 401 || e?.status === 401) && (errMsg === 'password_required' || errMsg.toLowerCase().includes('password'));

      // If it's a password issue, let the user enter the PIN natively
      if (isPasswordRequired) {
        setRequiresPin(true);
        return;
      }

      if (e?.status === 401 || e?.code === 401) {
        setError('This event requires you to sign in first.');
      } else if (e?.status === 403 || e?.code === 403) {
        setError(e.message || 'You don\'t have permission to access this event.');
      } else if (e?.status === 404 || e?.code === 404) {
        setError('Event not found. The link may be invalid or expired.');
      } else {
        setError(e.message || 'Unable to access this event. Please try again.');
      }
    }
  }, [token, authToken, router]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  // Generate cover image URL
  useEffect(() => {
    const generateCoverImageUrl = async () => {
      if (!tokenData?.event?.cover_image) {
        setCoverImageUrl(null);
        return;
      }

      const s3Key = getS3Key(tokenData.event.cover_image);
      if (!s3Key) return;

      const cachedUrl = joinCoverUrlCache.get(s3Key);
      if (cachedUrl) {
        setCoverImageUrl(cachedUrl);
        return;
      }

      try {
        const url = await getSignedUrlForKey(s3Key, authToken || undefined);
        joinCoverUrlCache.set(s3Key, url);
        setCoverImageUrl(url);
      } catch (error) {
        console.error('❌ Failed to generate cover image URL:', error);
        setCoverImageUrl(null);
      }
    };

    if (tokenData) {
      generateCoverImageUrl();
    }
  }, [tokenData, authToken]);

  const handleLoginRedirect = () => {
    const redirectUrl = `/guest/${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirectAfterLogin', redirectUrl);
    }
    router.push('/login');
  };

  const handleJoinEvent = () => {
    const joinedKey = `joined_${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(joinedKey, 'true');
    }
    const pinFromUrl = new URLSearchParams(window.location.search).get('pin');
    const savedPin = typeof window !== 'undefined' ? localStorage.getItem(`event_pin_${token}`) : null;
    const finalPin = pinFromUrl || savedPin;
    router.push(finalPin ? `/guest/${token}?pin=${finalPin}` : `/guest/${token}`);
  };

  const getAccessDeniedMessage = (visibility: string, role: string): string => {
    switch (visibility) {
      case 'private':
        return 'This event is private and only accessible to authorized members.';
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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // --- RENDER HELPERS ---

  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-white/50" />
        <p className="text-white/60 font-light tracking-widest text-sm uppercase">Preparing your invitation</p>
      </div>
    );
  }  const bgStyle = coverImageUrl
    ? { backgroundImage: `url(${coverImageUrl})` }
    : { backgroundImage: `url('/invite-bg.png')` };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-between py-12 px-6">
      {/* Full Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
        style={bgStyle}
      />
      {/* Overlay - Gradient for depth but keeping the beautiful art visible */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/80" />

      {/* Header Area (Top) */}
      <div className="relative z-10 w-full pt-10 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {tokenData && !error && !requiresPin && (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1 }}
              className="text-center"
            >
              <h1 
                className="text-5xl md:text-7xl lg:text-[5.5rem] leading-tight font-serif font-medium text-[#fff3e0] tracking-widest mb-4 uppercase drop-shadow-2xl"
                style={{ textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}
              >
                {tokenData.event.title}
              </h1>
              {tokenData.event.description && (
                <p 
                  className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto font-light leading-relaxed tracking-wide drop-shadow-xl"
                  style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9)' }}
                >
                  {tokenData.event.description}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content Area (Center/Bottom) */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-end pb-8 mt-12">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-lg text-center p-8 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-4">Access Restricted</h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                {error}
              </p>

              <div className="flex flex-col gap-3">
                {error.includes('sign in') ? (
                  <Button
                    onClick={handleLoginRedirect}
                    className="w-full h-14 bg-white/90 text-black hover:bg-white rounded-2xl text-lg font-medium transition-all shadow-lg"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In to View
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/')}
                    className="w-full h-14 text-white/90 hover:bg-white/10 rounded-2xl text-lg font-medium transition-all"
                  >
                    Return Home
                  </Button>
                )}
              </div>
            </motion.div>
          ) : requiresPin ? (
            <motion.div
              key="pin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md text-center p-8 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 border border-white/20">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-serif text-white mb-4 tracking-wide">Protected Event</h2>
              <p className="text-white/80 mb-8 leading-relaxed font-light">
                Please enter the PIN to unlock your invitation.
              </p>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPinErrorMsg('');
                  if (!enteredPin) return;
                  try {
                    setLoading(true);
                    const response = await getTokenInfo(token, authToken, enteredPin);
                    if (response.data?.event) {
                      if (typeof window !== 'undefined') {
                         localStorage.setItem(`event_pin_${token}`, enteredPin);
                      }
                      setTokenData({ event: response.data.event, access: response.data.access });
                      setRequiresPin(false);
                    }
                    setLoading(false);
                  } catch (err: any) {
                    setLoading(false);
                    setPinErrorMsg('Incorrect PIN. Please try again.');
                  }
                }}
                className="flex flex-col gap-4"
              >
                <input
                  type="password"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full h-14 bg-white/10 border border-white/20 rounded-2xl px-6 text-center text-2xl tracking-[0.2em] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-light backdrop-blur-md"
                  autoFocus
                />
                {pinErrorMsg && <p className="text-red-300 text-sm mt-1">{pinErrorMsg}</p>}
                <Button
                  type="submit"
                  className="w-full h-14 mt-4 bg-white/90 text-black hover:bg-white rounded-2xl text-lg font-medium transition-all shadow-lg"
                  disabled={!enteredPin || loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock Access'}
                </Button>
              </form>
            </motion.div>
          ) : tokenData ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
              className="w-full max-w-2xl flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white/90 text-xs font-medium uppercase tracking-[0.3em] mb-8 shadow-xl">
                <Sparkles className="w-3 h-3 text-amber-300" />
                You're Invited
              </div>

              {/* Event Details Grid - Elegant Cards */}
              <div className={`grid gap-4 mb-10 w-full ${tokenData.event.location?.name ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-sm mx-auto'}`}>
                <div className="flex flex-col items-center p-5 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-black/50 transition-colors duration-300">
                  <Calendar className="w-5 h-5 text-amber-100/70 mb-2" />
                  <div className="text-white/95 font-medium tracking-wide">{formatDate(tokenData.event.start_date)}</div>
                  <div className="text-white/60 text-sm mt-1">{formatTime(tokenData.event.start_date)}</div>
                </div>

                {tokenData.event.location?.name && (
                  <div className="flex flex-col items-center p-5 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-black/50 transition-colors duration-300">
                    <MapPin className="w-5 h-5 text-amber-100/70 mb-2" />
                    <div className="text-white/95 font-medium truncate max-w-[200px] tracking-wide text-center">{tokenData.event.location.name}</div>
                    <div className="text-white/60 text-sm mt-1">Location</div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <Button
                onClick={handleJoinEvent}
                className="group relative h-16 sm:h-20 px-10 sm:px-16 bg-[#fff3e0] text-[#4a3b2c] hover:bg-white rounded-[2rem] text-xl sm:text-2xl font-serif font-medium shadow-[0_0_40px_rgba(255,243,224,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-100/0 via-amber-100/50 to-amber-100/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  View Invitation
                  <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Subtle bottom footer */}
      <div className="relative z-10 mt-8 mb-2">
        <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-medium drop-shadow-md">
          Powered by Crystal Events
        </p>
      </div>
    </div>
  );
}
