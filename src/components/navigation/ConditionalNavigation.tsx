// components/navigation/ConditionalNavigation.tsx (Clean Minimal)
'use client';

import { usePathname } from 'next/navigation';
import { BottomNavigationWithFullscreenAwareness } from '@/components/navigation/FullscreenAwareBottomNav';
import { ReactNode } from 'react';
import { TopNavbar } from './TopNavbar';
import { CustomSidebar } from './CustomSidebar';

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
    <div className="h-screen flex flex-col overflow-hidden bg-sidebar">
      {/* Top Navigation Bar - Full width */}
      <div className="flex-shrink-0 w-full z-10">
        <TopNavbar title={getPageTitle()} />
      </div>

      {/* Content area with sidebar and main content side by side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Custom Sidebar - Takes up actual layout space */}
        <div className="hidden md:flex flex-shrink-0">
          <CustomSidebar />
        </div>

        {/* Main content area with custom styling */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content area with rounded border and custom scrollbar */}
          <main className="flex-1 relative bg-background border border-border rounded-lg m-2 ml-1 overflow-hidden">
            {/* Custom scrollbar styles */}
            <style jsx global>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
                border-radius: 4px;
              }
              
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, #6366f1, #8b5cf6);
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.1);
              }
              
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, #5855eb, #7c3aed);
              }
              
              /* Firefox */
              .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: #71717a transparent;
              }
            `}</style>

            <div className="h-full overflow-y-auto custom-scrollbar">
              <div className="p-4 h-full">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden flex-shrink-0">
        <BottomNavigationWithFullscreenAwareness />
      </div>
    </div>
  );
}