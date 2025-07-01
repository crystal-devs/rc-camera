// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/AppContext';
import Providers from '@/components/Providers';
import FloatingNav from '@/components/navigation/FloatingNav';
import BottomNav from '@/components/navigation/BottomNav';
import { Toaster } from "@/components/ui/sonner";
import SidebarNav from '@/components/navigation/SidebarNavDynamic';

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
            <div className="flex min-h-screen w-full">
              {/* Sidebar for medium and up */}
              <aside className="hidden md:flex md:flex-col md:w-56 lg:w-64 xl:w-72 bg-white border-r">
                <SidebarNav />
              </aside>

              {/* Main content */}
              <div className="flex-1 flex flex-col">
                <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
                  {children}
                </main>

                {/* BottomNav for mobile only */}
                <div className="block md:hidden fixed bottom-0 w-full z-50">
                  <BottomNav />
                </div>
              </div>
            </div>

            <Toaster />
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}
