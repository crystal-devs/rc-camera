// components/guest/PinEntryModal.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Lock, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PinEntryModalProps {
  eventTitle?: string;
  onSubmit: (password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function PinEntryModal({
  eventTitle,
  onSubmit,
  isLoading = false,
  error = null,
}: PinEntryModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input when the modal mounts
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim() || isLoading) return;
      await onSubmit(password.trim());
    },
    [password, isLoading, onSubmit]
  );

  return (
    // Full-screen overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-rose-500 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {eventTitle ? `"${eventTitle}"` : 'This event'} is password-protected
          </h2>
          <p className="text-white/80 text-sm mt-1">
            Enter the event password to continue
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Event Password
            </label>
            <div className="relative">
              <Input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password…"
                className={`h-12 pr-12 text-base ${
                  error ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                <span>❌</span> {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-base font-medium"
            disabled={!password.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Enter Event
              </>
            )}
          </Button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Ask the event organiser for the password
          </p>
        </form>
      </div>
    </div>
  );
}
