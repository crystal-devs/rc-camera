// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/AppContext';
import Providers from '@/components/Providers';
import FloatingNav from '@/components/navigation/FloatingNav';
import BottomNav from '@/components/navigation/BottomNav';
import { Toaster } from "@/components/ui/sonner"

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
            {children}
            {/* <FloatingNav /> */}
            <BottomNav />

            <Toaster />
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}