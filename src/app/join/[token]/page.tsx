'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Loader2, CheckCircle, AlertTriangle, ArrowRight, LogIn,
  Calendar, MapPin, Users, Sparkles
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

      const response = await getTokenInfo(token, authToken);

      if (!response.data?.event) {
        throw new Error('Invalid response format');
      }

      const { event, access } = response.data;

      // Check if user has already joined this event
      const joinedKey = `joined_${token}`;
      if (typeof window !== 'undefined' && localStorage.getItem(joinedKey) === 'true' && access.canJoin) {
        console.log('🚀 User has already joined, redirecting to event...');
        setIsRedirecting(true);
        router.push(`/guest/${token}`);
        return;
      }

      // --- AUTO-REDIRECTION LOGIC ---
      // If user is already authenticated and has access, redirect immediately
      if (authToken && access.canJoin && !access.requiresAuth) {
        console.log('🚀 User already has access, redirecting to event...');
        setIsRedirecting(true);
        router.push(`/guest/${token}`);
        return;
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

      if (e.status === 401) {
        setError('This event requires you to sign in first.');
      } else if (e.status === 403) {
        setError(e.message || 'You don\'t have permission to access this event.');
      } else if (e.status === 404) {
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
    router.push(`/guest/${token}`);
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
  }

  const bgStyle = coverImageUrl
    ? { backgroundImage: `url(${coverImageUrl})` }
    : { background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-6">
      {/* Full Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
        style={bgStyle}
      />
      {/* Overlay - Gradient for depth */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      {/* Content */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-lg text-center p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl"
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
                  className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl text-lg font-medium transition-all"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In to View
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => router.push('/')}
                  className="w-full h-14 text-white hover:bg-white/10 rounded-2xl text-lg font-medium transition-all"
                >
                  Return Home
                </Button>
              )}
            </div>
          </motion.div>
        ) : tokenData ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 w-full max-w-2xl text-center"
          >
            {/* Minimal Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs font-medium uppercase tracking-[0.2em] mb-6">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Special Invitation
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6 drop-shadow-lg">
                {tokenData.event.title}
              </h1>
              {tokenData.event.description && (
                <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto font-light leading-relaxed mb-12">
                  {tokenData.event.description}
                </p>
              )}
            </motion.div>

            {/* Event Details Grid - Minimalist */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`grid gap-6 mb-12 ${tokenData.event.location?.name ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
            >
              <div className="flex flex-col items-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <Calendar className="w-6 h-6 text-white/40 mb-3" />
                <div className="text-white font-medium">{formatDate(tokenData.event.start_date)}</div>
                <div className="text-white/50 text-sm mt-1">{formatTime(tokenData.event.start_date)}</div>
              </div>

              {tokenData.event.location?.name && (
                <div className="flex flex-col items-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <MapPin className="w-6 h-6 text-white/40 mb-3" />
                  <div className="text-white font-medium truncate max-w-[200px]">{tokenData.event.location.name}</div>
                  <div className="text-white/50 text-sm mt-1">Location</div>
                </div>
              )}
            </motion.div>

            {/* Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col items-center gap-6"
            >
              <Button
                onClick={handleJoinEvent}
                className="group relative h-16 px-12 bg-white text-black hover:bg-white/90 rounded-full text-xl font-semibold shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  View Invitation
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </Button>

              {/* <div className="flex items-center gap-4 text-white/40 text-sm font-light">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
                      <Users className="w-3 h-3" />
                    </div>
                  ))}
                </div>
                <span>Join others at the event</span>
              </div> */}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Subtle bottom footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-medium">
          Powered by Crystal Events
        </p>
      </div>
    </div>
  );
}
