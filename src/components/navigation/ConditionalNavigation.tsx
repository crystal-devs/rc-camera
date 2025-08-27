// components/navigation/ConditionalNavigation.tsx (Clean Minimal)
'use client';

import { usePathname } from 'next/navigation';
import { BottomNavigationWithFullscreenAwareness } from '@/components/navigation/FullscreenAwareBottomNav';
import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopNavbar } from './TopNavbar';
import { SidebarProvider } from '@/components/ui/sidebar';

interface ConditionalNavigationProps {
  children: ReactNode;
}

export function ConditionalNavigation({ children }: ConditionalNavigationProps) {
  const pathname = usePathname();

  // Define routes where navigation should be hidden
  const isGuestRoute = pathname?.startsWith('/guest/');
  const isWall = pathname?.startsWith('/wall/');
  const isAuthJoinRoute = pathname?.startsWith('/join/');
  const isLoginRoute = pathname === '/login';
  const isRegisterRoute = pathname === '/register';
  const isEventNotFoundRoute = pathname === '/event-not-found';
  const isInviteRequiredRoute = pathname === '/invite-required';
  const isPrivateAccessDeniedRoute = pathname === '/private-access-denied';
  const isCohostInvite = pathname?.startsWith('/join-cohost/');

  // Hide navigation for these routes
  const shouldHideNavigation =
    isGuestRoute ||
    isAuthJoinRoute ||
    isLoginRoute ||
    isRegisterRoute ||
    isEventNotFoundRoute ||
    isInviteRequiredRoute ||
    isCohostInvite ||
    isWall ||
    isPrivateAccessDeniedRoute;

  if (shouldHideNavigation) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  // Get dynamic title based on route
  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.includes('/events') && !pathname.includes('/settings')) return 'Photos';
    if (pathname.includes('/settings')) return 'Settings';
    if (pathname.includes('/templates')) return 'Templates';
    if (pathname.includes('/highlights')) return 'AI Highlights';
    if (pathname.includes('/shop')) return 'Memory Shop';
    if (pathname.includes('/profile')) return 'Profile';
    return 'Rose Click';
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <SidebarProvider>
        {/* Sidebar - Fixed width */}
        <div className="hidden md:flex flex-shrink-0">
          <AppSidebar />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navigation Bar */}
          <div className="flex-shrink-0">
            <TopNavbar title={getPageTitle()} />
          </div>

          {/* Content area */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>

      {/* Mobile bottom navigation */}
      <div className="md:hidden flex-shrink-0">
        <BottomNavigationWithFullscreenAwareness />
      </div>
    </div>
  );
}