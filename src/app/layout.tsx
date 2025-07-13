// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/AppContext';
import { FullscreenProvider } from '@/lib/FullscreenContext';
import Providers from '@/components/Providers';
import FloatingNav from '@/components/navigation/FloatingNav';
import { BottomNavigationWithFullscreenAwareness } from '@/components/navigation/FullscreenAwareBottomNav';
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from '@/components/app-sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Photo Album App',
  description: 'Share photos with friends and family',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          
          <AppProvider>
            <FullscreenProvider>
              {/* SidebarProvider is in AppSidebar component */}
              <AppSidebar>
                {children}
              </AppSidebar>
              
              <BottomNavigationWithFullscreenAwareness />
              
              {/* Toaster notification system */}
              <Toaster />
            </FullscreenProvider>
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}


