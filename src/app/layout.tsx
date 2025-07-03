// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/AppContext';
import Providers from '@/components/Providers';
import FloatingNav from '@/components/navigation/FloatingNav';
import BottomNav from '@/components/navigation/BottomNav';
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
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AppProvider>
            {/* SidebarProvider is in AppSidebar component */}
            <AppSidebar>
              {children}
            </AppSidebar>
            
            {/* BottomNav for mobile only */}
            <div className="block md:hidden fixed bottom-0 w-full z-50">
              <BottomNav />
            </div>
            
            {/* Toaster notification system */}
            <Toaster />
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}
