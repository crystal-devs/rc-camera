'use client';

import { useParams, useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HighlightsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.eventId as string;

    return (
        <div className="container mx-auto py-8 px-6 max-w-2xl">
            <div className="flex flex-col items-center justify-center text-center py-24">
                <div className="bg-muted rounded-full p-4 mb-6">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-semibold mb-2">AI Highlights are coming soon</h1>
                <p className="text-muted-foreground max-w-md mb-8">
                    We&apos;ll automatically pick the best moments from your event and turn them
                    into a shareable highlight reel. Until then, all your photos live in the album.
                </p>
                <Button onClick={() => router.push(`/events/${eventId}/media`)}>
                    Open your album
                </Button>
            </div>
        </div>
    );
}
