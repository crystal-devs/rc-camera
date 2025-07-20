// components/navigation/ConditionalNavigation.tsx
'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { BottomNavigationWithFullscreenAwareness } from '@/components/navigation/FullscreenAwareBottomNav';
import { ReactNode } from 'react';

interface ConditionalNavigationProps {
  children: ReactNode;
}

export function ConditionalNavigation({ children }: ConditionalNavigationProps) {
  const pathname = usePathname();
  
  // Define routes where navigation should be hidden
  const isGuestRoute = pathname?.startsWith('/guest/');
  const isAuthJoinRoute = pathname?.startsWith('/auth/join/');
  const isLoginRoute = pathname === '/login';
  const isRegisterRoute = pathname === '/register';
  const isEventNotFoundRoute = pathname === '/event-not-found';
  const isInviteRequiredRoute = pathname === '/invite-required';
  const isPrivateAccessDeniedRoute = pathname === '/private-access-denied';
  
  // Hide navigation for these routes
  const shouldHideNavigation = 
    isGuestRoute || 
    isAuthJoinRoute || 
    isLoginRoute || 
    isRegisterRoute ||
    isEventNotFoundRoute ||
    isInviteRequiredRoute ||
    isPrivateAccessDeniedRoute;

  if (shouldHideNavigation) {
    // Render clean layout without sidebar and bottom navigation
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // Render full app layout with navigation
  return (
    <>
      {/* SidebarProvider is in AppSidebar component */}
      <AppSidebar>
        {children}
      </AppSidebar>
      
      <BottomNavigationWithFullscreenAwareness />
    </>
  );
}