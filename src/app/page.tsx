// app/page.tsx
'use client';

import { AlbumCard } from '@/components/album/AlbumCard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { FolderPlus, PlusCircle, ScanLineIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { verifyUser } from '@/services/apis/auth.api';

export default function HomePage() {
  const router = useRouter();
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [accessibleEvents, setAccessibleEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ok = await verifyUser();
      if (!ok) {
        router.push('/login');
      }
    })();
  }, []);



  const handleCreateEvent = () => {
    router.push('/events/create');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Home Page</h1>

      {loading ? (
        <div className="py-8 text-center">This Page will get New UI</div>
      ) : (
        <>
          {myEvents.length === 0 && accessibleEvents.length === 0 ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Welcome to Rose Click</CardTitle>
                <CardDescription>
                  Create your first event to start capturing and sharing photos
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="text-center py-8">
                  <FolderPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500 mb-4">
                    No events yet. Create your first event to get started.
                  </p>
                  <Button onClick={handleCreateEvent}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Your Events</h2>
                  <Button onClick={handleCreateEvent} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Event
                  </Button>
                </div>

                {myEvents.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-gray-500">You haven't created any events yet</p>
                  </div>
                ) : (
                  <>
                    {/* need to create grid of events */}
                  </>
                )}
              </div>

            </>
          )}

          <div className="fixed bottom-18 right-6 flex flex-col items-center">
            <Button
              onClick={() => router.push('/scan')}
              size="icon"
              className="h-14 w-14 p-0! rounded-full shadow-lg"
              aria-label="Scan QR code to join another album"
            >
              <ScanLineIcon className="h-7! w-7!" />
            </Button>
            <p className="mt-2 text-xs text-gray-500 text-center">Scan to join event</p>
          </div>
        </>
      )}
    </div>
  );
}