'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginPrompt() {
  const router = useRouter();
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <LogIn className="h-5 w-5 mr-2" />
          Authentication Required
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <p>You need to be logged in to access these settings. Login to enjoy all features and customize your experience.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => {
            localStorage.setItem('redirectAfterLogin', window.location.pathname);
            router.push('/login');
          }}
          className="w-full"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Login Now
        </Button>
      </CardFooter>
    </Card>
  );
}
