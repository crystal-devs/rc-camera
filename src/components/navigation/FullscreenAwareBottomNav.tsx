'use client';

import { useFullscreen } from '@/lib/FullscreenContext';
import dynamic from 'next/dynamic';

// Dynamically import BottomNav component to avoid any import conflicts
const BottomNav = dynamic(() => import('@/components/navigation/BottomNav'), { ssr: false });

export function BottomNavigationWithFullscreenAwareness() {
  const { isFullscreenActive } = useFullscreen();

  if (isFullscreenActive) {
    return null; // Don't render the bottom nav when in fullscreen mode
  }

  return (
    <div className="block md:hidden fixed bottom-0 w-full z-50">
      <BottomNav />
    </div>
  );
}
