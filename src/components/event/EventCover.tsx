import React from 'react';
import Image from 'next/image';

interface EventCoverProps {
    coverImage?: string;
    name: string;
    template?: string;
}

const EventCover: React.FC<EventCoverProps> = ({ coverImage, name, template }) => {
    return (
        <div className="relative h-48 w-full rounded-lg overflow-hidden bg-gray-100">
            {coverImage ? (
                <Image
                    src={coverImage}
                    alt={name}
                    fill
                    className="object-cover"
                />
            ) : (
                <div className="flex items-center justify-center h-full">
                    {template === 'wedding' && <span className="text-6xl">💍</span>}
                    {template === 'birthday' && <span className="text-6xl">🎂</span>}
                    {template === 'concert' && <span className="text-6xl">🎵</span>}
                    {template === 'corporate' && <span className="text-6xl">👔</span>}
                    {template === 'vacation' && <span className="text-6xl">🏖️</span>}
                    {(!template || template === 'custom') && <span className="text-6xl">📸</span>}
                </div>
            )}
        </div>
    );
};

export default EventCover;