'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useStore } from '@/lib/store';
// Import UserData type from store instead of api
import { UserData } from '@/lib/store';

type Theme = 'light' | 'dark' | 'system';

interface AppSettingsType {
  theme: Theme;
  requireAuthForSettings: boolean;
  privateProfile: boolean;
  autoSave: boolean;
}

// Use the UserData from the store to ensure type compatibility
interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  requireAuthForSettings: boolean;
  setRequireAuthForSettings: (require: boolean) => void;
  privateProfile: boolean;
  setPrivateProfile: (isPrivate: boolean) => void;
  autoSave: boolean;
  setAutoSave: (autoSave: boolean) => void;
  isAuthenticated: boolean;
  userData: UserData | null;
  refreshUserData: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useStore(state => state.theme);
  const hydrated = useStore(state => state.hydrated);
  
  // Apply theme changes to document only after hydration
  useEffect(() => {
    if (!hydrated) {
      return; // Don't apply theme changes until store is hydrated from localStorage
    }
    
    const root = window.document.documentElement;
    
    if (theme === 'system') {
      // Check system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
  }, [theme, hydrated]);

  // Forward the store values to the context for backward compatibility
  const { 
    theme: storeTheme, 
    setTheme, 
    requireAuthForSettings,
    setRequireAuthForSettings,
    privateProfile,
    setPrivateProfile,
    autoSave,
    setAutoSave,
    isAuthenticated,
    userData
  } = useStore();
  
  // No more refreshUserData - Zustand handles this automatically
  const refreshUserData = () => {
    console.warn('refreshUserData is deprecated, Zustand store handles state automatically');
    // Empty implementation for backward compatibility
  };

  return (
    <SettingsContext.Provider value={{ 
      theme: storeTheme, 
      setTheme,
      requireAuthForSettings,
      setRequireAuthForSettings,
      privateProfile,
      setPrivateProfile,
      autoSave,
      setAutoSave,
      isAuthenticated,
      userData,
      refreshUserData
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
