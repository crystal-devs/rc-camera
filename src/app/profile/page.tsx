'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Image, Settings, HardDrive, User, Shield, Bell, Download, Share, LogOut, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const userData = useStore(state => state.userData);
  const hydrated = useStore(state => state.hydrated);
  
  const guestUser = {
    name: 'Guest',
    email: 'Not logged in',
    avatar: undefined
  };
  
  // Use real user data if authenticated, otherwise use guest
  // Only consider authentication status after hydration
  const user = (hydrated && isAuthenticated && userData) ? userData : guestUser;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:justify-between items-center">
                <div>
                  <h1 className="text-2xl font-semibold">{user.name}</h1>
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
                  <StatItem label="Events" value="15" />
                  <StatItem label="Photos" value="342" />
                  <StatItem label="Tagged" value="128" />
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

      {/* Profile Sections */}
      <div className="grid gap-6 mb-6">
        {hydrated && isAuthenticated ? (
          <>
            {/* My Events */}
            <SectionCard title="My Events" icon={<Calendar className="h-5 w-5" />}>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start" onClick={() => router.push('/events?filter=hosting')}>
                  <span className="mr-auto">Hosting</span>
                  <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">3</span>
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => router.push('/events?filter=attending')}>
                  <span className="mr-auto">Attending</span>
                  <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">12</span>
                </Button>
              </div>
            </SectionCard>

            {/* Photo Management */}
            <SectionCard title="My Photos" icon={<Image className="h-5 w-5" />}>
              <div className="space-y-2">
                <ActionItem 
                  label="Photos I've uploaded" 
                  count={342}
                  onClick={() => router.push('/gallery?filter=uploaded')}
                />
                <ActionItem 
                  label="Photos I'm tagged in" 
                  count={128}
                  onClick={() => router.push('/gallery?filter=tagged')}
                />
                <ActionItem 
                  label="Favorite photos" 
                  count={45}
                  onClick={() => router.push('/gallery?filter=favorites')}
                />
              </div>
            </SectionCard>

            {/* Settings */}
            <SectionCard title="Settings" icon={<Settings className="h-5 w-5" />}>
              <div className="space-y-2">
                <ActionItem 
                  label="App Settings" 
                  icon={<Settings className="h-4 w-4" />}
                  onClick={() => router.push('/settings')}
                  highlight={true}
                />
                <ActionItem 
                  label="Account Settings" 
                  icon={<User className="h-4 w-4" />}
                  onClick={() => router.push('/settings/account')}
                />
                <ActionItem 
                  label="Privacy & Security" 
                  icon={<Shield className="h-4 w-4" />}
                  onClick={() => router.push('/settings/privacy')}
                />
                <ActionItem 
                  label="Notifications" 
                  icon={<Bell className="h-4 w-4" />}
                  onClick={() => router.push('/settings/notifications')}
                />
                <ActionItem 
                  label="Download my data" 
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => router.push('/settings/download')}
                />
              </div>
            </SectionCard>

            {/* Storage */}
            <SectionCard title="Storage" icon={<HardDrive className="h-5 w-5" />}>
              <div>
                <div className="mb-2">
                  <div className="flex justify-between mb-1 text-sm">
                    <span>2.4 GB used</span>
                    <span>5 GB total</span>
                  </div>
                  <div className="bg-muted rounded-full h-2 w-full">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '48%' }}></div>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Upgrade Storage</Button>
              </div>
            </SectionCard>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-end mt-4">
              <Button variant="outline" onClick={() => router.push('/profile/share')}>
                <Share className="mr-2 h-4 w-4" />
                Share Profile
              </Button>
              <Button variant="destructive" onClick={() => {
                const { logout } = useStore.getState();
                logout();
                toast.success('Logged out successfully');
                router.push('/login');
              }}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Guest sections */}
            <Card className="p-6 text-center">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-semibold mb-4">Welcome to the app!</h2>
                <p className="text-muted-foreground mb-6">
                  Login to create events, upload photos, and access your personal profile.
                </p>
                <div className="flex flex-col space-y-3">
                  <Button 
                    onClick={() => {
                      localStorage.setItem('redirectAfterLogin', window.location.pathname);
                      router.push('/login');
                    }}
                    className="gap-2 mx-auto"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/events')}
                    className="gap-2 mx-auto"
                  >
                    <Calendar className="h-4 w-4" />
                    Browse Events
                  </Button>
                </div>
              </div>
            </Card>
            
            {/* Public settings access */}
            <SectionCard title="Settings" icon={<Settings className="h-5 w-5" />}>
              <div className="space-y-2">
                <ActionItem 
                  label="App Settings" 
                  icon={<Settings className="h-4 w-4" />}
                  onClick={() => router.push('/settings')}
                  highlight={true}
                />
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}

// Helper components
function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

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