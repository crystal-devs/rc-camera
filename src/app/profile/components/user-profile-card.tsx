import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { StatItem } from './stat-item';
import { getAuthToken, useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { fetchUserStatistics } from '@/services/apis/user.api';

interface IUserStat {
    totalEvents: number;
    totalPhotos: number;
    totalVideos: number;
    totalHostedEvents: number;
    totalAttendingEvents: number;
}

interface IUserProfileCard {
    userStat: IUserStat;
}

export const UserProfileCard = ({userStat}: IUserProfileCard) => {
    const router = useRouter();
    const isAuthenticated = useStore(state => state.isAuthenticated);
    const userData = useStore(state => state.userData);
    const hydrated = useStore(state => state.hydrated);
    
    const guestUser = {
        name: 'Guest',
        email: 'Not logged in',
        avatar: undefined
    };
    const user = (hydrated && isAuthenticated && userData) ? userData : guestUser;


    return (
        <Card className="mb-6">
            <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-center">
                            <div className="">
                                <h1 className="text-2xl font-semibold text-rose-500 ">{user.name}</h1>
                                <p className="text-muted-foreground">{user.email}</p>
                            </div>

                            {!isAuthenticated && hydrated && (
                                <Button
                                    onClick={() => {
                                        localStorage.setItem('redirectAfterLogin', window.location.pathname);
                                        router.push('/login');
                                    }}
                                    className="mt-4 sm:mt-0 gap-2"
                                >
                                    <LogIn className="h-4 w-4" />
                                    <span>Login</span>
                                </Button>
                            )}
                        </div>

                        {hydrated && isAuthenticated ? (
                            <div className="flex justify-center sm:justify-start gap-6 mt-4">
                                <StatItem label="Events" value={userStat?.totalEvents.toString()} />
                                <StatItem label="Photos" value={userStat?.totalPhotos.toString()} />
                                <StatItem label="Video" value={userStat?.totalVideos.toString()} />
                            </div>
                        ) : (
                            <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                                <p>Login to access your personal profile, events, and photos.</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
