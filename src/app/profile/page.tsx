'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthToken, useStore } from '@/lib/store';
import { fetchUserStatistics } from '@/services/apis/user.api';
import { Bell, Calendar, Download, HardDrive, Image, LogIn, LogOut, Settings, Share, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserProfileCard } from './components/user-profile-card';
import { EventStats } from './components/event-stats';
import { GeneralProfileSettings } from './components/general-profile-settings';
import { Actions } from './components/actions';
import { GuestUI } from './components/guest-ui';

export default function ProfilePage() {
  const router = useRouter();
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const userData = useStore(state => state.userData);
  const hydrated = useStore(state => state.hydrated);
  const [userStat, setUserStat] = useState({
    totalEvents: 0,
    totalPhotos: 0,
    totalVideos: 0,
    totalHostedEvents: 0,
    totalAttendingEvents: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      try {
        const response = await fetchUserStatistics(token);
        console.log(response, 'User statistics fetched');
        setUserStat(response.data)
      } catch (error) {
        console.error('Failed to fetch user statistics:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl mb-16">
      {/* Profile Header */}
      <UserProfileCard userStat={userStat} />

      {/* Profile Sections */}
      <div className="grid gap-6 mb-6">
        {hydrated && isAuthenticated ? (
          <>
            {/* Events */}
            <EventStats userStat={userStat} />
            {/* Settings */}
            <GeneralProfileSettings />
            {/* Actions */}
            <Actions />
          </>
        ) : (
          <GuestUI />
        )}
      </div>
    </div>
  );
}

// Helper components

function SectionCard({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <span className="mr-2">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ActionItem({
  label,
  count,
  icon,
  onClick,
  highlight = false
}: {
  label: string;
  count?: number;
  icon?: React.ReactNode;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      className={`justify-start w-full ${highlight ? 'bg-muted/50' : ''}`}
      onClick={onClick}
    >
      {icon && <span className="mr-2">{icon}</span>}
      <span className="mr-auto">{label}</span>
      {count !== undefined && (
        <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">
          {count}
        </span>
      )}
    </Button>
  );
}