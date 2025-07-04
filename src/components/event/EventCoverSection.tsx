// Event Cover Section Component - Contains cover image and event title
import Image from 'next/image';

interface EventCoverProps {
    event: {
        name: string;
        location?: string;
        cover_image?: string;
        template?: string;
    };
}

export default function EventCoverSection({ event }: EventCoverProps) {
    return (
        <div className="relative w-full h-56 sm:h-64 md:h-72 lg:h-80">
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0">
                {event.cover_image ? (
                    <Image
                        src={event.cover_image}
                        alt={event.name}
                        fill
                        className="object-cover"
                        priority
                    />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-800">
                        {event.template === 'wedding' && <span className="text-7xl sm:text-8xl">💍</span>}
                        {event.template === 'birthday' && <span className="text-7xl sm:text-8xl">🎂</span>}
                        {event.template === 'concert' && <span className="text-7xl sm:text-8xl">🎵</span>}
                        {event.template === 'corporate' && <span className="text-7xl sm:text-8xl">👔</span>}
                        {event.template === 'vacation' && <span className="text-7xl sm:text-8xl">🏖️</span>}
                        {(!event.template || event.template === 'custom') && <span className="text-7xl sm:text-8xl">📸</span>}
                    </div>
                )}
                {/* Gradient overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
            </div>

            {/* Event Title and Location */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6 text-white z-10">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 font-cursive">{event.name}</h1>
                {event.location && (
                    <div className="text-xs sm:text-sm md:text-base opacity-90">{event.location}</div>
                )}
            </div>
        </div>
    );
}
