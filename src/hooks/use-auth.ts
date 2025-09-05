"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export const useAuth = () => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('rc-token');
    if (storedToken) {
      setAuthToken(storedToken);
    } else {
      toast.error("You need to be logged in");
      router.push('/events');
    }
  }, [router]);

  useEffect(() => {
    const getUserId = () => {
      // If you store user ID in localStorage
      const userId = localStorage.getItem('userId');
      if (userId) {
        setCurrentUserId(userId);
        return;
      }

      // If you need to decode it from the auth token
      const token = localStorage.getItem('rc-token');
      if (token) {
        try {
          // Decode JWT token to get user ID
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUserId(payload.userId || payload.user_id || payload.id);
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    };

    getUserId();
  }, []);

  return {
    authToken,
    currentUserId
  };
};

export const useAuthToken = () => {
  // Initialize with null to prevent SSR/hydration issues
  const [token, setToken] = useState<string | null>(null);

  // Initialize token after component mounts to avoid hydration mismatch
  useEffect(() => {
    // Try to get token from localStorage
    try {
      const tokenFromStorage = localStorage.getItem('rc-token');
      console.log('useAuthToken: Initial token check -', tokenFromStorage ? 'Found' : 'Not found');
      setToken(tokenFromStorage);

      // Check for token in storage changes (for multi-tab support)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'rc-token') {
          console.log('useAuthToken: Token changed in another tab');
          setToken(e.newValue);
        }
      };

      // Poll localStorage periodically as an additional safety measure
      // This helps in cases where the storage event might not fire
      const intervalId = setInterval(() => {
        try {
          const currentToken = localStorage.getItem('rc-token');
          if (currentToken !== token) {
            console.log('useAuthToken: Token updated via polling');
            setToken(currentToken);
          }
        } catch (e) {
          console.error('Error polling for token:', e);
        }
      }, 3000);

      // Listen for storage events
      window.addEventListener('storage', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(intervalId);
      };
    } catch (e) {
      console.error('Error in useAuthToken initialization:', e);
      // Return a cleanup function even in the error case to satisfy TypeScript
      return () => { };
    }
  }, [token]);

  return token;
};
