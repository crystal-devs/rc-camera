"use client";
import React, { useEffect, useState } from 'react'
import { LoginForm } from './components/login-form'
import { GoogleOAuthProvider } from "@react-oauth/google"
import { Toaster } from "@/components/ui/sonner"
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Calendar, Crown } from 'lucide-react';
import { LoginCosmetics } from './components/login-cosmetics';

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
    const { isAuthenticated, isLoading } = useAuth();
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

    // AuthGuard handles redirects now - no manual redirect logic needed

    // Show loading while checking authentication state
    if (isLoading) {
        return (
            <div className="flex w-full min-h-screen bg-background items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <GoogleOAuthProvider clientId={client_id}>
            <div className="flex w-full min-h-screen bg-neutral-50 text-neutral-900">
                <div className="w-full grid md:grid-cols-2">
                    <div className="flex flex-1 w-full items-center justify-center">
                        <div className="w-full max-w-md space-y-6">
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