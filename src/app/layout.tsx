// app/layout.tsx
import Providers from '@/components/Providers';
import { ConditionalNavigation } from '@/components/navigation/ConditionalNavigation';
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from '@/lib/AppContext';
import { FullscreenProvider } from '@/lib/FullscreenContext';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

// Configure Manrope with desired weights and subsets
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], // Adjust weights as needed
});

export const metadata: Metadata = {
  title: 'Rose Click',
  description: 'Share photos with friends and family',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={manrope.className}>
        <Providers>
          <AppProvider>
            <FullscreenProvider>
              <ConditionalNavigation>
                {children}
              </ConditionalNavigation>
              {/* Toaster notification system */}
              <Toaster />
            </FullscreenProvider>
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}