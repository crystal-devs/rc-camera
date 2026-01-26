'use client';

import React from 'react';
import { Calendar, Image as ImageIcon, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EventHeroHeaderProps {
    event: {
        title: string;
        description?: string;
        cover_image?: {
            url: string;
        } | null;
        date?: string;
        location?: string | { name: string; address?: string };
    };
    actions?: React.ReactNode;
}

export function EventHeroHeader({ event, actions }: EventHeroHeaderProps) {
    // Fallback gradient if no cover image
    const hasCover = !!event.cover_image?.url;

    // Handle location display
    const locationName = typeof event.location === 'object' ? event.location?.name : event.location;

    return (
        <div className="relative w-full h-[40vh] min-h-[350px] max-h-[500px] overflow-hidden bg-muted group">
            {/* Background Image / Gradient */}
            {hasCover ? (
                <>
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 group-hover:scale-105"
                        style={{ backgroundImage: `url(${event.cover_image!.url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute inset-0 bg-black/20" /> {/* General dimming */}
                </>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-background" />
            )}

            {/* Content Container */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 flex flex-col justify-end h-full">
                <div className="max-w-5xl w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-2 text-sm">
                        {event.date && (
                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-md border-transparent text-foreground font-normal">
                                <Calendar className="w-3.5 h-3.5 mr-2 opacity-70" />
                                {new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                            </Badge>
                        )}
                        {/* Removed photoCount as it causes prop drilling issues */}
                        {locationName && (
                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-md border-transparent text-foreground font-normal">
                                <MapPin className="w-3.5 h-3.5 mr-2 opacity-70" />
                                {locationName}
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        {/* Title & Description */}
                        <div className="flex-1">
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground shadow-sm mb-2">
                                {event.title}
                            </h1>
                            {event.description && (
                                <p className="text-lg text-muted-foreground/90 max-w-2xl line-clamp-2">
                                    {event.description}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        {actions && (
                            <div className="flex items-center gap-3 shrink-0">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
