// app/join/not-invited/page.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LockIcon, LogInIcon, UserPlusIcon } from 'lucide-react';

export default function NotInvitedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-md">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="rounded-full bg-red-100 p-3">
            <LockIcon className="h-8 w-8 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold">Not Invited</h1>
          
          <p className="text-gray-500">
            Sorry, your account does not have access to this event. This event is private and only invited guests can join.
          </p>
          
          <div className="mt-6 grid w-full gap-3">
            <Button 
              onClick={() => router.push('/login')}
              className="flex items-center justify-center"
              variant="default"
            >
              <LogInIcon className="mr-2 h-4 w-4" />
              Log in with a different account
            </Button>
            
            <Button 
              onClick={() => router.push('/events')}
              className="flex items-center justify-center"
              variant="outline"
            >
              <UserPlusIcon className="mr-2 h-4 w-4" />
              Browse public events
            </Button>
          </div>
          
          <p className="text-xs text-gray-400 mt-6">
            If you believe you should have access to this event, please contact the event organizer.
          </p>
        </div>
      </div>
    </div>
  );
}
