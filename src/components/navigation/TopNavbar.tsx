// components/navigation/TopNavbar.tsx (Clean Minimal)
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    UserIcon,
    LogOutIcon,
    Settings2Icon,
    ChevronDownIcon,
    CheckIcon,
    PlusIcon,
    Calendar,
    CameraIcon,
} from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EventSelector } from './EventSelector';

interface TopNavbarProps {
    title?: string;
    onToggleSidebar?: () => void;
}

export function TopNavbar({ title = 'Rose Click', onToggleSidebar }: TopNavbarProps) {
    const router = useRouter();

    // Get user info from localStorage or your auth context
    const [userInfo, setUserInfo] = React.useState<any>(null);

    React.useEffect(() => {
        // Get user info from localStorage or your auth system
        const user = localStorage.getItem('user');
        if (user) {
            setUserInfo(JSON.parse(user));
        }
    }, []);

    const handleLogout = () => {
        // Clear auth tokens and user data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // Redirect to login
        router.push('/login');
    };

    const handleAccountSettings = () => {
        router.push('/profile');
    };

    const getUserInitials = (name?: string) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Desktop navigation bar */}
            <div className="hidden md:flex h-16 items-center px-6">
                {/* Left side - Event Selector */}
                <div className="flex items-center gap-4 flex-1">
                    <EventSelector />
                </div>

                {/* Right side - User profile */}
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage
                                        src={userInfo?.profilePicture || userInfo?.avatar}
                                        alt={userInfo?.name || 'User'}
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                        {getUserInitials(userInfo?.name || userInfo?.email)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {userInfo?.name || 'User'}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {userInfo?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={handleAccountSettings}>
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => router.push('/settings')}>
                                <Settings2Icon className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-red-600 focus:text-red-600"
                            >
                                <LogOutIcon className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Mobile navigation - Two rows */}
            <div className="md:hidden">
                {/* Top row - Logo */}
                <div className="flex h-14 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2">
                            <CameraIcon size={20} className="text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rose Click</h2>
                    </div>

                    {/* Mobile User profile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage
                                        src={userInfo?.profilePicture || userInfo?.avatar}
                                        alt={userInfo?.name || 'User'}
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                                        {getUserInitials(userInfo?.name || userInfo?.email)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {userInfo?.name || 'User'}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {userInfo?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={handleAccountSettings}>
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => router.push('/settings')}>
                                <Settings2Icon className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-red-600 focus:text-red-600"
                            >
                                <LogOutIcon className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Bottom row - Event Selector */}
                <div className="flex h-12 items-center px-4">
                    <EventSelector />
                </div>
            </div>
        </div>
    );
}