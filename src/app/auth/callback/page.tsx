'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleGoogleOAuthCallback } from '@/services/apis/auth.api';
import logger from '@/lib/logger';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        const processAuth = async () => {
            if (processed) return;

            const code = searchParams.get('code');
            const error = searchParams.get('error');

            if (error) {
                logger.error('Auth callback error param', error);
                toast.error('Authentication failed');
                router.push('/login');
                return;
            }

            if (!code) {
                // No code, maybe direct access?
                return;
            }

            try {
                setProcessed(true);
                // Exchange code for tokens
                // This will now trigger AuthManager and local events
                await handleGoogleOAuthCallback(code);

                toast.success('Successfully logged in');

                // Small delay to ensure event propagation and state update
                // though AuthManager event dispatch should be synchronous-ish regarding window event.
                setTimeout(() => {
                    router.push('/dashboard');
                }, 100);

            } catch (err) {
                logger.error('Auth callback processing failed', err);
                toast.error('Authentication failed during callback');
                router.push('/login');
            }
        };

        processAuth();
    }, [searchParams, router, processed]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Completing authentication...</p>
            </div>
        </div>
    );
}
