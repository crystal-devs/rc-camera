"use client";
import React, { useEffect, useState } from 'react'
import { LoginForm } from './components/login-form'
import { LoginCosmetics } from './components/login-cosmetics'
import { GoogleOAuthProvider } from "@react-oauth/google"
import { Toaster } from "@/components/ui/sonner"
import { useStore } from '@/lib/store';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Calendar, Crown } from 'lucide-react';

const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!

interface InviteContext {
  token: string;
  eventId: string;
  eventTitle?: string;
  adminName?: string;
  type: 'cohost' | 'guest';
}

const LoginPage = () => {
    const searchParams = useSearchParams();
    const isAuthenticated = useStore(state => state.isAuthenticated);
    const hydrated = useStore(state => state.hydrated);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [inviteContext, setInviteContext] = useState<InviteContext | null>(null);

    const inviteToken = searchParams.get('invite');
    const inviteType = searchParams.get('type');
    const inviteAction = searchParams.get('action');
    const redirectUrl = searchParams.get('redirect');

    useEffect(() => {
        // Check for invite context from URL params or localStorage
        if (inviteToken) {
            // Priority 1: URL parameters (most reliable)
            if (inviteType && inviteAction) {
                setInviteContext({
                    token: inviteToken,
                    type: inviteType as 'cohost' | 'guest',
                    eventId: '', // Will be filled after join
                });
            } else {
                // Priority 2: localStorage fallback
                const storedContext = localStorage.getItem('inviteContext');
                if (storedContext) {
                    try {
                        const context = JSON.parse(storedContext);
                        if (context.token === inviteToken) {
                            setInviteContext(context);
                        }
                    } catch (error) {
                        console.error('Error parsing invite context:', error);
                    }
                }
            }
        }
    }, [inviteToken, inviteType, inviteAction]);

    useEffect(() => {
        // Wait for store to be hydrated before doing auth checks
        if (hydrated) {
            setIsCheckingAuth(false);

            // Check if user is already authenticated after hydration
            if (isAuthenticated) {
                // DON'T redirect if we have invite context - let LoginForm handle it
                if (inviteToken && (inviteType || localStorage.getItem('inviteContext'))) {
                    console.log('User authenticated with invite context - LoginForm will handle redirect');
                    return;
                }

                // Only redirect for non-invite scenarios
                localStorage.removeItem('inviteContext');
                
                const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
                if (redirectAfterLogin) {
                    localStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectAfterLogin;
                } else if (redirectUrl) {
                    window.location.href = decodeURIComponent(redirectUrl);
                } else {
                    window.location.href = '/';
                }
            }
        }
    }, [hydrated, isAuthenticated, inviteToken, inviteType, redirectUrl]);

    // Show loading while checking authentication state
    if (isCheckingAuth) {
        return (
            <div className="flex w-full min-h-screen bg-background items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    // Only render login form if user is not authenticated
    if (isAuthenticated) {
        return null; // This shouldn't happen due to useEffect redirect, but just in case
    }

    return (
        <GoogleOAuthProvider clientId={client_id}>
            <div className="flex w-full min-h-screen bg-background">
                <div className="w-full grid md:grid-cols-2">
                    <div className="flex flex-1 items-center justify-center">
                        <div className="w-full max-w-xs space-y-6">
                            {/* Invite Context Banner */}
                            {inviteContext && (
                                <Alert className="border-blue-200 bg-blue-50">
                                    <UserPlus className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-blue-800">
                                        <div className="space-y-2">
                                            <div className="font-medium">
                                                {inviteContext.type === 'cohost' 
                                                    ? `You've been invited to co-host${inviteContext.eventTitle ? ` "${inviteContext.eventTitle}"` : ' an event'}`
                                                    : `You've been invited to${inviteContext.eventTitle ? ` "${inviteContext.eventTitle}"` : ' an event'}`
                                                }
                                            </div>
                                            {inviteContext.adminName && (
                                                <div className="text-sm flex items-center gap-1">
                                                    <Crown className="h-3 w-3" />
                                                    <span>by {inviteContext.adminName}</span>
                                                </div>
                                            )}
                                            <div className="text-sm">
                                                Sign in to {inviteContext.type === 'cohost' ? 'accept your co-host role' : 'join the event'}
                                            </div>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                            
                            <LoginForm inviteContext={inviteContext} />
                        </div>
                    </div>
                    <LoginCosmetics />
                </div>
            </div>
            <Toaster />
        </GoogleOAuthProvider>
    )
}

export default LoginPage