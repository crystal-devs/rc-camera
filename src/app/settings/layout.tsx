'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const { requireAuthForSettings, isAuthenticated, hydrated } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only check authentication after store is hydrated from localStorage
    if (!hydrated) {
      return; // Wait until hydration is complete
    }
    
    // If settings require authentication and user is not authenticated, redirect to login
    if (requireAuthForSettings && !isAuthenticated) {
      // Store the current location to redirect back after login
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [requireAuthForSettings, isAuthenticated, hydrated, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
