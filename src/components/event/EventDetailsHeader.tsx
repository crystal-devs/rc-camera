// Redesigned Event Header Component
import Image from 'next/image';
import EventHeader from './EventHeader';

interface EventHeaderProps {
    event: {
        id: string;
        name: string;
        location?: string;
        coverImage?: string;
        template?: string;
        isFavorite?: boolean;
    };
}

export default function EventHeaderDetails({ event }: EventHeaderProps) {


    return (
        <div className="relative w-full h-72 sm:h-80 md:h-96 lg:max-h-52">
            <EventHeader event={event} />
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0 ">
                {event.coverImage ? (
                    <Image
                        src={event.coverImage}
                        alt={event.name}
                        fill
                        className="object-cover"
                        priority
                    />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-800">
                        {event.template === 'wedding' && <span className="text-8xl">💍</span>}
                        {event.template === 'birthday' && <span className="text-8xl">🎂</span>}
                        {event.template === 'concert' && <span className="text-8xl">🎵</span>}
                        {event.template === 'corporate' && <span className="text-8xl">👔</span>}
                        {event.template === 'vacation' && <span className="text-8xl">🏖️</span>}
                        {(!event.template || event.template === 'custom') && <span className="text-8xl">📸</span>}
                    </div>
                )}
                {/* Gradient overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
            </div>



            {/* Event Title and Location */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-1 font-cursive">{event.name}</h1>
                {event.location && (
                    <div className="text-sm md:text-base opacity-90">{event.location}</div>
                )}
            </div>
        </div>
    );
}