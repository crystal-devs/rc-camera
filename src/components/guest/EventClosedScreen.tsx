'use client';

import React from 'react';
import { Calendar, Camera, Heart, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventClosedScreenProps {
  eventTitle?: string;
  eventDate?: string;
  hostName?: string;
  isHost?: boolean;
  onGoHome?: () => void;
}

export function EventClosedScreen({
  eventTitle,
  eventDate,
  hostName,
  isHost = false,
  onGoHome,
}: EventClosedScreenProps) {
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  if (isHost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 text-amber-600 text-2xl mx-auto">
            📦
          </div>
          <h1 className="text-xl font-semibold text-foreground">This event is closed</h1>
          <p className="text-sm text-muted-foreground">
            You closed this event. Guests can't access it. Reopen it from Settings → Sharing.
          </p>
          <Button onClick={onGoHome} variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-stone-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
      {/* Soft background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-rose-200/20 dark:bg-rose-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-orange-200/20 dark:bg-orange-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-sm space-y-6">
        {/* Camera icon with heart */}
        <div className="relative inline-flex items-center justify-center mx-auto">
          <div className="h-20 w-20 rounded-full bg-white dark:bg-zinc-800 shadow-lg flex items-center justify-center border border-border">
            <Camera className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-rose-500 flex items-center justify-center shadow">
            <Heart className="h-3.5 w-3.5 text-white fill-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            This event has ended
          </h1>
          {eventTitle && (
            <p className="text-base font-medium text-foreground/80">
              {eventTitle}
            </p>
          )}
          {formattedDate && (
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </div>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {hostName
            ? `${hostName} has closed this event.`
            : 'The host has closed this event.'}{' '}
          Thank you for being a part of it — the memories are saved! 📸
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {onGoHome && (
            <Button onClick={onGoHome} variant="outline" className="gap-2 w-full">
              <Home className="h-4 w-4" />
              Back to home
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground/60">
          Rose Click · Event Memory Platform
        </p>
      </div>
    </div>
  );
}
