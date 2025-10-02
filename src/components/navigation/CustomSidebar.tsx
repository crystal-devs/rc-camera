// components/navigation/CustomSidebar.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    ImageIcon,
    UserIcon,
    Settings2Icon,
    LayoutTemplate,
    Sparkles,
    ShoppingCart,
    FolderOpen,
    CameraIcon,
} from 'lucide-react';

import useEventStore from '@/stores/useEventStore';

// Navigation items
const getNavItems = (selectedEventId: string | null) => {
    const baseRoute = selectedEventId ? `/events/${selectedEventId}` : '';

    return [
        {
            icon: <HomeIcon size={20} />,
            label: 'Home',
            href: `${baseRoute}`,
            requiresEvent: true,
        },
        {
            icon: <ImageIcon size={20} />,
            label: 'Media',
            href: `${baseRoute}/media`,
            requiresEvent: true,
        },
        {
            icon: <ImageIcon size={20} />,
            label: 'Guests',
            href: `${baseRoute}/guests`,
            requiresEvent: true,
        },
        {
            icon: <Settings2Icon size={20} />,
            label: 'Event Settings',
            href: `${baseRoute}/settings`,
            requiresEvent: true,
        },
        {
            icon: <Sparkles size={20} />,
            label: 'AI Highlights',
            href: `${baseRoute}/highlights`,
            requiresEvent: true,
        },
        {
            icon: <LayoutTemplate size={20} />,
            label: 'Templates',
            href: `/templates`,
            requiresEvent: true,
        },
        {
            icon: <ShoppingCart size={20} />,
            label: 'Memory Shop',
            href: `/shop`,
            requiresEvent: true,
        },
        {
            icon: <FolderOpen size={20} />,
            label: 'All Events',
            href: '/events',
            requiresEvent: false,
        },
    ];
};

export function CustomSidebar() {
    const pathname = usePathname();
    const { selectedEvent } = useEventStore();

    // Get navigation items based on selected event
    const navItems = getNavItems(selectedEvent?._id || null);

    // Group items by category
    const mainItems = navItems.filter(item => !item.requiresEvent);
    const eventItems = navItems.filter(item => item.requiresEvent && selectedEvent);
    const disabledItems = navItems.filter(item => item.requiresEvent && !selectedEvent);

    return (
        <div className="w-60 h-full bg-sidebar flex flex-col">
            {/* Sidebar Content */}
            <div className="flex-1 bg-sidebar overflow-y-auto py-4">
                {/* Main Navigation */}
                <div className="px-3">
                    <div className="space-y-1">
                        {mainItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <div key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`
                      flex items-center gap-3 px-3 py-2 w-full h-10 rounded-lg
                      transition-colors duration-200
                      ${isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-accent text-accent-foreground'
                                            }
                    `}
                                    >
                                        <div className={`transition-colors ${isActive
                                            ? 'text-primary-foreground'
                                            : 'text-foreground'
                                            }`}>
                                            {item.icon}
                                        </div>
                                        <span className="text-sm font-medium flex-1">{item.label}</span>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Collections Section */}
                <div className="px-3 mt-6">
                    <div className="text-xs font-semibold text-muted-foreground px-3 py-2 mb-2 uppercase tracking-wide">
                        Collections
                    </div>
                    <div className="space-y-1">
                        {/* Event-specific Navigation */}
                        {eventItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <div key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`
                      flex items-center gap-3 px-3 py-2 w-full h-10 rounded-lg
                      transition-colors duration-200
                      ${isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-accent text-accent-foreground'
                                            }
                    `}
                                    >
                                        <div className={`transition-colors ${isActive
                                            ? 'text-primary-foreground'
                                            : 'text-accent-foreground'
                                            }`}>
                                            {item.icon}
                                        </div>
                                        <span className="text-sm font-medium flex-1">{item.label}</span>
                                    </Link>
                                </div>
                            );
                        })}

                        {/* Disabled items when no event selected */}
                        {disabledItems.map((item) => (
                            <div key={item.href}>
                                <div className="opacity-50 cursor-not-allowed h-10 rounded-lg">
                                    <div className="flex items-center gap-3 px-3 py-2 h-full">
                                        <div className="text-gray-400 dark:text-gray-500">
                                            {item.icon}
                                        </div>
                                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500 flex-1">{item.label}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 bg-sidebar p-3 border-t border-border">
                <div>
                    <Link
                        href="/profile"
                        className="flex items-center gap-3 px-3 py-2 w-full h-10 rounded-lg hover:bg-accent transition-colors duration-200"
                    >
                        <UserIcon size={20} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">Profile</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}