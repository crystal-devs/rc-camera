// hooks/use-navigation-events.ts
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * A custom hook that detects when a user navigates back to a page
 * This is useful for refreshing data when a user returns to a page
 */
export function useNavigationEvents(onNavigateBack?: () => void) {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  const [hasNavigatedBack, setHasNavigatedBack] = useState(false);

  useEffect(() => {
    // On first render, just store the pathname
    if (previousPathname.current === null) {
      previousPathname.current = pathname;
      return;
    }

    // If the pathname changes, store it
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
    } else {
      // If the pathname is the same but we've rendered again, it means we've navigated back
      setHasNavigatedBack(true);
      onNavigateBack?.();
    }
  }, [pathname, onNavigateBack]);

  return { hasNavigatedBack };
}

/**
 * Detects when the browser tab becomes visible again after being hidden
 */
export function useVisibilityChange(onVisibilityChange: (isVisible: boolean) => void) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      onVisibilityChange(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onVisibilityChange]);
}
