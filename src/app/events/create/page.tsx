'use client';

/**
 * Phase 1.1 — template-driven 60-second create.
 * One screen: name + template + (optional) date. Visibility/permissions are
 * applied server-side per template; success state shows the QR + share link
 * immediately so the host never has to find the sharing screen.
 */

import { DatePicker } from '@/components/layout/date-picker';
import { Button } from '@/components/ui/button';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { createEvent } from '@/services/apis/events.api';
import { Event } from '@/types/backend-types/event.type';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  Check,
  Copy,
  Loader2,
  ScanFace,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── Template metadata (mirrors rc-api template-defaults.ts) ────────────────

type TemplateValue = 'wedding' | 'birthday' | 'vacation' | 'concert' | 'corporate' | 'custom';

interface TemplateMeta {
  value: TemplateValue;
  label: string; // 'vacation' is surfaced as "Trip" — same enum value
  emoji: string;
  placeholder: string;
  defaultsHint: string; // must describe what the server actually applies
  offersFaceMatch: boolean;
}

const TEMPLATES: TemplateMeta[] = [
  {
    value: 'wedding',
    label: 'Wedding',
    emoji: '💍',
    placeholder: 'Riya & Arjun',
    defaultsHint: 'Guest uploads on · Photos reviewed before the wall',
    offersFaceMatch: true,
  },
  {
    value: 'birthday',
    label: 'Birthday',
    emoji: '🎂',
    placeholder: 'Aarav turns 5',
    defaultsHint: 'Guest uploads on · Photos go live instantly',
    offersFaceMatch: false,
  },
  {
    value: 'vacation',
    label: 'Trip',
    emoji: '🌴',
    placeholder: 'Goa, June 2026',
    defaultsHint: 'Everyone uploads · Photos go live instantly',
    offersFaceMatch: false,
  },
  {
    value: 'concert',
    label: 'Concert',
    emoji: '🎤',
    placeholder: 'Indie Night Live',
    defaultsHint: 'Crowd uploads on · Photos reviewed before the wall',
    offersFaceMatch: false,
  },
  {
    value: 'corporate',
    label: 'Corporate',
    emoji: '💼',
    placeholder: 'Annual Offsite 2026',
    defaultsHint: 'Team uploads on · Photos reviewed before the wall',
    offersFaceMatch: true,
  },
  {
    value: 'custom',
    label: 'Other',
    emoji: '✨',
    placeholder: 'House warming, reunion…',
    defaultsHint: 'Guest uploads on · Photos go live instantly',
    offersFaceMatch: false,
  },
];

function shareOnWhatsApp(url: string, eventTitle?: string) {
  const text = encodeURIComponent(
    `Hey! 📸 Join and share your photos from *${eventTitle || 'our event'}*:\n${url}\n\nFree, no app needed!`
  );
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const waUrl = isMobile
    ? `whatsapp://send?text=${text}`
    : `https://web.whatsapp.com/send?text=${text}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

// ─── Page ────────────────────────────────────────────────────────────────────

const EventCreatePage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getAccessToken } = useSecureAuth();

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<TemplateValue>('wedding');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showDate, setShowDate] = useState(false);
  const [faceMatch, setFaceMatch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<Event | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedToken = getAccessToken();
    if (storedToken) {
      setAuthToken(storedToken);
    } else {
      toast.error('You need to be logged in to create an event');
      router.push('/events');
    }
  }, [router, getAccessToken]);

  const selected = TEMPLATES.find((t) => t.value === template)!;

  const handleTemplateSelect = (t: TemplateMeta) => {
    setTemplate(t.value);
    if (!t.offersFaceMatch) setFaceMatch(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Give your event a name first');
      return;
    }
    if (!authToken) return;

    setIsSubmitting(true);
    try {
      const event = await createEvent(
        {
          title: title.trim(),
          template,
          start_date: date ?? undefined,
          // DPDP: explicit host opt-in only; server defaults to off
          face_recognition: { enabled: faceMatch },
        },
        authToken
      );
      setCreatedEvent(event);
      // Refresh every events-list consumer (events page, event selector)
      queryClient.invalidateQueries({ queryKey: queryKeys.events() });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = createdEvent?.share_token ? `${origin}/join/${createdEvent.share_token}` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md px-5 pb-32 pt-10 sm:pt-16">
        <AnimatePresence mode="wait">
          {!createdEvent ? (
            // ── Create form ─────────────────────────────────────────────────
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                New event
              </p>
              <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
                What are we
                <br />
                celebrating?
              </h1>

              {/* Template tiles */}
              <div className="mt-7 grid grid-cols-3 gap-2">
                {TEMPLATES.map((t, i) => {
                  const isSelected = t.value === template;
                  return (
                    <motion.button
                      key={t.value}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i, duration: 0.2 }}
                      onClick={() => handleTemplateSelect(t)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-4 text-center transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                          : 'bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:ring-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800'
                      }`}
                    >
                      <span className="text-2xl leading-none">{t.emoji}</span>
                      <span className="text-xs font-semibold">{t.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Server-applied smart defaults for the selected template */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={template}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-3 text-center text-[12px] text-zinc-400 dark:text-zinc-500"
                >
                  {selected.defaultsHint} · change anytime
                </motion.p>
              </AnimatePresence>

              {/* Event name — the only required field */}
              <div className="mt-8">
                <label
                  htmlFor="event-title"
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500"
                >
                  Event name
                </label>
                <input
                  id="event-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder={selected.placeholder}
                  autoComplete="off"
                  className="mt-1 w-full border-0 border-b-2 border-zinc-200 bg-transparent pb-2 text-[26px] font-semibold tracking-tight text-zinc-900 placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-0 dark:border-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-700 dark:focus:border-primary"
                />
              </div>

              {/* Optional extras */}
              <div className="mt-6 space-y-3">
                {!showDate ? (
                  <button
                    type="button"
                    onClick={() => setShowDate(true)}
                    className="flex items-center gap-2 text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Add a date <span className="text-zinc-300 dark:text-zinc-600">· optional</span>
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2"
                  >
                    <DatePicker date={date} setDate={setDate} />
                    <button
                      type="button"
                      onClick={() => {
                        setShowDate(false);
                        setDate(undefined);
                      }}
                      className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                      aria-label="Remove date"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}

                {/* Face match opt-in — only for templates where it's offered (DPDP) */}
                <AnimatePresence>
                  {selected.offersFaceMatch && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onClick={() => setFaceMatch((v) => !v)}
                      className={`flex w-full items-start gap-3 overflow-hidden rounded-2xl p-4 text-left transition-all ${
                        faceMatch
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white ring-1 ring-inset ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          faceMatch ? 'bg-white/20' : 'bg-zinc-100 dark:bg-zinc-800'
                        }`}
                      >
                        <ScanFace className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-semibold ${faceMatch ? '' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          Selfie photo finder
                        </p>
                        <p className={`mt-0.5 text-[12px] leading-relaxed ${faceMatch ? 'opacity-70' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          Guests find their own photos with a selfie. Each guest is
                          asked for consent; face data is deleted after the event.
                        </p>
                      </div>
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          faceMatch
                            ? 'border-white bg-white text-primary'
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                      >
                        {faceMatch && <Check className="h-3 w-3" strokeWidth={3} />}
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Create */}
              <div className="mt-10">
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSubmitting || !title.trim()}
                  className="h-14 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-transform hover:bg-primary/90 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Setting up…
                    </>
                  ) : (
                    <>
                      Create event
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                <p className="mt-3 text-center text-[12px] text-zinc-400 dark:text-zinc-500">
                  Free · guests need no app or login
                </p>
              </div>
            </motion.div>
          ) : (
            // ── Success: the "ticket" — QR + link, ready to share ───────────
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40"
                >
                  <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                </motion.div>
                <h1 className="mt-4 text-[24px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {createdEvent.title} is live
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  Guests scan to view &amp; upload — no app, no login.
                </p>
              </div>

              {/* Ticket card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-7 overflow-hidden rounded-3xl bg-white shadow-xl shadow-zinc-900/5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
              >
                <div className="flex flex-col items-center px-6 pb-6 pt-8">
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-100">
                    {shareUrl && (
                      <QRCodeSVG value={shareUrl} size={172} level="M" marginSize={0} />
                    )}
                  </div>
                  <p className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {selected.emoji} {createdEvent.title}
                  </p>
                  {date && (
                    <p className="mt-0.5 text-[12px] text-zinc-400">{format(date, 'PPP')}</p>
                  )}
                </div>

                {/* Perforation */}
                <div className="relative border-t-2 border-dashed border-zinc-200 dark:border-zinc-800">
                  <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-zinc-50 dark:bg-zinc-950" />
                  <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-zinc-50 dark:bg-zinc-950" />
                </div>

                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 rounded-xl bg-zinc-50 p-2 pl-3 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800/50 dark:ring-zinc-700">
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-zinc-600 dark:text-zinc-300">
                      {shareUrl.replace(/^https?:\/\//, '')}
                    </span>
                    <Button
                      type="button"
                      onClick={handleCopy}
                      size="sm"
                      className="h-8 shrink-0 rounded-lg bg-zinc-900 px-3 text-[12px] text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="ml-1.5">{copied ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={() => shareOnWhatsApp(shareUrl, createdEvent.title)}
                    className="mt-3 h-12 w-full rounded-xl bg-[#25D366] text-[14px] font-semibold text-white hover:bg-[#1fb959]"
                  >
                    Share on WhatsApp
                  </Button>
                </div>
              </motion.div>

              <button
                type="button"
                onClick={() => router.push(`/events/${createdEvent._id}`)}
                className="mx-auto mt-6 flex items-center gap-1 text-[13px] font-semibold text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Open event dashboard
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EventCreatePage;
